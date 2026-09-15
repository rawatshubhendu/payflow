'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api-client';
import { formatInrExact } from '@/lib/money';
import { loadRazorpayCheckout, openRazorpayCheckout } from '@/lib/razorpay-checkout';
import type { PaymentOrderResult, PublicInvoice } from '@payflow/types';

type PayState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ready'; invoice: PublicInvoice }
  | { phase: 'ordering'; invoice: PublicInvoice }
  | { phase: 'starting-checkout'; invoice: PublicInvoice }
  | { phase: 'checkout-error'; message: string; invoice: PublicInvoice }
  | { phase: 'confirming'; invoice: PublicInvoice }
  | { phase: 'confirm-timeout'; invoice: PublicInvoice };

export default function PublicPayPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<PayState>({ phase: 'loading' });

  useEffect(() => {
    void params.then(({ token: t }) => setToken(t));
  }, [params]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setState({ phase: 'loading' });
    void api
      .get<PublicInvoice>(`/api/public/invoices/${token}`)
      .then((invoice) => {
        if (!cancelled) setState({ phase: 'ready', invoice });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            phase: 'error',
            message: err instanceof ApiError ? err.message : 'Could not load this invoice.',
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const startOrder = async (invoice: PublicInvoice) => {
    if (!token) return;
    setState({ phase: 'ordering', invoice });
    try {
      const order = await api.post<PaymentOrderResult>(`/api/public/invoices/${token}/order`);
      await openCheckout(invoice, order);
    } catch (err) {
      setState({
        phase: 'checkout-error',
        message: err instanceof ApiError ? err.message : 'Could not start this payment.',
        invoice,
      });
    }
  };

  const openCheckout = async (invoice: PublicInvoice, order: PaymentOrderResult) => {
    setState({ phase: 'starting-checkout', invoice });
    const key = order.keyId;
    if (!key) {
      setState({ phase: 'checkout-error', message: 'Payment setup is incomplete.', invoice });
      return;
    }
    try {
      await loadRazorpayCheckout();
      openRazorpayCheckout({
        key,
        order_id: order.orderId,
        amount: Math.round(order.amount * 100),
        currency: order.currency,
        name: invoice.businessName,
        description: invoice.invoiceNumber,
        theme: { color: '#4f46e5' },
        prefill: { name: 'PayFlow customer' },
        modal: {
          ondismiss: () => setState({ phase: 'ready', invoice }),
        },
        handler: async () => {
          setState({ phase: 'confirming', invoice });
          for (let attempt = 0; attempt < 12; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, 2500));
            try {
              const refreshed = await api.get<PublicInvoice>(`/api/public/invoices/${token!}`);
              if (refreshed.status === 'PAID' || refreshed.status === 'CANCELLED') {
                setState({ phase: 'ready', invoice: refreshed });
                return;
              }
            } catch {
              // keep waiting; the webhook will settle the invoice
            }
          }
          setState({ phase: 'confirm-timeout', invoice });
        },
      });
    } catch (err) {
      setState({
        phase: 'checkout-error',
        message: err instanceof Error ? err.message : 'Could not load the payment widget.',
        invoice,
      });
    }
  };

  const busy = state.phase === 'ordering' || state.phase === 'starting-checkout';
  const busyLabel = state.phase === 'ordering' ? 'Preparing payment...' : 'Opening secure payment...';

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <p className="text-[12px] font-semibold tracking-[0.22em]">PAYFLOW</p>
      <section className="mt-8 rounded-3xl border border-line bg-elevated p-8">
        {state.phase === 'loading' ? <CenterNote text="Loading invoice..." /> : null}
        {state.phase === 'error' ? (
          <CenterNote title="Invoice not available" text={state.message} />
        ) : null}

        {state.phase === 'ready' ? (
          <InvoiceCard invoice={state.invoice} onPay={() => void startOrder(state.invoice)} busy={false} busyLabel="" />
        ) : null}
        {state.phase === 'ordering' || state.phase === 'starting-checkout' ? (
          <InvoiceCard invoice={state.invoice} onPay={() => undefined} busy={busy} busyLabel={busyLabel} />
        ) : null}
        {state.phase === 'confirming' ? (
          <div className="text-center">
            <h1 className="mt-3 font-serif text-3xl">Payment received</h1>
            <p className="mt-3 text-sm text-muted">Confirming your payment with the business...</p>
          </div>
        ) : null}
        {state.phase === 'confirm-timeout' ? (
          <div className="text-center">
            <h1 className="mt-3 font-serif text-3xl">Payment received</h1>
            <p className="mt-3 text-sm text-muted">
              Your payment is being confirmed. It will be reflected here and in the dashboard shortly.
            </p>
            <Button
              className="mt-8 w-full"
              variant="secondary"
              onClick={() => setState({ phase: 'ready', invoice: state.invoice })}
            >
              Check payment status
            </Button>
          </div>
        ) : null}
        {state.phase === 'checkout-error' ? (
          <>
            <InvoiceCard invoice={state.invoice} onPay={() => undefined} busy={false} busyLabel="" />
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50/70 p-3 text-center text-sm text-red-700">
              {state.message}
            </p>
            <Button className="mt-3 w-full" variant="secondary" onClick={() => setState({ phase: 'ready', invoice: state.invoice })}>
              Try again
            </Button>
          </>
        ) : null}
      </section>
    </main>
  );
}

