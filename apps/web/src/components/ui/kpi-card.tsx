import { cn } from '@/lib/cn';

type Props = {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'good' | 'warn' | 'bad';
};

export function KpiCard({ label, value, hint, tone = 'default' }: Props) {
  return (
    <article className="rounded-2xl border border-line bg-elevated p-5">
      <p className="text-sm text-muted">{label}</p>
      <p
        className={cn(
          'mt-3 font-serif text-3xl tracking-tight',
          tone === 'good' && 'text-accent',
          tone === 'warn' && 'text-pending',
          tone === 'bad' && 'text-overdue',
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
    </article>
  );
}
