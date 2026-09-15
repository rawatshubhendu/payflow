'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/app/admin-shell';
import { api, ApiError } from '@/lib/api-client';
import type { AdminAuditEntry } from '@payflow/types';

export default function AdminAuditPage() {
  const [rows, setRows] = useState<AdminAuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AdminAuditEntry[]>('/api/admin/audit')
      .then(setRows)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load audit log.'));
  }, []);

  return (
    <AdminShell title="Audit log">
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50/70 p-3 text-sm text-red-700">{error}</div>
      ) : null}
      <div className="overflow-hidden rounded-2xl border border-line bg-elevated">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Entity ID</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody>
              {rows?.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium">{row.action}</td>
                  <td className="px-4 py-3 text-muted">{row.entityType}</td>
                  <td className="px-4 py-3 text-muted">{row.entityId ? row.entityId.slice(0, 12) + '…' : '—'}</td>
                  <td className="px-4 py-3 text-muted">{row.actorUserId ? row.actorUserId.slice(0, 12) + '…' : '—'}</td>
                  <td className="px-4 py-3 text-muted">{new Date(row.createdAt).toLocaleString('en-IN')}</td>
                </tr>
              ))}
              {rows && rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted">
                    No audit entries yet.
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