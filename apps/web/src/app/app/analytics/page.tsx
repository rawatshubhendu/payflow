'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/app/app-shell';
import { EmptyState } from '@/components/ui/empty-state';
import { PaymentStatusDonut, RevenueChart } from '@/components/app/analytics-charts';
import { api, ApiError } from '@/lib/api-client';
import { formatInrExact } from '@/lib/money';
import type { AnalyticsOverview, PaymentStatusOverview, RevenueOverview } from '@payflow/types';

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [revenue, setRevenue] = useState<RevenueOverview | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusOverview | null>(null);
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<AnalyticsOverview>('/api/analytics/overview'),
      api.get<RevenueOverview>('/api/analytics/revenue?days=30'),
      api.get<PaymentStatusOverview>('/api/analytics/payment-status'),
    ])
      .then(([overviewRes, revenueRes, statusRes]) => {
        setOverview(overviewRes);
        setRevenue(revenueRes);
        setPaymentStatus(statusRes);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load analytics.'))
      .finally(() => setLoading(false));
  }, []);

  const onRangeChange = useCallback((next: 7 | 30 | 90) => {
    setRange(next);
    api
      .get<RevenueOverview>(`/api/analytics/revenue?days=${next}`)
      .then(setRevenue)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load revenue.'));
  }, []);

  const kpis = overview?.kpis;
  const counts = overview?.counts;

  const invoiced = kpis?.total ?? 0;
  const outstanding = (kpis?.pending ?? 0) + (kpis?.overdue ?? 0);
  const collected = kpis?.collected ?? 0;
  const collectionRate = invoiced > 0 ? Math.round((collected / invoiced) * 100) : null;

  return (
    <AppShell title="Analytics" description="Understand collections, revenue and overdue money">
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50/70 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      {loading || !overview || !revenue || !paymentStatus ? (
        <div className="rounded-2xl border border-dashed border-line bg-elevated px-6 py-16 text-center text-sm text-muted">
          Loading analytics...
        </div>
      ) : counts!.invoices === 0 ? (
        <EmptyState
          title="No data yet"
          body="Once you invoice customers, analytics for revenue, collections and overdue money will show up here."
          href="/app/invoices/new"
          cta="Create Invoice"
        />
      ) : (
        <>
          <RevenueChart series={revenue.series} range={range} onRangeChange={onRangeChange} />

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <PaymentStatusDonut data={paymentStatus} />

            <div className="min-h-64 rounded-2xl border border-line bg-elevated p-5">
              <p className="text-sm text-muted">Collected vs outstanding</p>
              <p className="mt-3 font-serif text-4xl tracking-tight">{formatInrExact(collected)}</p>
              <p className="mt-3 text-sm text-muted">
                collected · {formatInrExact(outstanding)} outstanding across{' '}
                {counts!.pending + counts!.overdue} unpaid invoice
                {counts!.pending + counts!.overdue === 1 ? '' : 's'}.
              </p>
              {collectionRate !== null ? (
                <div className="mt-6">
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/5">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${collectionRate}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    {collectionRate}% of your invoiced amount has been collected.
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-line bg-elevated p-5">
              <p className="text-sm text-muted">Total invoiced</p>
              <p className="mt-3 font-serif text-2xl tracking-tight">{formatInrExact(invoiced)}</p>
              <p className="mt-2 text-xs text-muted">
                {counts!.invoices} invoice{counts!.invoices === 1 ? '' : 's'} issued.
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-elevated p-5">
              <p className="text-sm text-muted">Collected</p>
              <p className="mt-3 font-serif text-2xl tracking-tight">{formatInrExact(collected)}</p>
              <p className="mt-2 text-xs text-muted">
                {counts!.collected} payment{counts!.collected === 1 ? '' : 's'} received.
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-elevated p-5">
              <p className="text-sm text-muted">Overdue</p>
              <p className="mt-3 font-serif text-2xl tracking-tight">{formatInrExact(kpis!.overdue)}</p>
              <p className="mt-2 text-xs text-muted">
                {counts!.overdue} invoice{counts!.overdue === 1 ? '' : 's'} past due.
              </p>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}