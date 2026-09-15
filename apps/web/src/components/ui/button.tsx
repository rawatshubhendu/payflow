import Link from 'next/link';
import { cn } from '@/lib/cn';

type Props = {
  href?: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
  type?: 'button' | 'submit';
  onClick?: () => void;
  disabled?: boolean;
};

export function Button({ href, children, variant = 'primary', className, type = 'button', onClick, disabled }: Props) {
  const styles = {
    primary: 'bg-ink text-white !text-white hover:bg-black',
    secondary: 'border border-line bg-elevated text-ink hover:bg-white',
    ghost: 'text-ink hover:bg-black/5',
  }[variant];

  const classNames = cn(
    'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors',
    'disabled:pointer-events-none disabled:opacity-60',
    styles,
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classNames}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classNames}>
      {children}
    </button>
  );
}
