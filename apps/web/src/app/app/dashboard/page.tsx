'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/app/app-shell';
import { ProFeatureCard } from '@/components/app/pro-feature-card';
import { RevenueChart, PaymentStatusDonut } from '@/components/app/analytics-charts';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { PaymentNotificationBanner } from '@/components/app/payment-notification';
import { api, ApiError } from '@/lib/api-client';
import { formatInrExact } from '@/lib/money';
import { freeFallbackSubscription } from '@/lib/plans';
import { useAuth } from '@/lib/auth-context';
import type {
  AnalyticsOverview,
  PaymentStatusOverview,
  RevenueOverview,
  SubscriptionInfo,
} from '@payflow/types';

export default function DashboardPage() {
  const { business } = useAuth();
  const firstName = business?.name ? business.name.split(' ')[0] : '';
  const title = firstName ? `Good morning, ${firstName}` : 'Good morning';

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [revenue, setRevenue] = useState<RevenueOverview | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusOverview | null>(null);
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AnalyticsOverview>('/api/analytics/overview')
      .then(setOverview)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load dashboard.'))
      .finally(() => setLoading(false));
    api
      .get<SubscriptionInfo>('/api/subscription')
      .then(setSubscription)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Failed to load dashboard.');
        setSubscription(freeFallbackSubscription());
      });
  }, []);

  const canCharts = subscription?.features.analyticsCharts ?? false;

  const onRangeChange = useCallback((next: 7 | 30 | 90) => {
    setRange(next);
    api
      .get<RevenueOverview>(`/api/analytics/revenue?days=${next}`)
      .then(setRevenue)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!canCharts) return;
    Promise.all([
      api.get<RevenueOverview>('/api/analytics/revenue?days=30'),
      api.get<PaymentStatusOverview>('/api/analytics/payment-status'),
    ])
      .then(([revenueRes, statusRes]) => {
        setRevenue(revenueRes);
        setPaymentStatus(statusRes);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load analytics.'));
  }, [canCharts]);

  const kpis = overview?.kpis;
  const counts = overview?.counts;

  return (
    <AppShell
      title={title}
      description="Here’s your payment pulse."
      action={<Button href="/app/invoices/new">Create Invoice</Button>}
    >
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50/70 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      <PaymentNotificationBanner />

      {loading || !overview || !subscription ? (
        <div className="rounded-2xl border border-dashed border-line bg-elevated px-6 py-16 text-center text-sm text-muted">
          Loading dashboard...
        </div>
      ) : counts!.invoices === 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Total revenue" value={formatInrExact(0)} hint="No invoices yet" />
            <KpiCard label="Collected" value={formatInrExact(0)} tone="good" />
            <KpiCard label="Pending" value={formatInrExact(0)} hint="0 invoices" tone="warn" />
            <KpiCard label="Overdue" value={formatInrExact(0)} hint="0 invoices" tone="bad" />
          </div>
          <div className="mt-6">
            <EmptyState
              title="No invoices yet"
              body="Create your first invoice and the dashboard will track it here."
              href="/app/invoices/new"
              cta="Create Invoice"
            />
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Total revenue"
              value={formatInrExact(kpis!.total)}
              hint={`${counts!.invoices} invoice${counts!.invoices === 1 ? '' : 's'} · ${counts!.customers} customer${counts!.customers === 1 ? '' : 's'}`}
            />
            <KpiCard label="Collected" value={formatInrExact(kpis!.collected)} hint={`${counts!.collected} paid`} tone="good" />
            <KpiCard label="Pending" value={formatInrExact(kpis!.pending)} hint={`${counts!.pending} invoice${counts!.pending === 1 ? '' : 's'}`} tone="warn" />
            <KpiCard label="Overdue" value={formatInrExact(kpis!.overdue)} hint={`${counts!.overdue} invoice${counts!.overdue === 1 ? '' : 's'}`} tone="bad" />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {canCharts && revenue && paymentStatus ? (
              <>
                <RevenueChart series={revenue.series} range={range} onRangeChange={onRangeChange} />
                <PaymentStatusDonut data={paymentStatus} />
              </>
            ) : (
              <>
                <ProFeatureCard
                  title="Revenue charts"
                  description="See revenue trends, collection rate and payment status at a glance."
                />
                <ProFeatureCard
                  title="Payment status"
                  description="Track how much is collected, pending and overdue across your invoices."
                />
              </>
            )}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="overflow-hidden rounded-2xl border border-line bg-elevated">
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <h2 className="text-sm font-medium">Recent invoices</h2>
                <Link href="/app/invoices" className="text-sm text-accent hover:underline">
                  View all
                </Link>
              </div>
              {overview!.recentInvoices.length === 0 ? (
                <p className="px-5 py-8 text-sm text-muted">No invoices yet.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <tbody>
                    {overview!.recentInvoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-line last:border-0">
                        <td className="px-5 py-3">
                          <p className="font-medium">{invoice.invoiceNumber}</p>
                          <p className="text-xs text-muted">{invoice.customer.name}</p>
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={invoice.status} />
                        </td>
                        <td className="px-5 py-3 text-right font-medium">{formatInrExact(invoice.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-line bg-elevated">
              <div className="border-b border-line px-5 py-3">
                <h2 className="text-sm font-medium">Overdue</h2>
              </div>
              {overview!.overdueInvoices.length === 0 ? (
                <p className="px-5 py-8 text-sm text-muted">Nothing overdue. Nice.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <tbody>
                    {overview!.overdueInvoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-line last:border-0">
                        <td className="px-5 py-3">
                          <p className="font-medium">{invoice.invoiceNumber}</p>
                          <p className="text-xs text-muted">{invoice.customer.name}</p>
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status="OVERDUE" />
                        </td>
                        <td className="px-5 py-3 text-right font-medium">{formatInrExact(invoice.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        </>
      )}
    </AppShell>
  );
}