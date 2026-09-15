import { cn } from '@/lib/cn';

const tones: Record<string, string> = {
  DRAFT: 'bg-black/5 text-ink',
  SENT: 'bg-blue-50 text-blue-700',
  PENDING: 'bg-amber-50 text-amber-700',
  PAID: 'bg-emerald-50 text-emerald-700',
  OVERDUE: 'bg-red-50 text-red-700',
  CANCELLED: 'bg-neutral-100 text-muted',
  CREATED: 'bg-neutral-100 text-muted',
  AUTHORIZED: 'bg-blue-50 text-blue-700',
  CAPTURED: 'bg-emerald-50 text-emerald-700',
  FAILED: 'bg-red-50 text-red-700',
  REFUNDED: 'bg-amber-50 text-amber-700',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize',
        tones[status] ?? tones.DRAFT,
      )}
    >
      {status.toLowerCase()}
    </span>
  );
}