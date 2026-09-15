'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api-client';
import { formatInrExact } from '@/lib/money';
import { useAuth } from '@/lib/auth-context';
import type { CustomerSummary, InvoiceDetail, LineItemInput, TaxType } from '@payflow/types';

const TAX_RATE_PRESETS = [0, 5, 12, 18, 28];

const EMPTY_ITEM: LineItemInput = { description: '', quantity: 1, unitPrice: 0 };

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusFourteenDaysISO(): string {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().slice(0, 10);
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function defaultItems(): LineItemInput[] {
  return [{ ...EMPTY_ITEM }];
}

export function InvoiceForm({ mode, invoiceId }: { mode: 'create' | 'edit'; invoiceId?: string }) {
  const router = useRouter();
  const { business } = useAuth();

  const [loading, setLoading] = useState(mode === 'edit');
  const [notEditable, setNotEditable] = useState<string | null>(null);

  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);

  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<LineItemInput[]>(defaultItems());
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(18);
  const [taxType, setTaxType] = useState<TaxType>('NONE');
  const [issueDate, setIssueDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(plusFourteenDaysISO());

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get<CustomerSummary[]>('/api/customers')
      .then(setCustomers)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load customers.'))
      .finally(() => setCustomersLoading(false));
  }, []);

  useEffect(() => {
    if (mode !== 'edit' || !invoiceId) return;
    api
      .get<InvoiceDetail>(`/api/invoices/${invoiceId}`)
      .then((invoice) => {
        if (invoice.status !== 'DRAFT') {
          setNotEditable(
            `This invoice is ${invoice.status.toLowerCase()} and can no longer be edited.`,
          );
          return;
        }
        setCustomerId(invoice.customer.id);
        setItems(invoice.items.map(({ description, quantity, unitPrice }) => ({ description, quantity, unitPrice })));
        setDiscount(invoice.discountAmount);
        setTaxRate(invoice.taxRate);
        setTaxType(invoice.taxType);
        setIssueDate(invoice.issueDate ? invoice.issueDate.slice(0, 10) : todayISO());
        setDueDate(invoice.dueDate ? invoice.dueDate.slice(0, 10) : plusFourteenDaysISO());
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load invoice.'))
      .finally(() => setLoading(false));
  }, [mode, invoiceId]);

  const totals = useMemo(() => {
    const subtotal = roundMoney(
      items.reduce((sum, item) => sum + roundMoney(item.quantity * item.unitPrice), 0),
    );
    const discountAmount = roundMoney(Math.min(Math.max(discount, 0), subtotal));
    const taxableAmount = roundMoney(subtotal - discountAmount);
    const taxAmount = roundMoney(taxableAmount * (taxRate / 100));
    const cgst = taxType === 'CGST_SGST' ? roundMoney(taxAmount / 2) : 0;
    const sgst = taxType === 'CGST_SGST' ? roundMoney(taxAmount - cgst) : 0;
    const igst = taxType === 'IGST' ? taxAmount : 0;
    const totalAmount = roundMoney(taxableAmount + taxAmount);
    return { subtotal, discountAmount, taxableAmount, taxAmount, cgst, sgst, igst, totalAmount };
  }, [items, discount, taxRate, taxType]);

  const updateItem = (index: number, patch: Partial<LineItemInput>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const addItem = () => setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSaving(true);

    const payload = {
      customerId,
      items,
      discountAmount: discount,
      taxRate,
      taxType,
      issueDate: issueDate || undefined,
      dueDate: dueDate || undefined,
    };

    try {
      if (mode === 'edit' && invoiceId) {
        await api.patch<InvoiceDetail>(`/api/invoices/${invoiceId}`, payload);
      } else {
        await api.post<InvoiceDetail>('/api/invoices', payload);
      }
      router.push('/app/invoices');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.fieldErrors ?? {});
      } else {
        setError(mode === 'edit' ? 'Failed to update invoice.' : 'Failed to create invoice.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted">Loading invoice...</p>;
  }

  if (notEditable) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 text-sm text-amber-800">
        {notEditable}
        <div className="mt-4">
          <Button href="/app/invoices">Back to Invoices</Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-4 rounded-2xl border border-line bg-elevated p-6">
        {customersLoading ? (
          <p className="text-sm text-muted">Loading customers...</p>
        ) : customers.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-sm text-amber-800">
            You need a customer before creating an invoice.{' '}
            <a href="/app/customers" className="font-medium underline">
              Add a customer
            </a>
          </div>
        ) : (
          <label className="block text-sm">
            Customer
            <select
              required
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-line bg-elevated px-3 py-3 outline-none transition-colors focus:border-ink"
            >
              <option value="" disabled>
                Select a customer
              </option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                  {customer.company ? ` — ${customer.company}` : ''}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <label className="block text-sm">
            Invoice number
            <input
              className="mt-2 w-full rounded-xl border border-line bg-elevated px-3 py-3 text-muted"
              value={`${business?.invoicePrefix || 'INV-'}auto`}
              readOnly
            />
          </label>
          <label className="block text-sm">
            Issue date
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="mt-2 w-full rounded-xl border border-line bg-elevated px-3 py-3 outline-none transition-colors focus:border-ink"
            />
          </label>
          <label className="block text-sm">
            Due date
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-2 w-full rounded-xl border border-line bg-elevated px-3 py-3 outline-none transition-colors focus:border-ink"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="pb-3 font-medium">Description</th>
                <th className="pb-3 font-medium">Qty</th>
                <th className="pb-3 font-medium">Price</th>
                <th className="pb-3 text-right font-medium">Total</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-t border-line">
                  <td className="py-3">
                    <input
                      required
                      value={item.description}
                      onChange={(e) => updateItem(index, { description: e.target.value })}
                      className="w-full rounded-lg border border-line px-3 py-2 outline-none transition-colors focus:border-ink"
                      placeholder="Website development"
                      disabled={saving}
                    />
                  </td>
                  <td className="py-3">
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(index, { quantity: Number(e.target.value) || 0 })}
                      className="w-20 rounded-lg border border-line px-3 py-2 outline-none transition-colors focus:border-ink"
                      disabled={saving}
                    />
                  </td>
                  <td className="py-3">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, { unitPrice: Number(e.target.value) || 0 })}
                      className="w-28 rounded-lg border border-line px-3 py-2 outline-none transition-colors focus:border-ink"
                      placeholder="25000"
                      disabled={saving}
                    />
                  </td>
                  <td className="py-3 text-right text-muted">
                    {formatInrExact(roundMoney(item.quantity * item.unitPrice))}
                  </td>
                  <td className="py-3 text-right">
                    {items.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-sm text-muted transition-colors hover:text-red-600"
                      >
                        Remove
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button type="button" onClick={addItem} className="text-sm font-medium text-accent">
          + Add line item
        </button>
      </div>

      <aside className="h-fit rounded-2xl border border-line bg-elevated p-6">
        <label className="block text-sm">
          Tax rate (%)
          <input
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={taxRate}
            onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
            className="mt-2 w-full rounded-xl border border-line bg-elevated px-3 py-3 outline-none transition-colors focus:border-ink"
            disabled={saving}
          />
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {TAX_RATE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setTaxRate(preset)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                taxRate === preset
                  ? 'border-ink bg-ink text-white'
                  : 'border-line text-muted hover:text-ink'
              }`}
            >
              {preset}%
            </button>
          ))}
        </div>

        <label className="mt-4 block text-sm">
          Tax type
          <select
            value={taxType}
            onChange={(e) => setTaxType(e.target.value as TaxType)}
            className="mt-2 w-full rounded-xl border border-line bg-elevated px-3 py-3 outline-none transition-colors focus:border-ink"
            disabled={saving}
          >
            <option value="NONE">No tax (unregistered / exempt)</option>
            <option value="CGST_SGST">CGST + SGST (same state)</option>
            <option value="IGST">IGST (inter-state)</option>
          </select>
        </label>
        <p className="mt-2 text-xs text-muted">
          {taxType === 'CGST_SGST'
            ? 'Intra-state supply, e.g. Delhi to Delhi. GST splits equally into CGST and SGST.'
            : taxType === 'IGST'
              ? 'Inter-state supply, e.g. Delhi to Bengaluru. Full GST rate charged as IGST.'
              : 'Choose this when under the ₹20L threshold, exempt, or exporting zero-rated services.'}
        </p>

        <label className="mt-4 block text-sm">
          Discount (₹)
          <input
            type="number"
            min={0}
            step={0.01}
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value) || 0)}
            className="mt-2 w-full rounded-xl border border-line bg-elevated px-3 py-3 outline-none transition-colors focus:border-ink"
            disabled={saving}
          />
        </label>

        <div className="mt-5 border-t border-line pt-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Subtotal</span>
            <span>{formatInrExact(totals.subtotal)}</span>
          </div>
          {totals.discountAmount > 0 ? (
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-muted">Discount</span>
              <span>−{formatInrExact(totals.discountAmount)}</span>
            </div>
          ) : null}
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted">Taxable value</span>
            <span>{formatInrExact(totals.taxableAmount)}</span>
          </div>
          {taxType === 'CGST_SGST' ? (
            <>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-muted">CGST ({((taxRate / 100) * 50).toFixed(2)}%)</span>
                <span>{formatInrExact(totals.cgst)}</span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-muted">SGST ({((taxRate / 100) * 50).toFixed(2)}%)</span>
                <span>{formatInrExact(totals.sgst)}</span>
              </div>
            </>
          ) : taxType === 'IGST' ? (
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-muted">IGST ({taxRate}%)</span>
              <span>{formatInrExact(totals.igst)}</span>
            </div>
          ) : (
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-muted">Tax</span>
              <span>{formatInrExact(0)}</span>
            </div>
          )}
          <div className="mt-5 flex justify-between font-serif text-2xl">
            <span>Total</span>
            <span>{formatInrExact(totals.totalAmount)}</span>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50/70 p-3 text-sm text-red-700">
            <p>{error}</p>
            {Object.keys(fieldErrors).length > 0 ? (
              <ul className="mt-1 list-inside list-disc text-xs">
                {Object.entries(fieldErrors).map(([path, messages]) => (
                  <li key={path}>
                    {path}: {messages.join(', ')}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-2">
          <Button type="submit" className="w-full" disabled={saving || customers.length === 0}>
            {saving ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Invoice'}
          </Button>
        </div>
      </aside>
    </form>
  );
}