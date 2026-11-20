import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, TriangleAlert, CircleAlert, CircleCheck } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { AuthShell } from '../components/ui/AuthShell';

export default function ChangePassword() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setMsg(''); setLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setMsg('Password changed. Redirecting you to sign in again…');
      await refreshUser();
      window.setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not change your password.');
    } finally { setLoading(false); }
  };

  return (
    <AuthShell title="Change password" subtitle="Keep your account secure with a fresh password." footer={<span>Signed in as <strong className="text-slate-700">{user?.fullName}</strong></span>}>
      {user?.isFirstLogin && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          This is your first sign-in. You must change your temporary password before continuing.
        </div>
      )}
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="currentPassword">Current password</label>
          <input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} className="input" autoComplete="current-password" required />
        </div>
        <div>
          <label className="label" htmlFor="newPassword">New password</label>
          <input id="newPassword" type="password" value={newPassword} onChange={(e) => setNew(e.target.value)} className="input" placeholder="At least 8 characters" minLength={8} autoComplete="new-password" required />
          <p className="help-text">Use a mix of letters, numbers and symbols.</p>
        </div>
        {error && <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}</div>}
        {msg && <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CircleCheck className="mt-0.5 h-4 w-4 shrink-0" /> {msg}</div>}
        <Button type="submit" size="lg" loading={loading} icon={KeyRound} className="w-full">{loading ? 'Saving…' : 'Change password'}</Button>
      </form>
    </AuthShell>
  );
}
