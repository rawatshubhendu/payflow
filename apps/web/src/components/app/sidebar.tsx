'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  CreditCard,
  FileText,
  LayoutDashboard,
  Settings,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/cn';

import { useAuth } from '@/lib/auth-context';

const nav = [
  { href: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/invoices', label: 'Invoices', icon: FileText },
  { href: '/app/customers', label: 'Customers', icon: Users },
  { href: '/app/payments', label: 'Payments', icon: CreditCard },
  { href: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/app/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { business, logout } = useAuth();

  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-line bg-elevated overflow-hidden">
      <div className="px-5 py-6 shrink-0">
        <p className="text-[11px] font-semibold tracking-[0.22em] text-muted">PAYFLOW</p>
        <p className="mt-1 text-sm text-muted">Payment operating system</p>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 overflow-y-auto">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                active ? 'bg-ink text-white font-medium' : 'text-muted hover:bg-black/5 hover:text-ink',
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-2xl border border-line p-4 shrink-0">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-muted">WORKSPACE</p>
        <p className="mt-2 text-sm font-medium truncate">{business?.name || 'My Business'}</p>
        <p className="mt-0.5 text-xs text-muted">Free plan</p>
        <div className="mt-3 flex items-center justify-between">
          <Link href="/app/billing" className="text-sm font-medium text-accent">
            Upgrade
          </Link>
          <button
            type="button"
            onClick={async () => {
              await logout();
              router.push('/');
            }}
            className="text-xs text-muted hover:text-ink transition-colors"
          >
            Log out
          </button>
        </div>
      </div>
    </aside>
  );
}

