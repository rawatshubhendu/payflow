import type { Types } from 'mongoose';
import type { SubscriptionInfo, SubscriptionPlan, SubscriptionSelectResult } from '@payflow/types';
import { PLAN_CATALOG } from '@payflow/types';
import { Subscription, type ISubscription } from '../models/Subscription.js';
import { Invoice } from '../models/Invoice.js';
import { AppError } from '../middleware/errorHandler.js';
import { writeAuditLog } from './audit.js';

const DEFAULT_PLAN: SubscriptionPlan = 'FREE';

function currentPeriod(): { periodStart: Date; periodEnd: Date } {
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { periodStart, periodEnd };
}

export function planLimit(plan: SubscriptionPlan): number {
  return PLAN_CATALOG[plan].invoiceLimitPerMonth;
}

export async function getOrCreateSubscription(businessId: Types.ObjectId, plan: SubscriptionPlan = DEFAULT_PLAN) {
  let subscription = await Subscription.findOne({ businessId });

  const { periodStart, periodEnd } = currentPeriod();

  if (!subscription) {
    subscription = await Subscription.create({
      businessId,
      plan,
      status: 'ACTIVE',
      periodStart,
      periodEnd,
    });
    return subscription;
  }

  if (subscription.periodStart < periodStart) {
    subscription.periodStart = periodStart;
    subscription.periodEnd = periodEnd;
    await subscription.save();
  }

  return subscription;
}

export async function countInvoicesUsed(businessId: Types.ObjectId, periodStart: Date): Promise<number> {
  return Invoice.countDocuments({
    businessId,
    status: { $ne: 'CANCELLED' },
    createdAt: { $gte: periodStart },
  });
}

export async function buildSubscriptionInfo(
  businessId: Types.ObjectId,
  subscription?: ISubscription,
): Promise<SubscriptionInfo> {
  const sub = subscription ?? (await getOrCreateSubscription(businessId));
  const periodStart = sub.periodStart;
  const invoicesUsed = await countInvoicesUsed(businessId, periodStart);
  const invoiceLimit = planLimit(sub.plan);

  return {
    plan: sub.plan,
    status: sub.status,
    periodStart: periodStart.toISOString(),
    periodEnd: sub.periodEnd ? sub.periodEnd.toISOString() : null,
    nextResetAt: sub.periodEnd ? sub.periodEnd.toISOString() : periodEndOf(periodStart),
    sandbox: true,
    limits: {
      invoiceLimit,
      invoicesUsed,
      invoicesRemaining: Math.max(0, invoiceLimit - invoicesUsed),
    },
  };
}

function periodEndOf(periodStart: Date): string {
  const end = new Date(periodStart);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return end.toISOString();
}

export async function assertInvoiceLimit(businessId: Types.ObjectId): Promise<{ used: number; limit: number }> {
  const info = await buildSubscriptionInfo(businessId);
  if (info.limits.invoicesUsed >= info.limits.invoiceLimit) {
    throw new AppError(
      403,
      'PLAN_LIMIT_REACHED',
      `You have reached the ${info.plan} plan limit of ${info.limits.invoiceLimit} invoices per month. Upgrade to keep invoicing.`,
    );
  }
  return { used: info.limits.invoicesUsed, limit: info.limits.invoiceLimit };
}

export async function selectPlan(input: {
  businessId: Types.ObjectId;
  actorUserId: Types.ObjectId;
  plan: SubscriptionPlan;
}): Promise<SubscriptionSelectResult> {
  const subscription = await getOrCreateSubscription(input.businessId);

  if (subscription.plan === input.plan) {
    return { ...(await buildSubscriptionInfo(input.businessId, subscription)), note: `You are already on the ${input.plan} plan.` };
  }

  const previousPlan = subscription.plan;
  subscription.plan = input.plan;
  subscription.status = 'ACTIVE';
  await subscription.save();

  await writeAuditLog({
    businessId: input.businessId,
    actorUserId: input.actorUserId,
    action: 'PLAN_CHANGED',
    entityType: 'subscription',
    entityId: String(subscription._id),
    metadata: { from: previousPlan, to: input.plan },
  });

  return {
    ...(await buildSubscriptionInfo(input.businessId, subscription)),
    note: `Plan changed to ${input.plan}. Sandbox mode — no real charge.`,
  };
}