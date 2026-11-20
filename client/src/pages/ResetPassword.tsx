import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { KeyRound, CircleAlert, CircleCheck } from 'lucide-react';
import api from '../lib/api';
import { Button } from '../components/ui/Button';
import { AuthShell } from '../components/ui/AuthShell';

export default function ResetPassword() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState(sp.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setMsg(''); setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      setMsg('Password reset successful. Redirecting to sign in…');
      window.setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Reset failed. The link may have expired.');
    } finally { setLoading(false); }
  };

  return (
    <AuthShell title="Set a new password" subtitle="Choose a strong password you haven't used before." footer={<Link to="/login" className="font-semibold text-blue-700 hover:underline">Back to sign in</Link>}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="token">Reset token</label>
          <input id="token" value={token} onChange={(e) => setToken(e.target.value)} className="input font-mono text-xs" placeholder="Paste the token from your email" required />
        </div>
        <div>
          <label className="label" htmlFor="newPassword">New password</label>
          <input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="input" placeholder="At least 8 characters" minLength={8} autoComplete="new-password" required />
        </div>
        {error && <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}</div>}
        {msg && <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CircleCheck className="mt-0.5 h-4 w-4 shrink-0" /> {msg}</div>}
        <Button type="submit" size="lg" loading={loading} icon={KeyRound} className="w-full">{loading ? 'Resetting…' : 'Reset password'}</Button>
      </form>
    </AuthShell>
  );
}
