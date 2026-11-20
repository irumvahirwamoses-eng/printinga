import React, { useState } from 'react';
import { Mail, CircleAlert, CircleCheck } from 'lucide-react';
import api from '../lib/api';
import { Button } from '../components/ui/Button';
import { AuthLink, AuthShell } from '../components/ui/AuthShell';

export default function ForgotPassword() {
  const [nationalId, setNationalId] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setMsg(''); setError('');
    try {
      const res = await api.post('/auth/forgot-password', { nationalId });
      setMsg(res.data.message || 'If the account exists, reset instructions have been sent.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Request failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <AuthShell title="Forgot password?" subtitle="We'll send a reset link to your registered email." footer={<>Remembered it? <AuthLink to="/login">Back to sign in</AuthLink></>}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="nationalId">National ID</label>
          <input
            id="nationalId"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value.replace(/\D/g, '').slice(0, 16))}
            className="input font-mono tracking-wider"
            placeholder="16-digit national ID"
            inputMode="numeric"
            maxLength={16}
            required
          />
          <p className="help-text">Use the same 16-digit ID you sign in with.</p>
        </div>
        {error && <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}</div>}
        {msg && <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CircleCheck className="mt-0.5 h-4 w-4 shrink-0" /> {msg}</div>}
        <Button type="submit" size="lg" loading={loading} icon={Mail} className="w-full">{loading ? 'Sending…' : 'Send reset link'}</Button>
      </form>
    </AuthShell>
  );
}
