import Link from 'next/link';
import { Button } from '@/components/ui/button';

const NAV = [
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/security', label: 'Security' },
  { href: '/contact', label: 'Contact' },
];

export function MarketingHeader() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
      <Link href="/" className="text-[12px] font-semibold tracking-[0.22em]">
        PAYFLOW
      </Link>
      <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="transition-colors hover:text-ink"
          >
            {item.label}
          </Link>
        ))}
        <Link href="/login" className="transition-colors hover:text-ink">
          Login
        </Link>
      </nav>
      <Button href="/register">Start Free</Button>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted md:flex-row">
        <div className="flex items-center gap-6">
          <Link href="/legal/terms" className="transition-colors hover:text-ink">
            Terms
          </Link>
          <Link href="/legal/privacy" className="transition-colors hover:text-ink">
            Privacy
          </Link>
          <Link href="/contact" className="transition-colors hover:text-ink">
            Contact
          </Link>
        </div>
        <p className="text-xs">© {new Date().getFullYear()} PayFlow. Made for Indian freelancers.</p>
      </div>
    </footer>
  );
}

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}