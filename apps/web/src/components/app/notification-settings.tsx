'use client';

import { useState } from 'react';
import { useAuth, ApiError } from '@/lib/auth-context';
import { api } from '@/lib/api-client';

type Feedback = { type: 'success' | 'error'; text: string } | null;

type PrefField = 'notifyInvoiceSent' | 'notifyPaymentReceived';

const PREFS: Array<{ field: PrefField; title: string; description: string }> = [
  {
    field: 'notifyInvoiceSent',
    title: 'When an invoice is sent',
    description: 'Email your customer a payment link whenever you send an invoice.',
  },
  {
    field: 'notifyPaymentReceived',
    title: 'When I get paid',
    description: 'Email me as soon as a client completes a payment.',
  },
];

export function NotificationSettings() {
  const { business, refresh } = useAuth();
  const [saving, setSaving] = useState<PrefField | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const handleToggle = async (field: PrefField, value: boolean) => {
    setFeedback(null);
    setSaving(field);
    try {
      await api.patch('/api/business', { [field]: value });
      await refresh();
      setFeedback({ type: 'success', text: 'Notification preferences updated.' });
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof ApiError ? err.message : 'Failed to update notification preferences.' });
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-line bg-elevated p-6">
      <h2 className="font-serif text-xl">Notifications</h2>
      <p className="text-sm text-muted">
        Choose which emails PayFlow automatically sends for your account and your customers.
      </p>

      {feedback ? (
        <div
          className={`rounded-xl p-3 text-sm border ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800'
              : 'border-red-200 bg-red-50/70 text-red-700'
          }`}
        >
          {feedback.text}
        </div>
      ) : null}

      <div className="divide-y divide-line">
        {PREFS.map((pref) => {
          const checked = business ? business[pref.field] !== false : true;
          return (
            <label key={pref.field} className="flex items-start justify-between gap-6 py-4 text-sm">
              <span>
                <span className="block font-medium text-ink">{pref.title}</span>
                <span className="mt-0.5 block text-xs text-muted">{pref.description}</span>
              </span>
              <input
                type="checkbox"
                checked={checked}
                disabled={saving !== null}
                onChange={(e) => void handleToggle(pref.field, e.target.checked)}
                className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-[#4f46e5] disabled:opacity-50"
              />
            </label>
          );
        })}
      </div>

      <p className="text-xs text-muted">
        Verification codes and password-reset emails are always sent and cannot be turned off.
      </p>
    </div>
  );
}