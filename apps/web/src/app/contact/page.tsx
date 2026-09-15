import type { Metadata } from 'next';
import { MarketingShell } from '@/components/marketing/marketing-shell';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with the PayFlow team.',
};

export default function ContactPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-3xl px-6 pb-28 pt-16 text-center md:pt-24">
        <p className="text-sm tracking-[0.18em] text-muted">CONTACT</p>
        <h1 className="mt-4 font-serif text-5xl tracking-tight md:text-6xl">Talk to a human</h1>
        <p className="mx-auto mt-4 max-w-lg text-muted">
          Questions, feedback, or a feature you need? We read everything and reply fast.
        </p>
        <div className="mt-10">
          <Button href="mailto:programmer935@gmail.com" className="px-6 py-3">
            Email us
          </Button>
        </div>
        <p className="mt-6 text-sm text-muted">
          Prefer steps? Create an account, then go to Settings → Notifications to pick how you hear from us.
        </p>
      </section>
    </MarketingShell>
  );
}