import { Button } from '@/components/ui/button';

export function ProFeatureCard({
  title,
  description,
  cta = 'Upgrade to Pro',
}: {
  title: string;
  description: string;
  cta?: string;
}) {
  return (
    <div className="flex min-h-56 flex-col items-start justify-center rounded-2xl border border-line bg-elevated p-5">
      <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent">
        Pro feature
      </span>
      <h3 className="mt-3 font-serif text-xl tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-muted">{description}</p>
      <Button href="/app/billing" className="mt-5">
        {cta}
      </Button>
    </div>
  );
}