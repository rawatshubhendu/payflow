import type { Metadata } from 'next';
import { MarketingShell } from '@/components/marketing/marketing-shell';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  robots: { index: true, follow: true },
};

const sections = [
  { title: 'What we collect', body: `Account data (name, email, password hash), business profile (name, branding), billing and customer data you enter, and payment events that your gateway reports to us. We never see or store your gateway secret in plain text after you save it.` },
  { title: 'How we use it', body: `To operate the app: authenticate you, create invoices, open payment orders, reconcile webhooks, send payment notifications, and keep an audit trail. We only use analytics aggregates to improve the product.` },
  { title: 'What we share', body: `Your gateway (Razorpay) receives order details to charge your client; your email provider receives notification emails. We do not sell personal data.` },
  { title: 'Retention', body: `Financial records (invoices, payments, audit log) are retained per your business and statutory record-keeping needs. On account deletion we erase personal data within 30 days, except records legally required to keep.` },
  { title: 'Security', body: `Encryption in transit (TLS), bcrypt password hashing, AES-256-GCM encryption of gateway secrets, tenant-scoped queries, rate limiting and signed webhooks.` },
  { title: 'Your rights', body: `Export or delete your data on request via programmer935@gmail.com. You can also delete your account from Settings.` },
  { title: 'Cookies', body: `A session cookie is used when you are logged in. We do not run third-party ad or tracking cookies.` },
  { title: 'Changes', body: `Updates will appear on this page with a revised date. Material changes are emailed to you.` },
  { title: 'Contact', body: `Privacy questions: programmer935@gmail.com.` },
];

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-3xl px-6 pb-24 pt-14 md:pt-20">
        <p className="text-sm tracking-[0.18em] text-muted">LEGAL</p>
        <h1 className="mt-4 font-serif text-5xl tracking-tight">Privacy Policy</h1>
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