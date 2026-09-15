'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Mail, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, ApiError } from '@/lib/auth-context';

export default function RegisterPage() {
  const router = useRouter();
  const { register, verifyEmail, resendOtp } = useAuth();

  // Step state: 'details' | 'verify'
  const [step, setStep] = useState<'details' | 'verify'>('details');

  // Form fields
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Resend cooldown timer (in seconds)
  const [cooldown, setCooldown] = useState(0);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  // OTP expiration countdown
  useEffect(() => {
    if (!expiresAt) return;

    const updateExpiration = () => {
      const now = new Date();
      const exp = new Date(expiresAt);
      const remaining = exp.getTime() - now.getTime();

      if (remaining <= 0) {
        setExpiresAt(null);
      }
    };

    updateExpiration();
    const interval = setInterval(updateExpiration, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      const result = await register({ email, password, businessName });
      setExpiresAt(result.expiresAt ? new Date(result.expiresAt) : null);
      setStep('verify');
      setCooldown(60);
      setResendStatus(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.fieldErrors) {
          setFieldErrors(err.fieldErrors);
        }
      } else {
        setError('Unable to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = otpCode.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);

    try {
      await verifyEmail({ email, code: cleanCode });
      setShowSuccess(true);
      setTimeout(() => {
        router.push('/app/dashboard');
      }, 2000);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        // Handle expired OTP specifically
        if (err.code === 'OTP_EXPIRED') {
          setExpiresAt(null);
        }
      } else {
        setError('Failed to verify code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || loading) return;
    setError(null);
    setResendStatus(null);
    setLoading(true);

    try {
      const result = await resendOtp({ email });
      if (result.expiresAt) {
        setExpiresAt(new Date(result.expiresAt));
      }
      setCooldown(60);
      setResendStatus('A new 6-digit code has been sent.');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to resend code. Please try again.');
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

      {step === 'details' ? (
        <>
          <h1 className="mt-4 font-serif text-4xl">Start collecting</h1>
          <p className="mt-2 text-sm text-muted">Create professional invoices and get paid directly via UPI & cards.</p>

          {error ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50/60 p-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleRegisterSubmit} className="mt-8 space-y-4">
            <label className="block text-sm">
              Business / Agency Name
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-line bg-elevated px-3 py-3 outline-none focus:border-ink transition-colors"
                placeholder="e.g. Shubhendu Digital"
                disabled={loading}
              />
              {fieldErrors.businessName ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.businessName[0]}</p>
              ) : null}
            </label>

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
              {fieldErrors.email ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.email[0]}</p>
              ) : null}
            </label>

            <label className="block text-sm">
              Password
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-line bg-elevated px-3 py-3 outline-none focus:border-ink transition-colors"
                placeholder="Minimum 8 characters"
                disabled={loading}
              />
              {fieldErrors.password ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.password[0]}</p>
              ) : null}
            </label>

            <div className="pt-2">
              <Button className="w-full" type="submit">
                {loading ? 'Sending code...' : 'Continue with verification'}
              </Button>
            </div>
          </form>

          <p className="mt-6 text-sm text-muted">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-ink underline underline-offset-4">
              Log in
            </Link>
          </p>
        </>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-elevated text-ink">
              <Mail size={18} />
            </div>
            <div>
              <h1 className="font-serif text-3xl">Verify your email</h1>
              <p className="text-xs text-muted">Step 2 of 2</p>
            </div>
          </div>

          <p className="mt-3 text-sm text-muted">
            We sent a 6-digit verification code to <span className="font-medium text-ink">{email}</span>.
          </p>

          {expiresAt && !showSuccess && (
            <p className="mt-2 text-xs text-muted">
              Your verification code will expire in{' '}
              <span className="font-medium text-ink">
                {Math.max(0, Math.ceil((new Date(expiresAt).getTime() - new Date().getTime()) / 60000))} minutes
              </span>
              .
            </p>
          )}

          {error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50/60 p-3 text-sm text-red-700">
              {error}
              {error.includes('expired') && (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={cooldown > 0 || loading}
                  className="mt-2 block w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                </button>
              )}
            </div>
          ) : null}

          {resendStatus ? (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-800">
              <CheckCircle2 size={14} />
              <span>{resendStatus}</span>
            </div>
          ) : null}

          {showSuccess ? (
            <div className="mt-6 flex flex-col items-center justify-center py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 animate-in zoom-in duration-300">
                <Check size={32} className="animate-in spin-in duration-500" />
              </div>
              <h2 className="mt-4 font-serif text-2xl text-ink">Email verified successfully!</h2>
              <p className="mt-2 text-sm text-muted">Your email address has been verified.</p>
              <p className="mt-4 text-xs text-muted">Redirecting to dashboard...</p>
            </div>
          ) : (
            <>
              <form onSubmit={handleVerifySubmit} className="mt-6 space-y-4">
                <label className="block text-sm">
                  6-digit verification code
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    autoFocus
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    className="mt-2 w-full rounded-xl border border-line bg-elevated px-4 py-3.5 text-center font-mono text-2xl font-semibold tracking-[0.35em] text-ink outline-none focus:border-ink transition-colors"
                    placeholder="······"
                    disabled={loading}
                  />
                </label>

                <div className="pt-2">
                  <Button className="w-full" type="submit">
                    {loading ? 'Verifying...' : 'Verify & Continue'}
                  </Button>
                </div>
              </form>

              <div className="mt-6 flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={cooldown > 0 || loading}
                  className={`text-sm transition-colors ${
                    cooldown > 0
                      ? 'cursor-not-allowed text-muted/60'
                      : 'text-ink underline underline-offset-4 hover:text-muted'
                  }`}
                >
                  {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('details');
                    setError(null);
                    setOtpCode('');
                  }}
                  className="text-sm text-muted hover:text-ink transition-colors"
                >
                  Edit email
                </button>
              </div>
            </>
          )}
        </>
      )}
    </main>
  );
}
