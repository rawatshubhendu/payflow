'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api-client';
import type { AdminRole } from '@payflow/types';

const TABS = [
  { href: '/admin', label: 'Overview', match: 'exact' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/audit', label: 'Audit log' },
  { href: '/admin/errors', label: 'Errors' },
];

export function AdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    api
      .get<AdminRole>('/api/admin/role')
      .then((role) => {
        setIsAdmin(role.isAdmin);
        setChecking(false);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.code === 'UNAUTHORIZED') {
          router.replace('/login');
          return;
        }
        setIsAdmin(false);
        setChecking(false);
      });
  }, [router]);

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg text-sm text-muted">
        Checking access…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg px-6">
        <div className="max-w-md rounded-2xl border border-line bg-elevated p-8 text-center">
          <p className="font-serif text-2xl">Admins only</p>
          <p className="mt-2 text-sm text-muted">Your account does not have access to the operations console.</p>
          <Link href="/app" className="mt-6 inline-block text-sm font-medium text-accent">
            Back to app →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="border-b border-line bg-elevated">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="text-[12px] font-semibold tracking-[0.22em]">
            PAYFLOW · ADMIN
          </Link>
          <Link href="/app" className="text-sm text-muted transition-colors hover:text-ink">
            Back to app →
          </Link>
        </div>
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2">
          {TABS.map((tab) => {
            const active =
              tab.match === 'exact' ? pathname === tab.href : pathname?.startsWith(tab.href) ?? false;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                  active ? 'bg-ink text-white' : 'text-muted hover:text-ink'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="font-serif text-3xl tracking-tight">{title}</h1>
        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
}