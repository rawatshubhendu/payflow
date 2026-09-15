import type { Metadata } from 'next';
import { MarketingShell } from '@/components/marketing/marketing-shell';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Features',
  description: 'Professional invoices, secure payment links, outstanding tracking and analytics for Indian freelancers.',
};

const groups = [
  {
    title: 'Invoicing',
    items: [
      ['Professional invoices', 'Clean, print-ready invoices with line items, tax (GST/IGST/CGST), discounts and due dates.'],
      ['Invoice PDF', 'Download a branded PDF for records, WhatsApp, or email.'],
      ['Invoice numbering', 'Automatic numbering with your own prefix, e.g. INV-2024-001.'],
    ],
  },
  {
    title: 'Getting paid',
    items: [
      ['Payment links', 'Share a secure page — your client pays with UPI, cards or net banking. No client login.'],
      ['Trusted gateway', 'Payments run through Razorpay with your own keys; you stay in control of settlement.'],
      ['Verified webhooks', 'A signed, idempotent webhook marks an invoice paid — not the browser.'],
    ],
  },
  {
    title: 'Staying on top',
    items: [
      ['Outstanding tracking', 'See collected, pending and overdue money at a glance.'],
      ['Analytics', 'Revenue over time, payment status donut and collection rate.'],
      ['Audit trail', 'A tamper-evident log of every money and customer event on your account.'],
    ],
  },
];

export default function FeaturesPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-6xl px-6 pb-24 pt-14 text-center md:pt-20">
        <p className="text-sm tracking-[0.18em] text-muted">FEATURES</p>
        <h1 className="mt-4 font-serif text-5xl tracking-tight md:text-6xl">Everything to get paid, nothing you do not need.</h1>
      </section>

      {groups.map((group) => (
        <section key={group.title} className="mx-auto max-w-6xl px-6 pb-16">
          <h2 className="font-serif text-3xl tracking-tight">{group.title}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {group.items.map(([title, body]) => (
              <article key={title} className="rounded-2xl border border-line bg-elevated p-6">
                <h3 className="text-lg font-medium">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
              </article>
            ))}
          </div>
        </section>
      ))}

      <section className="mx-auto max-w-4xl px-6 pb-28 pt-8 text-center">
        <h2 className="font-serif text-4xl md:text-5xl">Ready to send your first invoice?</h2>
        <div className="mt-8">
          <Button href="/register" className="px-6 py-3">
            Start Free
          </Button>
        </div>
      </section>
    </MarketingShell>
  );
}