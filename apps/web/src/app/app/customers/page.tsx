'use client';

import { useEffect, useState, useCallback } from 'react';
import { AppShell } from '@/components/app/app-shell';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { api, ApiError } from '@/lib/api-client';
import type { CustomerSummary } from '@payflow/types';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<CustomerSummary[]>('/api/customers');
      setCustomers(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load customers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await api.post<CustomerSummary>('/api/customers', {
        name,
        email: email || undefined,
        phone: phone || undefined,
        company: company || undefined,
      });
      setCustomers((prev) => [created, ...prev]);
      setName('');
      setEmail('');
      setPhone('');
      setCompany('');
      setShowForm(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add customer.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this customer? This cannot be undone.')) return;
    setError(null);
    try {
      await api.delete<{ success: boolean }>(`/api/customers/${id}`);
      setCustomers((prev) => prev.filter((customer) => customer.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete customer.');
    }
  };

  return (
    <AppShell
      title="Customers"
      description="All clients and their outstanding balances"
      action={<Button onClick={() => setShowForm((value) => !value)}>{showForm ? 'Close' : 'Add Customer'}</Button>}
    >
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50/70 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      {showForm ? (
        <form
          onSubmit={handleCreate}
          className="mb-6 grid gap-4 rounded-2xl border border-line bg-elevated p-6 md:grid-cols-2"
        >
          <label className="block text-sm">
            Customer name
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-xl border border-line bg-elevated px-3 py-3 outline-none transition-colors focus:border-ink"
              placeholder="e.g. Acme Interiors"
              disabled={saving}
            />
          </label>
          <label className="block text-sm">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-xl border border-line bg-elevated px-3 py-3 outline-none transition-colors focus:border-ink"
              placeholder="accounts@acme.in"
              disabled={saving}
            />
          </label>
          <label className="block text-sm">
            Phone
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-2 w-full rounded-xl border border-line bg-elevated px-3 py-3 outline-none transition-colors focus:border-ink"
              placeholder="+91 98XXXXXX12"
              disabled={saving}
            />
          </label>
          <label className="block text-sm">
            Company
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="mt-2 w-full rounded-xl border border-line bg-elevated px-3 py-3 outline-none transition-colors focus:border-ink"
              placeholder="Acme Interiors Pvt. Ltd."
              disabled={saving}
            />
          </label>
          <div className="md:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Add Customer'}
            </Button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-dashed border-line bg-elevated px-6 py-16 text-center text-sm text-muted">
          Loading customers...
        </div>
      ) : customers.length === 0 ? (
        <EmptyState title="No customers yet" body="Add your first customer to start creating invoices for them." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-elevated">
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="hidden px-5 py-3 font-medium md:table-cell">Contact</th>
                <th className="hidden px-5 py-3 font-medium sm:table-cell">Added</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-4">
                    <p className="font-medium">{customer.name}</p>
                    {customer.company ? <p className="text-xs text-muted">{customer.company}</p> : null}
                  </td>
                  <td className="hidden px-5 py-4 text-muted md:table-cell">
                    {customer.email || customer.phone ? (
                      <p>{customer.email || customer.phone}</p>
                    ) : (
                      <span className="italic">No contact</span>
                    )}
                  </td>
                  <td className="hidden px-5 py-4 text-muted sm:table-cell">
                    {new Date(customer.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(customer.id)}
                      className="text-sm text-muted transition-colors hover:text-red-600"
                    >
                      Delete
                    </button>
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