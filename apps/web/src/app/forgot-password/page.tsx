'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post('/api/auth/forgot-password', { email });
      setSubmitted(true);
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
          href="/login"
          className="group inline-flex items-center gap-2 text-sm text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          <span>Back to login</span>
        </Link>
      </div>

      <p className="text-[12px] font-semibold tracking-[0.22em] text-muted">PAYFLOW</p>
      <h1 className="mt-4 font-serif text-4xl">Reset your password</h1>
      <p className="mt-2 text-sm text-muted">
        Enter your account email and we will send you a 6-digit reset code.
      </p>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50/60 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      {submitted ? (
        <div className="mt-8 rounded-2xl border border-line bg-elevated p-6">
          <p className="text-sm">If an account exists for <strong>{email}</strong>, a reset code is on its way.</p>
          <p className="mt-2 text-sm text-muted">The code expires in 15 minutes.</p>
          <Link href="/reset-password" className="mt-4 inline-block text-sm font-medium text-accent">
            I have my code — enter it →
          </Link>
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
          <div className="pt-2">
            <Button className="w-full" type="submit">
              {loading ? 'Sending…' : 'Send reset code'}
            </Button>
          </div>
        </form>
      )}
    </main>
  );
}