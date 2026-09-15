import { Router, type Request, type Response } from 'express';
import type { ApiResponse, AdminOverview, AdminUserRow, AdminAuditEntry, AdminErrorEntry, AdminRole, SubscriptionPlan, InvoiceStatus } from '@payflow/types';
import { User } from '../models/User.js';
import { Business } from '../models/Business.js';
import { Invoice } from '../models/Invoice.js';
import { Customer } from '../models/Customer.js';
import { Payment } from '../models/Payment.js';
import { Subscription } from '../models/Subscription.js';
import { AppErrorLog } from '../models/AppErrorLog.js';
import { AuditLog } from '../models/AuditLog.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { isAdminEmail } from '../lib/admin.js';

export const adminRouter = Router();

adminRouter.get('/api/admin/role', requireAuth, async (req: Request, res: Response<ApiResponse<AdminRole>>) => {
  res.status(200).json({ data: { isAdmin: isAdminEmail(req.user!.email) }, error: null, meta: null });
});

adminRouter.get(
  '/api/admin/overview',
  requireAdmin,
  async (req: Request, res: Response<ApiResponse<AdminOverview>>) => {
    const [
      users,
      businesses,
      invoices,
      customers,
      payments,
      errors,
      invoiceBucket,
      planBucket,
      recentSignups,
      recentAudit,
      recentErrors,
    ] = await Promise.all([
      User.countDocuments(),
      Business.countDocuments(),
      Invoice.countDocuments(),
      Customer.countDocuments(),
      Payment.countDocuments(),
      AppErrorLog.countDocuments(),
      Invoice.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Subscription.aggregate<{ _id: string; count: number }>([{ $group: { _id: '$plan', count: { $sum: 1 } } }]),
      User.find().sort({ createdAt: -1 }).limit(5).select('email emailVerifiedAt createdAt').lean(),
      AuditLog.find().sort({ createdAt: -1 }).limit(10).lean(),
      AppErrorLog.find().sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    const collectedResult = await Payment.aggregate<{ _id: null; amount: number }>([
      { $match: { status: 'CAPTURED' } },
      { $group: { _id: null, amount: { $sum: '$amount' } } },
    ]);
    const failedResult = await Payment.aggregate<{ _id: null; amount: number }>([
      { $match: { status: { $in: ['FAILED', 'REFUNDED'] } } },
      { $group: { _id: null, amount: { $sum: '$amount' } } },
    ]);

    const statusMap: Record<InvoiceStatus, number> = { DRAFT: 0, SENT: 0, PENDING: 0, PAID: 0, OVERDUE: 0, CANCELLED: 0 };
    for (const bucket of invoiceBucket) {
      if (bucket._id in statusMap) statusMap[bucket._id as InvoiceStatus] = bucket.count;
    }

    const plans: Record<SubscriptionPlan, number> = { FREE: 0, PRO: 0, BUSINESS: 0 };
    for (const bucket of planBucket) {
      if (bucket._id in plans) plans[bucket._id as SubscriptionPlan] = bucket.count;
    }

    res.status(200).json({
      data: {
        counts: {
          users,
          businesses,
          invoices,
          customers,
          payments,
          errors,
        },
        revenue: {
          invoiced: statusMap.PAID + statusMap.SENT + statusMap.PENDING + statusMap.OVERDUE,
          collected: collectedResult[0]?.amount ?? 0,
          failed: failedResult[0]?.amount ?? 0,
        },
        invoiceStatuses: statusMap,
        planDistribution: plans,
        recentSignups: recentSignups.map((user) => ({
          id: String(user._id),
          email: user.email,
          emailVerified: Boolean(user.emailVerifiedAt),
          createdAt: user.createdAt.toISOString(),
        })),
        recentAudit: recentAudit.map(toAuditEntry),
        recentErrors: recentErrors.map((entry) => ({
          id: String(entry._id),
          requestId: entry.requestId ?? null,
          method: entry.method,
          path: entry.path,
          status: entry.status,
          code: entry.code,
          message: entry.message,
          createdAt: entry.createdAt.toISOString(),
        })),
      },
      error: null,
      meta: null,
    });
  },
);

function toAuditEntry(doc: { _id: unknown; businessId: unknown; actorUserId: unknown; action: string; entityType: string; entityId?: string; createdAt: Date }): AdminAuditEntry {
  return {
    id: String(doc._id),
    businessId: doc.businessId ? String(doc.businessId) : null,
    actorUserId: doc.actorUserId ? String(doc.actorUserId) : null,
    action: doc.action,
    entityType: doc.entityType,
    entityId: doc.entityId ?? null,
    createdAt: doc.createdAt.toISOString(),
  };
}

adminRouter.get('/api/admin/users', requireAdmin, async (req: Request, res: Response<ApiResponse<AdminUserRow[]>>) => {
  const users = await User.find().sort({ createdAt: -1 }).limit(100).lean();
  const userIds = users.map((user) => user._id);
  const businesses = await Business.find({ ownerId: { $in: userIds } }).lean();
  const businessIds = businesses.map((business) => business._id);
  const subscriptions = await Subscription.find({ businessId: { $in: businessIds } }).lean();
  const invoiceCounts = await Invoice.aggregate<{ _id: unknown; count: number }>([
    { $match: { businessId: { $in: businessIds } } },
    { $group: { _id: '$businessId', count: { $sum: 1 } } },
  ]);

  const businessByOwner = new Map(businesses.map((business) => [business.ownerId.toString(), business]));
  const planByBusiness = new Map(subscriptions.map((sub) => [sub.businessId.toString(), sub.plan]));
  const invoiceCountByBusiness = new Map(invoiceCounts.map((row) => [String(row._id), row.count]));

  const rows: AdminUserRow[] = users.map((user) => {
    const business = businessByOwner.get(user._id.toString());
    return {
      id: String(user._id),
      email: user.email,
      emailVerified: Boolean(user.emailVerifiedAt),
      businessName: business?.name ?? null,
      plan: business ? (planByBusiness.get(business._id.toString()) ?? 'FREE') : 'FREE',
      invoiceCount: business ? (invoiceCountByBusiness.get(business._id.toString()) ?? 0) : 0,
      createdAt: user.createdAt.toISOString(),
    };
  });

  res.status(200).json({ data: rows, error: null, meta: null });
});

adminRouter.get('/api/admin/audit', requireAdmin, async (req: Request, res: Response<ApiResponse<AdminAuditEntry[]>>) => {
  const limit = Math.min(Number(req.query.limit ?? 100) || 100, 500);
  const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(limit).lean();
  res.status(200).json({ data: logs.map(toAuditEntry), error: null, meta: null });
});

adminRouter.get('/api/admin/errors', requireAdmin, async (req: Request, res: Response<ApiResponse<AdminErrorEntry[]>>) => {
  const limit = Math.min(Number(req.query.limit ?? 100) || 100, 500);
  const logs = await AppErrorLog.find().sort({ createdAt: -1 }).limit(limit).lean();
  res.status(200).json({
    data: logs.map((entry) => ({
      id: String(entry._id),
      requestId: entry.requestId ?? null,
      method: entry.method,
      path: entry.path,
      status: entry.status,
      code: entry.code,
      message: entry.message,
      createdAt: entry.createdAt.toISOString(),
    })),
    error: null,
    meta: null,
  });
});