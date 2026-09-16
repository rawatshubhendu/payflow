import { PLAN_CATALOG, type SubscriptionInfo, type SubscriptionPlan } from '@payflow/types';

export function planPrice(plan: SubscriptionPlan): number {
  return PLAN_CATALOG[plan].pricePerMonth;
}

export function freeFallbackSubscription(): SubscriptionInfo {
  return {
    plan: 'FREE',
    status: 'ACTIVE',
    periodStart: new Date().toISOString(),
    periodEnd: null,
    nextResetAt: new Date().toISOString(),
    sandbox: true,
    features: { analyticsCharts: false, customBranding: false, paymentReminders: false },
    limits: { invoiceLimit: 5, invoicesUsed: 0, invoicesRemaining: 5 },
  };
}
