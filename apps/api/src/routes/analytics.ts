import { Router, type Request, type Response } from 'express';
import type {
  AnalyticsOverview,
  ApiResponse,
  PaymentStatusOverview,
  RevenueOverview,
  RevenuePoint,
} from '@payflow/types';
import { Invoice } from '../models/Invoice.js';
import { Customer } from '../models/Customer.js';
import { Payment } from '../models/Payment.js';
import { loadInvoiceSummaries } from '../lib/invoice-summaries.js';
import { effectiveStatus } from '../lib/invoice-status.js';
import { assertPaidPlan } from '../lib/subscription.js';
import { requireAuth } from '../middleware/auth.js';
import type { Types } from 'mongoose';

export const analyticsRouter = Router();

const REVENUE_TIMEZONE = 'Asia/Kolkata';
const REVENUE_RANGES = [7, 30, 90] as const;
type RevenueRange = (typeof REVENUE_RANGES)[number];

function endOfToday(): Date {
  const end = new Date();
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

async function computeStatusBuckets(
  businessId: Types.ObjectId,
): Promise<{ collected: { amount: number; count: number }; pending: { amount: number; count: number }; overdue: { amount: number; count: number }; other: { amount: number; count: number } }> {
  const end = endOfToday();
  const buckets = await Invoice.aggregate<{ _id: 'collected' | 'pending' | 'overdue' | 'other'; amount: number; count: number }>([
    { $match: { businessId } },
    { $project: { status: 1, dueDate: 1, totalAmount: 1 } },
    {
      $group: {
        _id: {
          $cond: [
            { $eq: ['$status', 'PAID'] },
            'collected',
            {
              $cond: [
                {
                  $and: [
                    { $in: ['$status', ['SENT', 'PENDING']] },
                    { $ne: ['$dueDate', null] },
                    { $lt: ['$dueDate', end] },
                  ],
                },
                'overdue',
                {
                  $cond: [
                    { $in: ['$status', ['SENT', 'PENDING']] },
                    'pending',
                    'other',
                  ],
                },
              ],
            },
          ],
        },
        amount: { $sum: '$totalAmount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const byBucket = (key: 'collected' | 'pending' | 'overdue' | 'other') =>
    buckets.find((bucket) => bucket._id === key) ?? { _id: key, amount: 0, count: 0 };

  const collected = byBucket('collected');
  const pending = byBucket('pending');
  const overdue = byBucket('overdue');
  const other = byBucket('other');

  return { collected, pending, overdue, other };
}

function startOfRange(range: RevenueRange): Date {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (range - 1));
  return start;
}

function dateToKolkataLabel(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: REVENUE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const map = new Map(parts.map((part) => [part.type, part.value]));
  return `${map.get('year')}-${map.get('month')}-${map.get('day')}`;
}

function shortLabel(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: REVENUE_TIMEZONE,
    day: 'numeric',
    month: 'short',
  }).format(date);
}

function fillRevenueDays(range: RevenueRange, raw: Map<string, number>): RevenuePoint[] {
  const series: RevenuePoint[] = [];
  const start = startOfRange(range);
  const cursor = new Date(start);
  const today = new Date();
  while (cursor <= today) {
    const key = dateToKolkataLabel(cursor);
    series.push({ date: key, label: shortLabel(cursor), revenue: raw.get(key) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return series;
}

analyticsRouter.get(
  '/api/analytics/overview',
  requireAuth,
  async (req: Request, res: Response<ApiResponse<AnalyticsOverview>>) => {
    const businessId = req.business!._id;

    const [buckets, invoicesCount, customersCount] = await Promise.all([
      computeStatusBuckets(businessId),
      Invoice.countDocuments({ businessId }),
      Customer.countDocuments({ businessId }),
    ]);

    const [recentInvoices, overdueCandidates] = await Promise.all([
      loadInvoiceSummaries(businessId, {}, 5),
      loadInvoiceSummaries(businessId, { status: { $in: ['SENT', 'PENDING'] } }, 10),
    ]);

    const overdueInvoices = overdueCandidates.filter((invoice) => effectiveStatus(invoice) === 'OVERDUE');

    res.status(200).json({
      data: {
        kpis: {
          total: buckets.collected.amount + buckets.pending.amount + buckets.overdue.amount,
          collected: buckets.collected.amount,
          pending: buckets.pending.amount,
          overdue: buckets.overdue.amount,
        },
        counts: {
          invoices: invoicesCount,
          customers: customersCount,
          collected: buckets.collected.count,
          pending: buckets.pending.count,
          overdue: buckets.overdue.count,
        },
        recentInvoices,
        overdueInvoices,
      },
      error: null,
      meta: null,
    });
  },
);

analyticsRouter.get(
  '/api/analytics/revenue',
  requireAuth,
  async (req: Request, res: Response<ApiResponse<RevenueOverview>>) => {
    const businessId = req.business!._id;
    await assertPaidPlan(businessId, 'Revenue charts');
    const requested = Number(req.query.days ?? 30);
    const range: RevenueRange = (REVENUE_RANGES as readonly number[]).includes(requested)
      ? (requested as RevenueRange)
      : 30;
    const start = startOfRange(range);

    const [rawRows] = await Promise.all([
      Payment.aggregate<{ _id: string; revenue: number }>([
        {
          $match: {
            businessId,
            status: 'CAPTURED',
            paidAt: { $ne: null, $gte: start },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { date: '$paidAt', format: '%Y-%m-%d', timezone: REVENUE_TIMEZONE },
            },
            revenue: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    const byDay = new Map(rawRows.map((row) => [row._id, row.revenue]));

    res.status(200).json({
      data: { range, series: fillRevenueDays(range, byDay) },
      error: null,
      meta: null,
    });
  },
);

analyticsRouter.get(
  '/api/analytics/payment-status',
  requireAuth,
  async (req: Request, res: Response<ApiResponse<PaymentStatusOverview>>) => {
    const businessId = req.business!._id;
    await assertPaidPlan(businessId, 'Payment status charts');
    const buckets = await computeStatusBuckets(businessId);

    const paid = buckets.collected;
    const pending = buckets.pending;
    const overdue = buckets.overdue;
    const failed = buckets.other;

    res.status(200).json({
      data: {
        paid: paid.amount,
        pending: pending.amount,
        overdue: overdue.amount,
        failed: failed.amount,
        total: paid.amount + pending.amount + overdue.amount,
        counts: {
          paid: paid.count,
          pending: pending.count,
          overdue: overdue.count,
          failed: failed.count,
          total: paid.count + pending.count + overdue.count + failed.count,
        },
      },
      error: null,
      meta: null,
    });
  },
);