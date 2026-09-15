import { PLAN_CATALOG, type SubscriptionPlan } from '@payflow/types';

export function planPrice(plan: SubscriptionPlan): number {
  return PLAN_CATALOG[plan].pricePerMonth;
}