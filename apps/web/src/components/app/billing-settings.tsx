'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api-client';
import type { SubscriptionInfo, SubscriptionPlan } from '@payflow/types';

const PLAN_NAMES: Record<SubscriptionPlan, { priceLabel: string; feature: string }> = {
  FREE: { priceLabel: '₹0/mo', feature: '5 invoices a month' },
  PRO: { priceLabel: '₹999/mo', feature: '50 invoices a month' },
  BUSINESS: { priceLabel: '₹2,499/mo', feature: '200 invoices a month' },
};

export function BillingSettings() {
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<SubscriptionInfo>('/api/subscription')
      .then(setInfo)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load subscription.'))
      .finally(() => setLoading(false));
  }, []);

  const usagePct =
    info && info.limits.invoiceLimit > 0
      ? Math.min(100, Math.round((info.limits.invoicesUsed / info.limits.invoiceLimit) * 100))
      : 0;
  const overLimit = info ? info.limits.invoicesUsed > info.limits.invoiceLimit : false;

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-elevated p-6">
      <h2 className="font-serif text-xl">Billing</h2>
      <p className="text-sm text-muted">
        Your PayFlow plan is separate from client invoice payments. Here is a summary of your current plan.
      </p>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50/70 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      {loading || !info ? (
        <p className="text-sm text-muted">Loading plan...</p>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs text-muted">
                Current plan · {PLAN_NAMES[info.plan].priceLabel} · {PLAN_NAMES[info.plan].feature}
              </p>
              <p className="mt-1 font-serif text-3xl leading-none">{info.plan}</p>
            </div>
            <p className="text-xs text-muted">
              Resets on {new Date(info.nextResetAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </p>
          </div>

          <div className="mt-4">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/5">
              <div
                className={`h-full rounded-full ${overLimit ? 'bg-amber-500' : 'bg-accent'}`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
            {overLimit ? (
              <p className="mt-2 text-xs text-amber-700">
                You have used {info.limits.invoicesUsed} of {info.limits.invoiceLimit} invoices this month —{' '}
                {info.limits.invoicesUsed - info.limits.invoiceLimit} over your {info.plan} limit. New invoices are
                paused until the reset date.
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted">
                {info.limits.invoicesUsed} of {info.limits.invoiceLimit} invoices used · {info.limits.invoicesRemaining}{' '}
                remaining
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button href="/app/billing" variant="primary">
              Upgrade plan
            </Button>
            <Button href="/app/billing" variant="secondary">
              View plan details
            </Button>
          </div>
        </>
      )}
    </div>
  );
}