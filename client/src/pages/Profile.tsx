import React, { useEffect, useState } from 'react';
import { User, KeyRound, CircleAlert, CircleCheck, Save, Pencil } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/api';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';

interface ProfileForm {
  fullName: string;
  email: string;
  phone: string;
  department: string;
}

const blankForm: ProfileForm = { fullName: '', email: '', phone: '', department: '' };

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState<ProfileForm>(blankForm);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      fullName: user.fullName || '',
      email: user.email || '',
      phone: user.phone || '',
      department: user.department || '',
    });
  }, [user]);

  if (!user) return null;

  const update = (field: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setMsg(''); setSaving(true);
    try {
      const res = await api.patch('/auth/profile', form);
      setForm({
        fullName: res.data.data.user.fullName || '',
        email: res.data.data.user.email || '',
        phone: res.data.data.user.phone || '',
        department: res.data.data.user.department || '',
      });
      setEditing(false);
      await refreshUser();
      toast('Profile details updated.', 'success');
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Could not update your profile.';
      setError(message);
      toast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(''); setError(''); setLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setMsg('Password changed. Please sign in again.');
      setCurrent(''); setNew('');
      await refreshUser();
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Could not change your password.';
      setError(message);
      toast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Profile & Account" subtitle="Keep your contact details current and manage your password." icon={User} />

      {error && <div className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}</div>}
      {msg && <div className="mb-5 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CircleCheck className="mt-0.5 h-4 w-4 shrink-0" /> {msg}</div>}

      <section className="card mb-5">
        <div className="card-header">
          <div className="card-title"><User className="h-4 w-4 text-blue-700" /> Account information</div>
          {!editing && <Button variant="secondary" size="sm" icon={Pencil} onClick={() => setEditing(true)}>Edit details</Button>}
        </div>
        <div className="card-body">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">{user.fullName.charAt(0).toUpperCase()}</span>
            <div>
              <p className="font-semibold text-slate-900">{user.fullName}</p>
              <p className="text-sm text-slate-500">{user.role === 'OFFICER' ? 'Printing Officer' : 'Teacher'}{user.department ? ` · ${user.department}` : ''}</p>
            </div>
          </div>

          {editing ? (
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="profileFullName">Full name</label>
                  <input id="profileFullName" className="input" value={form.fullName} onChange={update('fullName')} maxLength={120} required />
                </div>
                <div>
                  <label className="label" htmlFor="profileEmail">Email</label>
                  <input id="profileEmail" type="email" className="input" placeholder="name@school.edu" value={form.email} onChange={update('email')} maxLength={200} />
                </div>
                <div>
                  <label className="label" htmlFor="profilePhone">Phone</label>
                  <input id="profilePhone" className="input" placeholder="024 000 0000" value={form.phone} onChange={update('phone')} maxLength={30} />
                </div>
                <div>
                  <label className="label" htmlFor="profileDepartment">Department</label>
                  <input id="profileDepartment" className="input" placeholder="e.g. Mathematics" value={form.department} onChange={update('department')} maxLength={120} />
                </div>
              </div>
              <dl className="grid gap-x-6 gap-y-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                <div><dt className="text-xs font-medium text-slate-500">National ID</dt><dd className="text-sm font-medium text-slate-800">{user.nationalIdMasked}</dd></div>
                <div><dt className="text-xs font-medium text-slate-500">Role</dt><dd className="text-sm font-medium text-slate-800">{user.role === 'OFFICER' ? 'Printing Officer' : 'Teacher'}</dd></div>
              </dl>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" icon={Save} loading={saving}>Save changes</Button>
                <Button type="button" variant="ghost" onClick={() => { setEditing(false); setError(''); }}>Cancel</Button>
              </div>
            </form>
          ) : (
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {[
                ['Full name', user.fullName],
                ['National ID', user.nationalIdMasked],
                ['Role', user.role === 'OFFICER' ? 'Printing Officer' : 'Teacher'],
                ['Department', user.department || '—'],
                ['Email', user.email || '—'],
                ['Phone', user.phone || '—'],
                ['Status', user.isActive ? 'Active' : 'Inactive'],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <dt className="text-xs font-medium text-slate-500">{label}</dt>
                  <dd className="text-sm font-medium text-slate-800">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      <section className="card">
        <div className="card-header"><div className="card-title"><KeyRound className="h-4 w-4 text-blue-700" /> Change password</div></div>
        <div className="card-body">
          <form onSubmit={changePw} className="max-w-md space-y-4">
            <div><label className="label" htmlFor="currentPassword">Current password</label><input id="currentPassword" type="password" className="input" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} required /></div>
            <div><label className="label" htmlFor="newPassword">New password</label><input id="newPassword" type="password" className="input" placeholder="At least 8 characters" minLength={8} value={newPassword} onChange={(e) => setNew(e.target.value)} required /></div>
            <Button type="submit" icon={KeyRound} loading={loading}>Update password</Button>
          </form>
        </div>
      </section>
    </div>
  );
}
