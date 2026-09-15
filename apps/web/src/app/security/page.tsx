import type { Metadata } from 'next';
import { MarketingShell } from '@/components/marketing/marketing-shell';

export const metadata: Metadata = {
  title: 'Security',
  description: 'How PayFlow protects your data and your customers\' payments.',
};

const controls = [
  {
    title: 'Your keys, your money',
    body: 'Payments settle into your own Razorpay account. Key secrets you add are encrypted at rest with AES-256-GCM and never shown again — not even to your own browser.',
  },
  {
    title: 'Signed webhooks, not browser claims',
    body: 'An invoice is marked paid only after a signature-verified webhook from the payment gateway says so. Idempotency keys stop duplicate credit.',
  },
  {
    title: 'Tenant isolation',
    body: 'Every query is scoped to your business. Your invoices, customers and payments are never visible to another account.',
  },
  {
    title: 'Hardened sessions',
    body: 'Passwords are bcrypt-hashed, email verification and password reset use expiring one-time codes, and sessions use HTTP-only, SameSite cookies.',
  },
  {
    title: 'Rate limiting & abuse protection',
    body: 'Auth, payment creation and webhooks are rate-limited per IP. Shoot everything through HTTPS in production.',
  },
  {
    title: 'Full audit trail',
    body: 'Order creation, captures, failures and every business change is recorded in an append-only audit log.',
  },
];

export default function SecurityPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-6xl px-6 pb-24 pt-14 text-center md:pt-20">
        <p className="text-sm tracking-[0.18em] text-muted">SECURITY</p>
        <h1 className="mt-4 font-serif text-5xl tracking-tight md:text-6xl">Money moves should feel safe.</h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          We built payments the way we would want them handled: verified, isolated, and audited.
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {controls.map((control) => (
            <article key={control.title} className="rounded-2xl border border-line bg-elevated p-6 text-left">
              <h2 className="text-lg font-medium">{control.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{control.body}</p>
            </article>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}