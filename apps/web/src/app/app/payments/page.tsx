'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/app/app-shell';
import { KpiCard } from '@/components/ui/kpi-card';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { api, ApiError } from '@/lib/api-client';
import { formatInrExact } from '@/lib/money';
import type { PaymentsOverview } from '@payflow/types';

export default function PaymentsPage() {
  const [overview, setOverview] = useState<PaymentsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<PaymentsOverview>('/api/payments')
      .then(setOverview)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load payments.'))
      .finally(() => setLoading(false));
  }, []);

  const kpis = overview?.kpis;
  const counts = overview?.counts;
  const payments = overview?.payments ?? [];

  return (
    <AppShell title="Payments" description="Every verified transaction in one place">
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50/70 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      {loading || !overview ? (
        <div className="rounded-2xl border border-dashed border-line bg-elevated px-6 py-16 text-center text-sm text-muted">
          Loading payments...
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <KpiCard
              label="Collected"
              value={formatInrExact(kpis!.collected)}
              hint={`${counts!.collected} payment${counts!.collected === 1 ? '' : 's'}`}
              tone="good"
            />
            <KpiCard
              label="Pending"
              value={formatInrExact(kpis!.pending)}
              hint={`${counts!.pending} payment${counts!.pending === 1 ? '' : 's'}`}
              tone="warn"
            />
            <KpiCard
              label="Failed"
              value={formatInrExact(kpis!.failed)}
              hint={`${counts!.failed} payment${counts!.failed === 1 ? '' : 's'}`}
              tone="bad"
            />
          </div>

          <div className="mt-6">
            {payments.length === 0 ? (
              <EmptyState
                title="No payments yet"
                body="Payments will only appear after a verified gateway webhook. The browser never marks an invoice paid."
              />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-line bg-elevated">
                <table className="w-full text-left text-sm">
                  <thead className="text-muted">
                    <tr className="border-b border-line">
                      <th className="px-5 py-3 font-medium">Invoice</th>
                      <th className="hidden px-5 py-3 font-medium sm:table-cell">Customer</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="hidden px-5 py-3 font-medium md:table-cell">Method</th>
                      <th className="hidden px-5 py-3 font-medium lg:table-cell">Paid</th>
                      <th className="px-5 py-3 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id} className="border-b border-line last:border-0">
                        <td className="px-5 py-4">
                          <p className="font-medium">{payment.invoiceNumber}</p>
                          <p className="text-xs text-muted sm:hidden">{payment.customerName ?? '—'}</p>
                        </td>
                        <td className="hidden px-5 py-4 text-muted sm:table-cell">{payment.customerName ?? '—'}</td>
                        <td className="px-5 py-4">
                          <StatusBadge status={payment.status} />
                        </td>
                        <td className="hidden px-5 py-4 text-muted md:table-cell">{payment.method ?? '—'}</td>
                        <td className="hidden px-5 py-4 text-muted lg:table-cell">
                          {payment.paidAt
                            ? new Date(payment.paidAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : payment.createdAt
                              ? new Date(payment.createdAt).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : '—'}
                        </td>
                        <td className="px-5 py-4 text-right font-medium">{formatInrExact(payment.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}