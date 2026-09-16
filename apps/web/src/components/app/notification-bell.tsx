'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, CircleCheck, CircleX, Send, X } from 'lucide-react';
import { api } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { formatInrExact } from '@/lib/money';
import type { AppNotification, NotificationListResult } from '@payflow/types';

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function iconFor(type: AppNotification['type']) {
  switch (type) {
    case 'PAYMENT_RECEIVED':
      return <CircleCheck size={16} className="text-accent" aria-hidden />;
    case 'PAYMENT_FAILED':
      return <CircleX size={16} className="text-overdue" aria-hidden />;
    case 'INVOICE_SENT':
      return <Send size={16} className="text-pending" aria-hidden />;
  }
}

const boxClasses = 'rounded-full border border-line p-2 text-muted hover:text-ink transition-colors';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<NotificationListResult>('/api/notifications');
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 20000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDocumentClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocumentClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocumentClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const toggle = () => {
    setOpen((value) => !value);
    if (!open) void load();
  };

  const markAllRead = async () => {
    const previous = unreadCount;
    setUnreadCount(0);
    setNotifications((items) => items.map((item) => ({ ...item, read: true })));
    try {
      await api.post<{ unreadCount: number }>('/api/notifications/read');
    } catch {
      setUnreadCount(previous);
    }
  };

  const markRead = async (id: string) => {
    try {
      await api.post<{ unreadCount: number }>('/api/notifications/read', { ids: [id] });
      setNotifications((items) => items.map((item) => (item.id === id ? { ...item, read: true } : item)));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch {
      // non-fatal; badge refreshes on next poll
    }
  };

  const badge = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <div className="relative" ref={rootRef}>
      <button type="button" aria-label="Notifications" onClick={toggle} className={cn(boxClasses, 'relative')}>
        <Bell size={16} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
            {badge}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl border border-line bg-elevated shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            ) : null}
          </div>

          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-muted">Loading notifications…</p>
          ) : error && notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">Could not load notifications.</p>
          ) : notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">No notifications yet.</p>
          ) : (
            <ul className="max-h-80 divide-y divide-line overflow-y-auto">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <Link
                    href={notification.invoiceId ? `/app/invoices/${notification.invoiceId}/edit` : '/app/invoices'}
                    className={cn(
                      'flex items-start gap-3 px-4 py-3 transition-colors hover:bg-black/5',
                      !notification.read ? 'bg-accent/5' : '',
                    )}
                    onClick={() => {
                      if (!notification.read) void markRead(notification.id);
                    }}
                  >
                    <span className="mt-0.5">{iconFor(notification.type)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-ink">{notification.title}</span>
                        <span className="shrink-0 text-[11px] text-muted">{timeAgo(notification.createdAt)}</span>
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {notification.message}
                        {notification.amount != null ? ` · ${formatInrExact(notification.amount)}` : ''}
                      </span>
                    </span>
                    {!notification.read ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden /> : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-line px-4 py-2">
            <button type="button" onClick={() => setOpen(false)} className="flex w-full items-center justify-center gap-1 text-xs font-medium text-muted hover:text-ink">
              <X size={12} />
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}