'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth, ApiError } from '@/lib/auth-context';
import { api } from '@/lib/api-client';

type Feedback = { type: 'success' | 'error'; text: string } | null;

const inputClass =
  'mt-2 w-full rounded-xl border border-line bg-elevated px-3 py-3 outline-none focus:border-ink transition-colors';
const labelClass = 'block text-sm';

export function SecuritySettings() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setSaving(true);
    try {
      await api.patch('/api/auth/password', {
        currentPassword,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setFeedback({ type: 'success', text: 'Password updated successfully.' });
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof ApiError ? err.message : 'Failed to update password.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-line bg-elevated p-6">
      <h2 className="font-serif text-xl">Security</h2>
      <p className="text-sm text-muted">
        Signed in as <span className="font-medium text-ink">{user?.email}</span>. Use a strong password that you do
        not reuse elsewhere.
      </p>

      {feedback ? (
        <div
          className={`rounded-xl p-3 text-sm border ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800'
              : 'border-red-200 bg-red-50/70 text-red-700'
          }`}
        >
          {feedback.text}
        </div>
      ) : null}

      <label className={labelClass}>
        Current password
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className={inputClass}
          autoComplete="current-password"
          required
          disabled={saving}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          New password
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
            autoComplete="new-password"
            minLength={8}
            required
            disabled={saving}
          />
        </label>
        <label className={labelClass}>
          Confirm new password
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
            autoComplete="new-password"
            minLength={8}
            required
            disabled={saving}
          />
        </label>
      </div>

      <div className="pt-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Updating...' : 'Update password'}
        </Button>
      </div>
    </form>
  );
}