function CenterNote({ title, text }: { title?: string; text: string }) {
  return (
    <div className="text-center">
      {title ? <h1 className="mt-3 font-serif text-2xl">{title}</h1> : null}
      <p className="mt-3 text-sm text-muted">{text}</p>
    </div>
  );
}

function InvoiceCard({
  invoice,
  onPay,
  busy,
  busyLabel,
}: {
  invoice: PublicInvoice;
  onPay: () => void;
  busy: boolean;
  busyLabel: string;
}) {
  if (invoice.status === 'PAID') {
    return (
      <div className="text-center">
        <h1 className="mt-3 font-serif text-3xl">Paid</h1>
        <p className="mt-3 text-sm text-muted">
          {invoice.invoiceNumber} has already been paid in full. Thank you!
        </p>
      </div>
    );
  }

  if (invoice.status === 'CANCELLED') {
    return (
      <div className="text-center">
        <h1 className="mt-3 font-serif text-3xl">Invoice closed</h1>
        <p className="mt-3 text-sm text-muted">{invoice.invoiceNumber} is no longer open for payment.</p>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-muted">{invoice.businessName}</p>
      <h1 className="mt-2 font-serif text-2xl">{invoice.invoiceNumber}</h1>
      <p className="mt-1 text-sm text-muted">
        {invoice.dueDate
          ? `Due ${new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
          : 'No due date'}
        {invoice.status === 'OVERDUE' ? ' · Overdue' : ''}
      </p>

      <ul className="mt-6 divide-y divide-line border-y border-line">
        {invoice.items.map((item, index) => (
          <li key={index} className="flex items-start justify-between gap-4 py-3 text-sm">
            <span>{item.description}</span>
            <span className="whitespace-nowrap text-right text-muted">
              {item.quantity} × {formatInrExact(item.unitPrice)}
              <span className="ml-3 font-medium text-ink">{formatInrExact(item.lineTotal)}</span>
            </span>
          </li>
        ))}
      </ul>

      <dl className="mt-4 space-y-1 text-sm text-muted">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd>{formatInrExact(invoice.subtotal)}</dd>
        </div>
        {invoice.discountAmount > 0 ? (
          <div className="flex justify-between">
            <dt>Discount</dt>
            <dd>− {formatInrExact(invoice.discountAmount)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between">
          <dt>
            Tax ({invoice.taxType === 'IGST' ? `IGST ${invoice.taxRate}%` : `GST ${invoice.taxRate}%`})
          </dt>
          <dd>{formatInrExact(invoice.taxAmount)}</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-2 text-base font-semibold text-ink">
          <dt>Total</dt>
          <dd>{formatInrExact(invoice.totalAmount)}</dd>
        </div>
      </dl>

      <Button className="mt-8 w-full" onClick={onPay} disabled={busy}>
        {busy ? busyLabel : 'Pay now'}
      </Button>
      <p className="mt-4 text-center text-xs text-muted">Secure payment · UPI · Cards</p>
    </>
  );
}