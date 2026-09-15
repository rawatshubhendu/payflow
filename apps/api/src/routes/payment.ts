import { Router, type Request, type Response } from 'express';
import type { ApiResponse, PaymentDetail, PaymentListItem, PaymentsOverview } from '@payflow/types';
import { Payment } from '../models/Payment.js';
import { Invoice } from '../models/Invoice.js';
import { Customer } from '../models/Customer.js';
import { requireAuth } from '../middleware/auth.js';
import { sendApiError } from '../lib/http.js';

export const paymentRouter = Router();

paymentRouter.get(
  '/api/payments',
  requireAuth,
  async (req: Request, res: Response<ApiResponse<PaymentsOverview>>) => {
    const businessId = req.business!._id;

    const [buckets, payments] = await Promise.all([
      Payment.aggregate<{ _id: 'collected' | 'pending' | 'failed' | 'other'; amount: number; count: number }>([
        { $match: { businessId } },
        {
          $group: {
            _id: {
              $cond: [
                { $eq: ['$status', 'CAPTURED'] },
                'collected',
                {
                  $cond: [
                    { $in: ['$status', ['CREATED', 'AUTHORIZED']] },
                    'pending',
                    {
                      $cond: [{ $in: ['$status', ['FAILED', 'REFUNDED']] }, 'failed', 'other'],
                    },
                  ],
                },
              ],
            },
            amount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
      Payment.find({ businessId }).sort({ createdAt: -1 }).limit(100).lean(),
    ]);

    const byBucket = (key: 'collected' | 'pending' | 'failed' | 'other') =>
      buckets.find((bucket) => bucket._id === key) ?? { _id: key, amount: 0, count: 0 };

    const collected = byBucket('collected');
    const pending = byBucket('pending');
    const failed = byBucket('failed');

    const invoiceIds = [...new Set(payments.map((payment) => payment.invoiceId.toString()))];
    const invoices = invoiceIds.length
      ? await Invoice.find({ businessId, _id: { $in: invoiceIds } }).select('invoiceNumber customerId').lean()
      : [];
    const invoiceMap = new Map(invoices.map((invoice) => [invoice._id.toString(), invoice]));
    const customerIds = [...new Set(invoices.map((invoice) => invoice.customerId.toString()))];
    const customers = customerIds.length
      ? await Customer.find({ businessId, _id: { $in: customerIds } }).select('_id name').lean()
      : [];
    const customerNames = new Map(customers.map((customer) => [customer._id.toString(), customer.name]));

    const payable: PaymentListItem[] = payments.map((payment) => {
      const invoice = invoiceMap.get(payment.invoiceId.toString());
      return {
        id: String(payment._id),
        invoiceNumber: invoice?.invoiceNumber ?? '—',
        customerName: invoice ? (customerNames.get(invoice.customerId.toString()) ?? null) : null,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        gateway: payment.gateway,
        method: typeof payment.metadata?.method === 'string' ? payment.metadata.method : null,
        paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
        createdAt: payment.createdAt.toISOString(),
      };
    });

    res.status(200).json({
      data: {
        kpis: {
          collected: collected.amount,
          pending: pending.amount,
          failed: failed.amount,
        },
        counts: {
          collected: collected.count,
          pending: pending.count,
          failed: failed.count,
        },
        payments: payable,
      },
      error: null,
      meta: null,
    });
  },
);

paymentRouter.get(
  '/api/payments/:id',
  requireAuth,
  async (req: Request, res: Response<ApiResponse<PaymentDetail>>) => {
    const businessId = req.business!._id;
    const { id } = req.params;

    const payment = await Payment.findOne({ businessId, _id: id }).lean();
    if (!payment) {
      sendApiError(res, 404, { code: 'PAYMENT_NOT_FOUND', message: 'Payment not found.' });
      return;
    }

    const invoice = await Invoice.findOne({ businessId, _id: payment.invoiceId })
      .select('invoiceNumber customerId status')
      .lean();

    const customerDetails = invoice?.customerId
      ? ((await Customer.findOne({ businessId, _id: invoice.customerId }).select('_id name email').lean()) ??
        null)
      : null;

    res.status(200).json({
      data: {
        id: String(payment._id),
        invoiceNumber: invoice?.invoiceNumber ?? '—',
        customerName: customerDetails?.name ?? null,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        gateway: payment.gateway,
        method: typeof payment.metadata?.method === 'string' ? payment.metadata.method : null,
        paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
        createdAt: payment.createdAt.toISOString(),
        customer: customerDetails
          ? { id: String(customerDetails._id), name: customerDetails.name, email: customerDetails.email ?? null }
          : null,
        invoice: invoice
          ? {
              id: String(invoice._id),
              invoiceNumber: invoice.invoiceNumber,
              status: invoice.status,
            }
          : null,
        gatewayPaymentId: payment.gatewayPaymentId ?? null,
      },
      error: null,
      meta: null,
    });
  },
);