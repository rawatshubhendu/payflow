'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, ApiError } from '@/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ email, password });
      router.push('/app/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Unable to log in. Please check your network and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      {/* Back to Home Button */}
      <div className="mb-6">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          <span>Back to home</span>
        </Link>
      </div>

      <p className="text-[12px] font-semibold tracking-[0.22em] text-muted">PAYFLOW</p>
      <h1 className="mt-4 font-serif text-4xl">Welcome back</h1>
      <p className="mt-2 text-sm text-muted">Log in to manage your invoices and collections.</p>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50/60 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <label className="block text-sm">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full rounded-xl border border-line bg-elevated px-3 py-3 outline-none focus:border-ink transition-colors"
            placeholder="you@studio.in"
            disabled={loading}
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full rounded-xl border border-line bg-elevated px-3 py-3 outline-none focus:border-ink transition-colors"
            disabled={loading}
          />
        </label>
        <div className="pt-2">
          <Button className="w-full" type="submit">
            {loading ? 'Logging in...' : 'Log in'}
          </Button>
        </div>
      </form>

      <p className="mt-4 text-sm text-muted">
        <Link href="/forgot-password" className="hover:text-ink transition-colors">
          Forgot your password?
        </Link>
      </p>

      <p className="mt-6 text-sm text-muted">
        No account yet?{' '}
        <Link href="/register" className="font-medium text-ink underline underline-offset-4">
          Create one
        </Link>
      </p>
    </main>
  );
}
