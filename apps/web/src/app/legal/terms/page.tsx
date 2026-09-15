import type { Metadata } from 'next';
import { MarketingShell } from '@/components/marketing/marketing-shell';

export const metadata: Metadata = {
  title: 'Terms of Service',
  robots: { index: true, follow: true },
};

const sections = [
  { title: '1. The service', body: `PayFlow provides invoicing, payment-link and outstanding-tracking software for freelancers and small businesses. You use it at your own risk, within your jurisdiction's laws.` },
  { title: '2. Accounts', body: `You must provide accurate registration details, keep your password secure, and only operate a business you own or are authorised to operate. Email verification is required to use paid features.` },
  { title: '3. Payments', body: `Payment processing is provided by a third-party gateway (Razorpay) under your own gateway account. PayFlow initiates, records and reconciles charges submitted through its public invoice pages. Settlement, refunds and disputes follow the gateway's terms. You remain responsible for correct charges, tax (including GST) and any client refunds.` },
  { title: '4. Acceptable use', body: `Do not attempt to abuse, reverse-engineer, scrape protected areas, or circumvent limits and rate limits of the service.` },
  { title: '5. Your content', body: `You retain ownership of the invoices, customers and data you enter. You grant PayFlow the right to store, transmit and process that data solely to operate the service for you.` },
  { title: '6. Plan limits', body: `Free, Pro and Business plans set monthly invoice limits. Invoices above your plan limit cannot be created until you upgrade. We may change limits or pricing with notice on this page.` },
  { title: '7. Suspension & termination', body: `We may suspend an account that violates these terms or presents legal or security risk, and will remove data per our Privacy Policy. You may stop using PayFlow at any time; we will export your data on request within 30 days.` },
  { title: '8. Limitation of liability', body: `To the maximum extent permitted by law, PayFlow is not liable for indirect, incidental or consequential damages, including lost revenue, arising from the service.` },
  { title: '9. Changes', body: `Material changes appear here with a dated notice above. Continued use after changes binds you to the updated terms.` },
  { title: '10. Contact', body: `Questions about these terms: programmer935@gmail.com.` },
];

export default function TermsPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-3xl px-6 pb-24 pt-14 md:pt-20">
        <p className="text-sm tracking-[0.18em] text-muted">LEGAL</p>
        <h1 className="mt-4 font-serif text-5xl tracking-tight">Terms of Service</h1>
        <p className="mt-3 text-sm text-muted">Last updated: 15 September 2026</p>
        <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="font-serif text-2xl tracking-tight">{section.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{section.body}</p>
            </section>
          ))}
        </div>
      </section>
    </MarketingShell>
  );
}