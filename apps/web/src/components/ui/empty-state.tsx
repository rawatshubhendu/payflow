import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function EmptyState({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-elevated px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/5 text-muted">
        <FileText size={20} />
      </div>
      <h2 className="mt-4 font-serif text-2xl">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted">{body}</p>
      {href && cta ? (
        <div className="mt-6">
          <Button href={href}>{cta}</Button>
        </div>
      ) : null}
    </div>
  );
}
