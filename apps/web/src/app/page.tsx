import Link from 'next/link';
import { Button } from '@/components/ui/button';

const features = [
  {
    title: 'Professional invoices',
    body: 'Create clean invoices with line items, tax, and due dates in seconds.',
  },
  {
    title: 'Payment links',
    body: 'Send a secure page. Your client pays with UPI or cards. You do not chase.',
  },
  {
    title: 'Outstanding tracking',
    body: 'See collected, pending, and overdue money without spreadsheets.',
  },
  {
    title: 'Reminders later',
    body: 'The first version collects payments. Automated reminders come next.',
  },
];

const plans = [
  {
    name: 'Free',
    price: '₹0',
    detail: '5 invoices / month',
  },
  {
    name: 'Pro',
    price: '₹999',
    detail: 'Unlimited invoices, PDFs, reminders, analytics',
  },
  {
    name: 'Business',
    price: '₹2,499',
    detail: 'Team, recurring invoices, WhatsApp, priority support',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-[12px] font-semibold tracking-[0.22em]">
          PAYFLOW
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
          <Link href="/#features">Features</Link>
          <Link href="/#pricing">Pricing</Link>
          <Link href="/login">Login</Link>
        </nav>
        <Button href="/register">Start Free</Button>
      </header>

      <section className="mx-auto max-w-4xl px-6 pb-20 pt-10 text-center md:pt-20">
        <p className="text-sm tracking-[0.18em] text-muted">FOR INDIAN FREELANCERS & AGENCIES</p>
        <h1 className="mt-5 font-serif text-5xl leading-[1.05] tracking-tight md:text-7xl">
          Get Paid. Without Chasing.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
          Create professional invoices, send payment links, track outstanding payments, and
          automate reminders.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button href="/register" className="px-6 py-3">
            Start Free
          </Button>
          <Button href="/#how" variant="secondary" className="px-6 py-3">
            See How It Works
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="rounded-[28px] border border-line bg-elevated p-4 shadow-[0_20px_80px_rgba(22,21,19,0.06)] md:p-8">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              ['Total revenue', '₹0'],
              ['Collected', '₹0'],
              ['Pending', '₹0'],
              ['Overdue', '₹0'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-line p-5 text-left">
                <p className="text-sm text-muted">{label}</p>
                <p className="mt-3 font-serif text-3xl">{value}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-muted">
            Your dashboard stays quiet until the first invoice is paid.
          </p>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-5xl px-6 pb-24">
        <h2 className="font-serif text-4xl">Invoice. Send. Collect.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ['1. Create', 'Add a customer, line items, tax, and a due date.'],
            ['2. Send a link', 'Share a public payment page. No login required for the client.'],
            ['3. Get paid', 'A verified gateway webhook marks the invoice paid. Not the browser.'],
          ].map(([title, body]) => (
            <article key={title} className="rounded-2xl border border-line bg-elevated p-6">
              <h3 className="font-serif text-2xl">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-5xl px-6 pb-24">
        <h2 className="font-serif text-4xl">Built for getting paid, not for clutter.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-2xl border border-line bg-elevated p-6">
              <h3 className="text-lg font-medium">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-5xl px-6 pb-24">
        <h2 className="font-serif text-4xl">Simple pricing</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.name} className="rounded-2xl border border-line bg-elevated p-6">
              <p className="text-sm text-muted">{plan.name}</p>
              <p className="mt-3 font-serif text-4xl">{plan.price}</p>
              <p className="mt-2 text-sm text-muted">{plan.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-28 text-center">
        <h2 className="font-serif text-4xl md:text-5xl">Stop chasing. Start collecting.</h2>
        <p className="mt-4 text-muted">Early access: Pro at ₹999/month for the first 20 businesses.</p>
        <div className="mt-8">
          <Button href="/register" className="px-6 py-3">
            Start Free
          </Button>
        </div>
      </section>
    </div>
  );
}
