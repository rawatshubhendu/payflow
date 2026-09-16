'use client';

import Link from 'next/link';
import { Sidebar } from '@/components/app/sidebar';
import { NotificationBell } from '@/components/app/notification-bell';
import { useAuth } from '@/lib/auth-context';

export function AppShell({
  title,
  description,
  action,
  backHref,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  backHref?: string;
  children: React.ReactNode;
}) {
  const { user, business } = useAuth();
  const userInitial = business?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'S';

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <div className="hidden md:block h-full">
        <Sidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-4 py-3 md:hidden shrink-0">
          <p className="text-[12px] font-semibold tracking-[0.22em]">PAYFLOW</p>
          <Link href="/app/invoices/new" className="text-sm font-medium">
            Create
          </Link>
        </div>
        <header className="flex items-center justify-end border-b border-line px-4 py-3 md:px-8 shrink-0">
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Link
              href="/app/settings"
              title={user?.email || 'Account settings'}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white hover:opacity-90 transition-opacity"
            >
              {userInitial}
            </Link>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 overflow-y-auto">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              {backHref ? (
                <Link
                  href={backHref}
                  className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-muted transition-colors hover:text-ink"
                >
                  ← Back
                </Link>
              ) : null}
              <h1 className="font-serif text-3xl tracking-tight">{title}</h1>
              {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
            </div>
            {action}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
