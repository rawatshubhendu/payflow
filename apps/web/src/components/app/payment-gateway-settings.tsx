'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import type { PaymentGatewayStatus, VerifyGatewayKeysResult, GatewayTestResult } from '@payflow/types';

type Feedback = { type: 'success' | 'error' | 'info'; text: string } | null;

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function PaymentGatewaySettings() {
  const [status, setStatus] = useState<PaymentGatewayStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const [keyId, setKeyId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');

  const [checking, setChecking] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const [feedback, setFeedback] = useState<Feedback>(null);
  const [testResult, setTestResult] = useState<GatewayTestResult | null>(null);

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<PaymentGatewayStatus>('/api/payment-gateway');
      setStatus(result);
      if (result.connected) {
        setKeyId('');
        setKeySecret('');
        setWebhookSecret('');
      }
    } catch {
      setFeedback({ type: 'error', text: 'Could not load payment settings.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const handleCopyWebhookUrl = async () => {
    if (!status?.webhookUrl) return;
    const ok = await copyText(status.webhookUrl);
    setFeedback(ok ? { type: 'info', text: 'Webhook URL copied. Paste it in your Razorpay dashboard.' } : { type: 'error', text: 'Could not copy automatically. Copy it manually from the box below.' });
  };

  const handleCheckKeys = async () => {
    setFeedback(null);
    if (!keyId || !keySecret) {
      setFeedback({ type: 'error', text: 'Enter your Key ID and Key Secret first.' });
      return;
    }
    setChecking(true);
    try {
      const result = await api.post<VerifyGatewayKeysResult>('/api/payment-gateway/verify-keys', { keyId, keySecret });
      setFeedback(
        result.valid
          ? { type: 'success', text: 'Keys verified — Razorpay accepted them.' }
          : { type: 'error', text: result.details ?? 'These keys could not be verified.' },
      );
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof ApiError ? err.message : 'Verification failed.' });
    } finally {
      setChecking(false);
    }
  };

  const handleConnect = async () => {
    setFeedback(null);
    if (!keyId || !keySecret || !webhookSecret) {
      setFeedback({ type: 'error', text: 'Fill in Key ID, Key Secret and Webhook Secret.' });
      return;
    }
    setConnecting(true);
    try {
      const result = await api.post<PaymentGatewayStatus>('/api/payment-gateway', { keyId, keySecret, webhookSecret });
      setStatus(result);
      setKeyId('');
      setKeySecret('');
      setWebhookSecret('');
      setFeedback({ type: 'success', text: 'Connected. Your invoices will now use your own Razorpay account.' });
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof ApiError ? err.message : 'Could not connect your account.' });
    } finally {
      setConnecting(false);
    }
  };

  const handleTest = async () => {
    setFeedback(null);
    setTestResult(null);
    setTesting(true);
    try {
      const result = await api.post<GatewayTestResult>('/api/payment-gateway/test');
      setTestResult(result);
      setFeedback({ type: 'success', text: 'Test order created. Payment processing is working.' });
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof ApiError ? err.message : 'Test failed.' });
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirmDisconnect) {
      setConfirmDisconnect(true);
      return;
    }
    setFeedback(null);
    setDisconnecting(true);
    try {
      const result = await api.delete<PaymentGatewayStatus>('/api/payment-gateway');
      setStatus(result);
      setConfirmDisconnect(false);
      setTestResult(null);
      setFeedback({ type: 'info', text: 'Disconnected. New invoice payments will fall back to the default PayFlow account.' });
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof ApiError ? err.message : 'Could not disconnect.' });
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading && !status) {
    return (
      <div className="rounded-2xl border border-line bg-elevated p-6 text-sm text-muted">
        Loading payment settings…
      </div>
    );
  }

  const inputClass =
    'mt-2 w-full rounded-xl border border-line bg-elevated px-3 py-3 outline-none focus:border-ink transition-colors';
  const labelClass = 'block text-sm';

  return (
    <div className="space-y-4">
      {feedback ? (
        <div
          className={`rounded-xl p-3 text-sm border ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800'
              : feedback.type === 'error'
                ? 'border-red-200 bg-red-50/70 text-red-700'
                : 'border-blue-200 bg-blue-50/70 text-blue-800'
          }`}
        >
          {feedback.text}
        </div>
      ) : null}

      {!status?.connected ? (
        <div className="rounded-2xl border border-line bg-elevated p-6">
          <h2 className="font-serif text-xl">Connect your Razorpay account</h2>
          <p className="mt-1 text-sm text-muted">
            When a client pays an invoice, the money lands in <strong>your own Razorpay account</strong> and Razorpay settles it to your bank. This takes about 10 minutes, once.
          </p>

          <div className="mt-4 rounded-xl border border-line bg-ink/5 p-4">
            <p className="text-sm font-medium">Your webhook URL — paste this into Razorpay</p>
            <div className="mt-2 flex items-center gap-2">
              <input readOnly value={status?.webhookUrl ?? ''} className="w-full rounded-xl border border-line bg-elevated px-3 py-2.5 text-xs outline-none" />
              <Button type="button" variant="secondary" onClick={handleCopyWebhookUrl}>Copy</Button>
            </div>
            <p className="mt-2 text-xs text-muted">
              In Razorpay Dashboard → Settings → Webhooks, create a webhook with this URL for events{' '}
              <code>payment.captured</code> and <code>payment.failed</code>. When Razorpay asks for a secret, make one up
              (at least 16 characters), and paste <strong>the same secret below</strong>.
            </p>
          </div>

          <div className="mt-4 space-y-4">
            <label className={labelClass}>
              Razorpay Key ID
              <input value={keyId} onChange={(e) => setKeyId(e.target.value)} className={inputClass} placeholder="rzp_test_..." autoComplete="off" />
            </label>
            <label className={labelClass}>
              Razorpay Key Secret
              <input type="password" value={keySecret} onChange={(e) => setKeySecret(e.target.value)} className={inputClass} placeholder="Your secret key from api.razorpay.com" autoComplete="off" />
            </label>
            <label className={labelClass}>
              Webhook Secret (same one you set in Razorpay)
              <input type="password" value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} className={inputClass} placeholder="At least 16 characters" autoComplete="off" />
            </label>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button type="button" variant="secondary" onClick={handleCheckKeys} disabled={checking || connecting}>
              {checking ? 'Checking…' : 'Check my keys'}
            </Button>
            <Button type="button" onClick={handleConnect} disabled={connecting || checking}>
              {connecting ? 'Connecting…' : 'Connect'}
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted">
            Your key secret is encrypted before storage and never shown again. PayFlow can charge payments into your account but cannot transfer money out.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-elevated p-6">
          <h2 className="font-serif text-xl">Payments</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.mode === 'live' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {status.mode === 'live' ? 'LIVE' : 'TEST'} MODE
            </span>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">CONNECTED</span>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <p className="text-muted">Key ID: <span className="font-mono text-ink">{status.keyId}</span></p>
            <p className="text-muted">
              Connected: <span className="text-ink">{status.connectedAt ? new Date(status.connectedAt).toLocaleString() : ''}</span>
            </p>
          </div>

          <div className="mt-4 rounded-xl border border-line bg-ink/5 p-4">
            <p className="text-sm font-medium">Your webhook URL (keep this in Razorpay)</p>
            <div className="mt-2 flex items-center gap-2">
              <input readOnly value={status?.webhookUrl ?? ''} className="w-full rounded-xl border border-line bg-elevated px-3 py-2.5 text-xs outline-none" />
              <Button type="button" variant="secondary" onClick={handleCopyWebhookUrl}>Copy</Button>
            </div>
          </div>

          {testResult ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-sm text-emerald-800">
              Test order created: <span className="font-mono">{testResult.orderId}</span> (₹1, receipt {testResult.receipt}). You can ignore this order in your Razorpay dashboard.
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" onClick={handleTest} disabled={testing}>
              {testing ? 'Running test…' : 'Run test payment (₹1)'}
            </Button>
            <Button type="button" variant="ghost" onClick={handleDisconnect} disabled={disconnecting}>
              {disconnecting ? 'Disconnecting…' : confirmDisconnect ? 'Confirm disconnect?' : 'Disconnect'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}