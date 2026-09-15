'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/app/app-shell';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { PaymentNotificationBanner } from '@/components/app/payment-notification';
import { api, ApiError } from '@/lib/api-client';
import { formatInrExact } from '@/lib/money';
import { useAuth } from '@/lib/auth-context';
import type { AnalyticsOverview } from '@payflow/types';

export default function DashboardPage() {
  const { business } = useAuth();
  const firstName = business?.name ? business.name.split(' ')[0] : '';
  const title = firstName ? `Good morning, ${firstName}` : 'Good morning';

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AnalyticsOverview>('/api/analytics/overview')
      .then(setOverview)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load dashboard.'))
      .finally(() => setLoading(false));
  }, []);

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

      {loading || !overview ? (
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
            <div className="min-h-56 rounded-2xl border border-line bg-elevated p-5">
              <p className="text-sm text-muted">Revenue</p>
              <p className="mt-8 text-sm text-muted">
                {formatInrExact(kpis!.collected)} collected across {counts!.collected} paid invoice
                {counts!.collected === 1 ? '' : 's'}. Charts arrive once payments exist.
              </p>
            </div>
            <div className="min-h-56 rounded-2xl border border-line bg-elevated p-5">
              <p className="text-sm text-muted">Collected vs outstanding</p>
              <p className="mt-8 text-sm text-muted">
                {formatInrExact(kpis!.collected)} collected · {formatInrExact(kpis!.pending + kpis!.overdue)} outstanding.
              </p>
            </div>
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