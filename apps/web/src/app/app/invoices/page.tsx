'use client';

import { useEffect, useState, useCallback } from 'react';
import { AppShell } from '@/components/app/app-shell';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusBadge } from '@/components/ui/status-badge';
import { PaymentNotificationBanner } from '@/components/app/payment-notification';
import { api, ApiError, downloadBlob } from '@/lib/api-client';
import { formatInrExact } from '@/lib/money';
import type { InvoiceSummary } from '@payflow/types';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyPaymentLink = async (invoice: InvoiceSummary) => {
    const url = `${window.location.origin}/pay/${invoice.publicToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(invoice.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setError('Could not copy the payment link.');
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<InvoiceSummary[]>('/api/invoices');
      setInvoices(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sendInvoice = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await api.post(`/api/invoices/${id}/send`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send invoice.');
    } finally {
      setBusyId(null);
    }
  };

  const cancelInvoice = async (id: string, invoiceNumber: string) => {
    if (!window.confirm(`Cancel invoice ${invoiceNumber}? This cannot be undone.`)) return;
    setBusyId(id);
    setError(null);
    try {
      await api.post(`/api/invoices/${id}/cancel`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to cancel invoice.');
    } finally {
      setBusyId(null);
    }
  };

  const deleteInvoice = async (id: string, invoiceNumber: string) => {
    if (!window.confirm(`Delete draft invoice ${invoiceNumber}? This cannot be undone.`)) return;
    setBusyId(id);
    setError(null);
    try {
      await api.delete(`/api/invoices/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete invoice.');
    } finally {
      setBusyId(null);
    }
  };

  const downloadPdf = async (id: string, invoiceNumber: string) => {
    setBusyId(id);
    setError(null);
    try {
      const blob = await downloadBlob(`/api/invoices/${id}/pdf`, { method: 'POST' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to download invoice PDF.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AppShell
      title="Invoices"
      description="Create, track and collect from every invoice"
      action={
        <Button href="/app/invoices/new" disabled={loading}>
          Create Invoice
        </Button>
      }
    >
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50/70 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      <PaymentNotificationBanner />

      {loading ? (
        <div className="rounded-2xl border border-dashed border-line bg-elevated px-6 py-16 text-center text-sm text-muted">
          Loading invoices...
        </div>
      ) : invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          body="Create your first invoice and it will show up here."
          href="/app/invoices/new"
          cta="Create Invoice"
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-elevated">
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="px-5 py-3 font-medium">Invoice</th>
                <th className="hidden px-5 py-3 font-medium sm:table-cell">Customer</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="hidden px-5 py-3 font-medium md:table-cell">Due date</th>
                <th className="px-5 py-3 text-right font-medium">Total</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-4">
                    <p className="font-medium">{invoice.invoiceNumber}</p>
                    <p className="text-xs text-muted sm:hidden">{invoice.customer.name}</p>
                  </td>
                  <td className="hidden px-5 py-4 text-muted sm:table-cell">{invoice.customer.name}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={invoice.status} />
                  </td>
                  <td className="hidden px-5 py-4 text-muted md:table-cell">
                    {invoice.dueDate
                      ? new Date(invoice.dueDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="px-5 py-4 text-right font-medium">{formatInrExact(invoice.totalAmount)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => void downloadPdf(invoice.id, invoice.invoiceNumber)}
                        disabled={busyId === invoice.id}
                      >
                        PDF
                      </Button>
                      {invoice.status === 'DRAFT' ? (
                        <>
                          <Button variant="ghost" href={`/app/invoices/${invoice.id}/edit`}>
                            Edit
                          </Button>
                          <Button onClick={() => void sendInvoice(invoice.id)} disabled={busyId === invoice.id}>
                            Send
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => void deleteInvoice(invoice.id, invoice.invoiceNumber)}
                            disabled={busyId === invoice.id}
                          >
                            Delete
                          </Button>
                        </>
                      ) : ['SENT', 'PENDING', 'OVERDUE'].includes(invoice.status) ? (
                        <>
                          <Button
                            variant="ghost"
                            onClick={() => void copyPaymentLink(invoice)}
                            disabled={busyId === invoice.id}
                          >
                            {copiedId === invoice.id ? 'Copied!' : 'Copy link'}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => void cancelInvoice(invoice.id, invoice.invoiceNumber)}
                            disabled={busyId === invoice.id}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}