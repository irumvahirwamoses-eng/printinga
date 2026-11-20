import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, CircleAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { AuthLink, AuthShell } from '../components/ui/AuthShell';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [nationalId, setNationalId] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (user) navigate(user.role === 'OFFICER' ? '/officer' : '/teacher', { replace: true });
  }, [user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\d{16}$/.test(nationalId)) { setError('National ID must be exactly 16 digits.'); return; }
    setLoading(true);
    try {
      await login(nationalId, password, rememberMe);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Login failed. Check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your school's printing."
      footer={<>New here? Ask your printing officer to register your account.</>}
    >
      <form onSubmit={onSubmit} className="space-y-4">
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
            autoComplete="username"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <div className="relative">
            <input
              id="password"
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pr-10"
              autoComplete="current-password"
              required
            />
            <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-2 top-2 rounded p-1 text-slate-400 hover:text-blue-700" aria-label={showPw ? 'Hide password' : 'Show password'}>
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-slate-600">
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500" />
            Keep me signed in
          </label>
          <AuthLink to="/forgot-password">Forgot password?</AuthLink>
        </div>
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        <Button type="submit" size="lg" loading={loading} icon={ShieldCheck} className="w-full">
          {loading ? 'Signing in…' : 'Sign in securely'}
        </Button>
      </form>
    </AuthShell>
  );
}
