'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/app/admin-shell';
import { api, ApiError } from '@/lib/api-client';
import type { AdminUserRow } from '@payflow/types';

export default function AdminUsersPage() {
  const [rows, setRows] = useState<AdminUserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AdminUserRow[]>('/api/admin/users')
      .then(setRows)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load users.'));
  }, []);

  return (
    <AdminShell title="Users">
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50/70 p-3 text-sm text-red-700">{error}</div>
      ) : null}
      <div className="overflow-hidden rounded-2xl border border-line bg-elevated">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Business</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Invoices</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows?.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="max-w-64 truncate">{row.email}</span>
                      {!row.emailVerified ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                          unverified
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{row.businessName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs font-semibold">{row.plan}</span>
                  </td>
                  <td className="px-4 py-3">{row.invoiceCount}</td>
                  <td className="px-4 py-3 text-muted">{new Date(row.createdAt).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
              {rows && rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted">
                    No users yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}