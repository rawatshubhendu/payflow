'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth, ApiError } from '@/lib/auth-context';
import { api } from '@/lib/api-client';
import type { BusinessSummary, TaxType } from '@payflow/types';

type Feedback = { type: 'success' | 'error'; text: string } | null;

const inputClass =
  'mt-2 w-full rounded-xl border border-line bg-elevated px-3 py-3 outline-none focus:border-ink transition-colors';
const labelClass = 'block text-sm';

export function InvoiceDefaultsSettings() {
  const { business, refresh } = useAuth();
  const [taxRate, setTaxRate] = useState(18);
  const [taxType, setTaxType] = useState<TaxType>('NONE');
  const [dueDays, setDueDays] = useState(14);
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [thankYouNote, setThankYouNote] = useState('');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    if (!business) return;
    setTaxRate(business.defaultTaxRate ?? 18);
    setTaxType(business.defaultTaxType ?? 'NONE');
    setDueDays(business.defaultDueDays ?? 14);
    setInvoiceNotes(business.invoiceNotes ?? '');
    setThankYouNote(business.thankYouNote ?? '');
  }, [business]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setSaving(true);
    try {
      await api.patch<BusinessSummary>('/api/business', {
        defaultTaxRate: taxRate,
        defaultTaxType: taxType,
        defaultDueDays: dueDays,
        invoiceNotes: invoiceNotes.trim() || undefined,
        thankYouNote: thankYouNote.trim() || undefined,
      });
      await refresh();
      setFeedback({ type: 'success', text: 'Invoice defaults saved. New invoices will use these settings.' });
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof ApiError ? err.message : 'Failed to save invoice defaults.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-line bg-elevated p-6">
      <h2 className="font-serif text-xl">Invoice defaults</h2>
      <p className="text-sm text-muted">
        These values are pre-filled when you create a new invoice. You can still change them per invoice.
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

      <div className="grid grid-cols-2 gap-4">
        <label className={labelClass}>
          Default tax rate (%)
          <input
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={taxRate}
            onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
            className={inputClass}
            disabled={saving}
          />
        </label>
        <label className={labelClass}>
          Payment due in (days)
          <input
            type="number"
            min={0}
            max={365}
            step={1}
            value={dueDays}
            onChange={(e) => setDueDays(Number(e.target.value) || 0)}
            className={inputClass}
            disabled={saving}
          />
        </label>
      </div>

      <label className={labelClass}>
        Default tax type
        <select
          value={taxType}
          onChange={(e) => setTaxType(e.target.value as TaxType)}
          className={inputClass}
          disabled={saving}
        >
          <option value="NONE">No tax (unregistered / exempt)</option>
          <option value="CGST_SGST">CGST + SGST (same state)</option>
          <option value="IGST">IGST (inter-state)</option>
        </select>
      </label>
      <p className="text-xs text-muted">
        {taxType === 'CGST_SGST'
          ? 'Intra-state supply, e.g. Delhi to Delhi. GST splits equally into CGST and SGST.'
          : taxType === 'IGST'
            ? 'Inter-state supply, e.g. Delhi to Bengaluru. Full GST rate charged as IGST.'
            : 'Choose this when under the ₹20L threshold, exempt, or exporting zero-rated services.'}
      </p>

      <label className="block text-sm">
        Invoice notes (optional)
        <textarea
          value={invoiceNotes}
          onChange={(e) => setInvoiceNotes(e.target.value)}
          rows={3}
          className={inputClass}
          placeholder="e.g. Payment is due within 7 days. Late payments may incur interest."
          disabled={saving}
        />
      </label>

      <label className="block text-sm">
        Thank-you note (optional)
        <textarea
          value={thankYouNote}
          onChange={(e) => setThankYouNote(e.target.value)}
          rows={2}
          className={inputClass}
          placeholder="e.g. Thank you for your business!"
          disabled={saving}
        />
      </label>

      <div className="pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save defaults'}
        </Button>
      </div>
    </form>
  );
}