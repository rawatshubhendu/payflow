'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/app/admin-shell';
import { api, ApiError } from '@/lib/api-client';
import type { AdminErrorEntry } from '@payflow/types';

const STATUS_COLORS: Record<string, string> = {
  '4': 'bg-amber-50 text-amber-700',
  '5': 'bg-red-50 text-red-700',
};

export default function AdminErrorsPage() {
  const [rows, setRows] = useState<AdminErrorEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AdminErrorEntry[]>('/api/admin/errors')
      .then(setRows)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load errors.'));
  }, []);

  return (
    <AdminShell title="Errors">
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50/70 p-3 text-sm text-red-700">{error}</div>
      ) : null}
      <div className="overflow-hidden rounded-2xl border border-line bg-elevated">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Request ID</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody>
              {rows?.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0 align-top">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        STATUS_COLORS[String(row.status).charAt(0)] ?? 'bg-black/5'
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{row.code}</td>
                  <td className="max-w-72 truncate px-4 py-3">{row.message}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">
                    {row.method} {row.path}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{row.requestId ?? '—'}</td>
                  <td className="px-4 py-3 text-muted">{new Date(row.createdAt).toLocaleString('en-IN')}</td>
                </tr>
              ))}
              {rows && rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted">
                    No errors recorded.
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