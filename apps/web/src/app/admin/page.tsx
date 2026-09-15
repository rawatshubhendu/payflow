'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/app/admin-shell';
import { api, ApiError } from '@/lib/api-client';
import { formatInr, formatInrExact } from '@/lib/money';
import type { AdminOverview, SubscriptionPlan } from '@payflow/types';

const PLAN_ORDER: SubscriptionPlan[] = ['FREE', 'PRO', 'BUSINESS'];

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-elevated p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 font-serif text-2xl tracking-tight">{value}</p>
      {sub ? <p className="mt-1 text-xs text-muted">{sub}</p> : null}
    </div>
  );
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AdminOverview>('/api/admin/overview')
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load overview.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AdminShell title="Overview">
        <div className="rounded-2xl border border-dashed border-line bg-elevated px-6 py-16 text-center text-sm text-muted">
          Loading…
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Overview">
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50/70 p-3 text-sm text-red-700">{error}</div>
      ) : null}
      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Users" value={data.counts.users} />
            <StatCard label="Businesses" value={data.counts.businesses} />
            <StatCard label="Invoices" value={data.counts.invoices} />
            <StatCard label="Payments" value={data.counts.payments} />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Invoiced" value={formatInr(data.revenue.invoiced)} />
            <StatCard label="Collected" value={formatInr(data.revenue.collected)} sub="captured payments" />
            <StatCard label="Failed amount" value={formatInrExact(data.revenue.failed)} />
            <StatCard label="Logged errors" value={data.counts.errors} sub="server-side" />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-line bg-elevated p-5">
              <p className="text-sm text-muted">Plan distribution</p>
              <div className="mt-4 space-y-3 text-sm">
                {PLAN_ORDER.map((plan) => (
                  <div key={plan} className="flex items-center justify-between">
                    <span className="text-muted">{plan}</span>
                    <span className="font-medium">{data.planDistribution[plan]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-line bg-elevated p-5">
              <p className="text-sm text-muted">Invoice statuses</p>
              <div className="mt-4 space-y-3 text-sm">
                {Object.entries(data.invoiceStatuses).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-muted">{status}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-line bg-elevated p-5">
              <p className="text-sm text-muted">Latest signups</p>
              <div className="mt-3 divide-y divide-line text-sm">
                {data.recentSignups.map((user) => (
                  <div key={user.id} className="flex items-center justify-between py-2.5">
                    <span className="truncate pr-3">{user.email}</span>
                    <span className="shrink-0 text-xs text-muted">
                      {user.emailVerified ? 'verified' : 'unverified'} ·{' '}
                      {new Date(user.createdAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                ))}
                {data.recentSignups.length === 0 ? <p className="py-3 text-muted">No signups yet.</p> : null}
              </div>
            </div>
            <div className="rounded-2xl border border-line bg-elevated p-5">
              <p className="text-sm text-muted">Latest audit activity</p>
              <div className="mt-3 divide-y divide-line text-sm">
                {data.recentAudit.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between py-2.5">
                    <span className="truncate pr-3">{entry.action}</span>
                    <span className="shrink-0 text-xs text-muted">{new Date(entry.createdAt).toLocaleString('en-IN')}</span>
                  </div>
                ))}
                {data.recentAudit.length === 0 ? <p className="py-3 text-muted">No activity yet.</p> : null}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </AdminShell>
  );
}