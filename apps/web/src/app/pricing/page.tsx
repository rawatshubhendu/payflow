import type { Metadata } from 'next';
import { MarketingShell } from '@/components/marketing/marketing-shell';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'PayFlow pricing for Indian freelancers and agencies. Free starts at 5 invoices a month.',
};

const plans = [
  {
    name: 'Free',
    price: '₹0',
    detail: 'For freelancers getting started.',
    features: ['5 invoices a month', 'Unlimited customers', 'Razorpay payments', 'Email notifications', 'Basic analytics'],
    highlight: false,
  },
  {
    name: 'Pro',
    price: '₹999',
    detail: 'For growing freelancers.',
    features: ['50 invoices a month', 'Everything in Free', 'Custom branding', 'Payment reminders', 'Advanced analytics'],
    highlight: true,
  },
  {
    name: 'Business',
    price: '₹2,499',
    detail: 'For small studios and agencies.',
    features: ['200 invoices a month', 'Everything in Pro', 'Team access (soon)', 'Recurring invoices (soon)', 'Priority support'],
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-6xl px-6 pb-24 pt-14 text-center md:pt-20">
        <p className="text-sm tracking-[0.18em] text-muted">PRICING</p>
        <h1 className="mt-4 font-serif text-5xl tracking-tight md:text-6xl">Simple plans. No surprises.</h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          Start free. Upgrade when you outgrow your monthly invoices.
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-6 text-left ${
                plan.highlight ? 'border-accent/40 bg-accent/[0.03]' : 'border-line bg-elevated'
              }`}
            >
              {plan.highlight ? (
                <span className="absolute -top-2.5 right-5 rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-white">
                  Popular
                </span>
              ) : null}
              <p className="text-sm text-muted">{plan.name}</p>
              <p className="mt-3 font-serif text-5xl tracking-tight">
                {plan.price}
                <span className="text-base text-muted">/mo</span>
              </p>
              <p className="mt-2 text-sm text-muted">{plan.detail}</p>
              <ul className="mt-5 space-y-2.5 text-sm text-muted">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-0.5 text-accent">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="flex-1" />
              <div className="mt-7">
                <Button href="/register" variant={plan.highlight ? 'primary' : 'secondary'} className="w-full">
                  Start {plan.name}
                </Button>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-10 text-sm text-muted">
          Pay confidentially once Pro launches. All prices in INR, exclusive of taxes.
        </p>
      </section>
    </MarketingShell>
  );
}