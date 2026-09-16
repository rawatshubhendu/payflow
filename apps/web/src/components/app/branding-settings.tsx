'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth, ApiError } from '@/lib/auth-context';
import { api } from '@/lib/api-client';
import { freeFallbackSubscription } from '@/lib/plans';
import type { BusinessSummary, SubscriptionInfo } from '@payflow/types';

type Feedback = { type: 'success' | 'error'; text: string } | null;

const inputClass =
  'mt-2 w-full rounded-xl border border-line bg-elevated px-3 py-3 outline-none focus:border-ink transition-colors';
const labelClass = 'block text-sm';

export function BrandingSettings() {
  const { business, refresh } = useAuth();
  const [logoUrl, setLogoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);

  useEffect(() => {
    api
      .get<SubscriptionInfo>('/api/subscription')
      .then(setSubscription)
      .catch(() => setSubscription(freeFallbackSubscription()));
  }, []);

  useEffect(() => {
    if (business) setLogoUrl(business.logoUrl ?? '');
  }, [business]);

  if (subscription && !subscription.features.customBranding) {
    return (
      <div className="flex min-h-56 flex-col items-start justify-center rounded-2xl border border-line bg-elevated p-6">
        <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent">
          Pro feature
        </span>
        <h2 className="mt-3 font-serif text-xl tracking-tight">Custom branding</h2>
        <p className="mt-2 max-w-md text-sm text-muted">
          Put your logo on invoice payment pages. Custom branding is included with the Pro plan.
        </p>
        <Button href="/app/billing" className="mt-5">
          Upgrade to Pro
        </Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSaving(true);
    try {
      await api.patch<BusinessSummary>('/api/business', {
        logoUrl: logoUrl.trim() || undefined,
      });
      await refresh();
      setFeedback({ type: 'success', text: 'Branding saved. Your logo now appears on public payment pages.' });
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof ApiError ? err.message : 'Failed to save branding.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-line bg-elevated p-6">
      <h2 className="font-serif text-xl">Branding</h2>
      <p className="text-sm text-muted">
        Personalize the page your customers see when they open an invoice to pay.
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

      <label className={labelClass}>
        Business logo URL
        <input
          type="url"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          className={inputClass}
          placeholder="https://example.com/logo.png"
          disabled={saving}
        />
      </label>
      <p className="text-xs text-muted">
        Paste a public URL to an image (PNG or JPG, preferably square). The logo is shown at the top of
        your invoice payment pages. Leave empty to show the PayFlow wordmark.
      </p>

      {logoUrl.trim() ? (
        <div className="rounded-xl border border-line bg-ink/5 p-4">
          <p className="text-xs font-medium text-muted">Preview</p>
          <img
            src={logoUrl.trim()}
            alt="Logo preview"
            className="mt-2 max-h-20 object-contain"
            onError={(e) => {
              e.currentTarget.classList.add('opacity-40');
            }}
          />
        </div>
      ) : null}

      <div className="pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save branding'}
        </Button>
      </div>
    </form>
  );
}