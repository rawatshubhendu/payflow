'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/app/app-shell';
import { api, ApiError } from '@/lib/api-client';
import { planPrice } from '@/lib/plans';
import type { SubscriptionInfo, SubscriptionPlan } from '@payflow/types';

const PLAN_DETAILS: Record<SubscriptionPlan, { tagline: string; features: string[]; highlight?: boolean }> = {
  FREE: {
    tagline: 'For freelancers getting started.',
    features: ['5 invoices a month', 'Unlimited customers', 'Razorpay payments', 'Email notifications', 'Basic analytics'],
  },
  PRO: {
    tagline: 'For growing freelancers.',
    features: ['50 invoices a month', 'Everything in Free', 'Custom branding', 'Payment reminders', 'Advanced analytics'],
    highlight: true,
  },
  BUSINESS: {
    tagline: 'For small studios and agencies.',
    features: ['200 invoices a month', 'Everything in Pro', 'Team access (soon)', 'Recurring invoices (soon)', 'Priority support'],
  },
};

const PLAN_ORDER: SubscriptionPlan[] = ['FREE', 'PRO', 'BUSINESS'];

export default function BillingPage() {
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<SubscriptionPlan | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<SubscriptionInfo>('/api/subscription')
      .then(setInfo)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load subscription.'))
      .finally(() => setLoading(false));
  }, []);

  const choosePlan = async (plan: SubscriptionPlan) => {
    if (plan === info?.plan) return;
    setBusy(plan);
    setNote(null);
    try {
      const updated = await api.post<SubscriptionInfo>('/api/subscription/select', { plan });
      setInfo(updated);
      setNote((updated as SubscriptionInfo & { note?: string }).note ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update plan.');
    } finally {
      setBusy(null);
    }
  };

  const usagePct =
    info && info.limits.invoiceLimit > 0
      ? Math.min(100, Math.round((info.limits.invoicesUsed / info.limits.invoiceLimit) * 100))
      : 0;

  return (
    <AppShell title="Billing" description="Your PayFlow plan is separate from client invoice payments.">
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50/70 p-3 text-sm text-red-700">{error}</div>
      ) : null}
      {note ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-sm text-emerald-700">{note}</div>
      ) : null}

      {loading || !info ? (
        <div className="rounded-2xl border border-dashed border-line bg-elevated px-6 py-16 text-center text-sm text-muted">
          Loading your plan...
        </div>
      ) : (
        <>
          <div className="max-w-2xl rounded-2xl border border-line bg-elevated p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted">Current plan</p>
                <p className="mt-1 font-serif text-4xl leading-none">{info.plan}</p>
              </div>
              <div className="text-right text-sm text-muted">
                <p>Reset on {new Date(info.nextResetAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
                <p className="mt-1">
                  {info.limits.invoicesRemaining} invoice{info.limits.invoicesRemaining === 1 ? '' : 's'} remaining
                </p>
              </div>
            </div>
            <div className="mt-5">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/5">
                <div className="h-full rounded-full bg-accent" style={{ width: `${usagePct}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted">
                {info.limits.invoicesUsed} of {info.limits.invoiceLimit} invoices used this month.
              </p>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="font-serif text-xl tracking-tight">Choose a plan</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {PLAN_ORDER.map((plan) => {
                const details = PLAN_DETAILS[plan];
                const isCurrent = info.plan === plan;
                return (
                  <div
                    key={plan}
                    className={`relative flex flex-col rounded-2xl border p-5 ${
                      details.highlight ? 'border-accent/40 bg-accent/[0.03]' : 'border-line bg-elevated'
                    }`}
                  >
                    {details.highlight ? (
                      <span className="absolute -top-2.5 right-4 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-white">
                        Popular
                      </span>
                    ) : null}
                    <p className="text-sm font-semibold">{plan}</p>
                    <p className="mt-1 text-xs text-muted">{details.tagline}</p>
                    <p className="mt-4 font-serif text-3xl tracking-tight">
                      ₹{planPrice(plan)}
                      <span className="text-sm text-muted">/mo</span>
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-muted">
                      {details.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <span className="mt-0.5 text-accent">✓</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-6 flex-1" />
                    <button
                      type="button"
                      disabled={isCurrent || busy !== null}
                      onClick={() => choosePlan(plan)}
                      className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                        isCurrent
                          ? 'cursor-default border border-line bg-black/[0.03] text-muted'
                          : details.highlight
                            ? 'bg-ink text-white hover:bg-ink/90'
                            : 'border border-line bg-white hover:bg-black/[0.03]'
                      }`}
                    >
                      {busy === plan ? 'Updating…' : isCurrent ? 'Current plan' : plan === 'FREE' ? 'Switch to Free' : 'Upgrade'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}