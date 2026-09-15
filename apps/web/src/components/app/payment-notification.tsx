'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api-client';
import { formatInrExact } from '@/lib/money';
import type { InvoiceSummary } from '@payflow/types';

type Notice = { invoiceNumber: string; amount: number } | null;

export function usePaymentNotification(): { notice: Notice; dismiss: () => void } {
  const [notice, setNotice] = useState<Notice>(null);
  const seen = useRef<Set<string>>(new Set());

  const check = useCallback(async (notify: boolean) => {
    try {
      const list = await api.get<InvoiceSummary[]>('/api/invoices');
      for (const item of list) {
        if (item.status !== 'PAID') continue;
        if (seen.current.has(item.id)) continue;
        seen.current.add(item.id);
        if (notify) {
          setNotice({ invoiceNumber: item.invoiceNumber, amount: item.totalAmount });
          break;
        }
      }
    } catch {
      // ignore polling errors
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    void check(false).then(() => {
      if (cancelled) return;
      interval = setInterval(() => void check(true), 15000);
    });

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [check]);

  const dismiss = useCallback(() => setNotice(null), []);
  return { notice, dismiss };
}

export function PaymentNotificationBanner() {
  const { notice, dismiss } = usePaymentNotification();
  if (!notice) return null;
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50/80 px-4 py-3">
      <p className="text-sm text-green-800">
        Payment received for <strong>{notice.invoiceNumber}</strong> · {formatInrExact(notice.amount)}
      </p>
      <button type="button" onClick={dismiss} className="shrink-0 text-sm font-medium text-green-700 hover:text-green-900">
        Dismiss
      </button>
    </div>
  );
}