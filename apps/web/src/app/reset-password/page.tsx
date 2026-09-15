'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api-client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post('/api/auth/reset-password', { email, code, password });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-6">
        <Link
          href="/forgot-password"
          className="group inline-flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          <span>Back</span>
        </Link>
      </div>

      <p className="text-[12px] font-semibold tracking-[0.22em] text-muted">PAYFLOW</p>
      <h1 className="mt-4 font-serif text-4xl">Create a new password</h1>
      <p className="mt-2 text-sm text-muted">Use the reset code from your email and pick a new password.</p>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50/60 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      {success ? (
        <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-sm text-emerald-700">
          Password updated. Taking you to login…
        </div>
      ) : (
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
            Reset code
            <input
              type="text"
              required
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-2 w-full rounded-xl border border-line bg-elevated px-3 py-3 outline-none focus:border-ink transition-colors"
              placeholder="6-digit code"
              disabled={loading}
            />
          </label>
          <label className="block text-sm">
            New password
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border border-line bg-elevated px-3 py-3 outline-none focus:border-ink transition-colors"
              placeholder="At least 8 characters"
              disabled={loading}
            />
          </label>
          <div className="pt-2">
            <Button className="w-full" type="submit">
              {loading ? 'Resetting…' : 'Reset password'}
            </Button>
          </div>
        </form>
      )}
    </main>
  );
}