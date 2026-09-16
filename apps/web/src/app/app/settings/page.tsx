'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/app/app-shell';
import { Button } from '@/components/ui/button';
import { PaymentGatewaySettings } from '@/components/app/payment-gateway-settings';
import { BrandingSettings } from '@/components/app/branding-settings';
import { InvoiceDefaultsSettings } from '@/components/app/invoice-defaults-settings';
import { NotificationSettings } from '@/components/app/notification-settings';
import { SecuritySettings } from '@/components/app/security-settings';
import { BillingSettings } from '@/components/app/billing-settings';
import { useAuth, ApiError } from '@/lib/auth-context';
import { api } from '@/lib/api-client';
import type { BusinessSummary } from '@payflow/types';

const tabs = [
  'Business profile',
  'Payments',
  'Branding',
  'Invoice defaults',
  'Notifications',
  'Security',
  'Billing',
];

export default function SettingsPage() {
  const { business, refresh } = useAuth();
  const [activeTab, setActiveTab] = useState('Business profile');
  const [isAdmin, setIsAdmin] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [invoicePrefix, setInvoicePrefix] = useState('INV-');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    api.get<{ isAdmin: boolean }>('/api/admin/role').then((role) => setIsAdmin(role.isAdmin)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (business) {
      setName(business.name || '');
      setEmail(business.email || '');
      setPhone(business.phone || '');
      setCurrency(business.currency || 'INR');
      setInvoicePrefix(business.invoicePrefix || 'INV-');
    }
  }, [business]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    try {
      await api.patch<BusinessSummary>('/api/business', {
        name,
        email: email || undefined,
        phone: phone || undefined,
        currency,
        invoicePrefix,
      });
      await refresh();
      setMessage({ type: 'success', text: 'Business profile updated successfully.' });
    } catch (err) {
      if (err instanceof ApiError) {
        setMessage({ type: 'error', text: err.message });
      } else {
        setMessage({ type: 'error', text: 'Failed to update business settings.' });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Settings" description="Business, invoice and account configuration">
      <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
        {/* Settings Navigation Tabs */}
        <nav className="flex flex-col gap-1 text-sm">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-3 py-2 text-left font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-ink text-white'
                  : 'text-muted hover:bg-black/5 hover:text-ink'
              }`}
            >
              {tab}
            </button>
          ))}
          {isAdmin ? (
            <a href="/admin" className="mt-4 rounded-xl border border-line px-3 py-2 text-left text-sm font-medium text-muted transition-colors hover:bg-black/5 hover:text-ink">
              Admin console →
            </a>
          ) : null}
        </nav>

        {/* Tab Content */}
        <div className="max-w-xl">
          {activeTab === 'Business profile' ? (
            <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-line bg-elevated p-6">
              <h2 className="font-serif text-xl">Business profile</h2>
              <p className="text-sm text-muted">This information appears on your invoices and public payment links.</p>

              {message ? (
                <div
                  className={`rounded-xl p-3 text-sm border ${
                    message.type === 'success'
                      ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800'
                      : 'border-red-200 bg-red-50/70 text-red-700'
                  }`}
                >
                  {message.text}
                </div>
              ) : null}

              <label className="block text-sm">
                Business name
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-line bg-elevated px-3 py-3 outline-none focus:border-ink transition-colors"
                  placeholder="e.g. Shubhendu Digital"
                  disabled={saving}
                />
              </label>

              <label className="block text-sm">
                Business email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-line bg-elevated px-3 py-3 outline-none focus:border-ink transition-colors"
                  placeholder="hello@studio.in"
                  disabled={saving}
                />
              </label>

              <label className="block text-sm">
                Phone
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-line bg-elevated px-3 py-3 outline-none focus:border-ink transition-colors"
                  placeholder="+91 98XXXXXX12"
                  disabled={saving}
                />
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm">
                  Currency
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-line bg-elevated px-3 py-3 outline-none focus:border-ink transition-colors"
                    placeholder="INR"
                    disabled={saving}
                  />
                </label>

                <label className="block text-sm">
                  Invoice prefix
                  <input
                    type="text"
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-line bg-elevated px-3 py-3 outline-none focus:border-ink transition-colors"
                    placeholder="INV-"
                    disabled={saving}
                  />
                </label>
              </div>

              <div className="pt-2">
                <Button type="submit">
                  {saving ? 'Saving changes...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          ) : activeTab === 'Payments' ? (
            <PaymentGatewaySettings />
          ) : activeTab === 'Branding' ? (
            <BrandingSettings />
          ) : activeTab === 'Invoice defaults' ? (
            <InvoiceDefaultsSettings />
          ) : activeTab === 'Notifications' ? (
            <NotificationSettings />
          ) : activeTab === 'Security' ? (
            <SecuritySettings />
          ) : (
            <BillingSettings />
          )}
        </div>
      </div>
    </AppShell>
  );
}
