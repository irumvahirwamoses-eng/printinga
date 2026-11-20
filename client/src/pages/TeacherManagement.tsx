import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus, Search, KeyRound, CircleAlert, CircleCheck, X } from 'lucide-react';
import api from '../lib/api';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';

export default function TeacherManagement() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: '', nationalId: '', email: '', phone: '', department: '' });
  const [created, setCreated] = useState<{ tempPassword?: string } | null>(null);
  const [resetPwResult, setResetPwResult] = useState<{ name: string; tempPassword: string } | null>(null);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['teachers', search],
    queryFn: async () => (await api.get('/teachers', { params: { search: search || undefined, limit: 100 } })).data.data,
  });
  const items = data?.items || [];

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setCreated(null);
    try {
      const res = await api.post('/teachers', form);
      setCreated({ tempPassword: res.data.data.tempPassword });
      setForm({ fullName: '', nationalId: '', email: '', phone: '', department: '' });
      qc.invalidateQueries({ queryKey: ['teachers'] });
      toast('Teacher registered successfully.', 'success');
    } catch (err: any) { setError(err?.response?.data?.message || 'Failed to register teacher.'); }
  };

  const toggle = async (id: string, isActive: boolean) => {
    await api.patch(`/teachers/${id}/status`, { isActive: !isActive });
    qc.invalidateQueries({ queryKey: ['teachers'] });
    toast(isActive ? 'Teacher deactivated.' : 'Teacher activated.', 'success');
  };

  const resetPw = async (id: string, name: string) => {
    if (!window.confirm('Reset this teacher password? A new temporary password will be generated.')) return;
    const res = await api.post(`/teachers/${id}/reset-password`);
    setResetPwResult({ name, tempPassword: res.data.data.tempPassword });
  };

  return (
    <div>
      <PageHeader title="Teacher Management" subtitle="Register teachers and manage their accounts." icon={Users} />

      {showForm && (
        <form onSubmit={create} className="card mb-5">
          <div className="card-header"><div className="card-title"><UserPlus className="h-4 w-4 text-blue-700" /> Register a teacher</div></div>
          <div className="card-body grid gap-4 md:grid-cols-2">
            <div><label className="label">Full name</label><input required placeholder="Full name" className="input" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
            <div><label className="label">National ID</label><input required placeholder="16 digits" maxLength={16} className="input font-mono" value={form.nationalId} onChange={(e) => setForm({ ...form, nationalId: e.target.value.replace(/\D/g, '').slice(0, 16) })} /></div>
            <div><label className="label">Email (optional)</label><input placeholder="name@school.edu" type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><label className="label">Phone (optional)</label><input placeholder="Phone number" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label className="label">Department</label><input placeholder="e.g. Science" className="input" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
            {error && <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 md:col-span-2"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}</div>}
            {created?.tempPassword && (
              <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 md:col-span-2">
                <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Teacher created. Temporary password: <strong className="font-mono">{created.tempPassword}</strong> — share it securely; it is shown once.</span>
              </div>
            )}
            <div className="flex gap-2 md:col-span-2"><Button type="submit" icon={UserPlus}>Create teacher</Button><Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button></div>
          </div>
        </form>
      )}

      {resetPwResult && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CircleCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <span className="flex-1">New temporary password for <strong>{resetPwResult.name}</strong>: <strong className="font-mono">{resetPwResult.tempPassword}</strong> — copy it now; it is shown only once.</span>
          <button onClick={() => setResetPwResult(null)} className="rounded p-1 hover:bg-emerald-100" aria-label="Dismiss"><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="card mb-4 p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search by name, ID or department…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Name</th><th>National ID</th><th>Email</th><th>Department</th><th>Status</th><th>First login</th><th className="text-right">Actions</th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="py-10 text-center text-slate-500">Loading teachers…</td></tr>}
            {!isLoading && items.length === 0 && <tr><td colSpan={7}><EmptyState icon={Users} title="No teachers found" description={showForm ? 'Try a different search.' : 'Register your first teacher to get started.'} /></td></tr>}
            {items.map((t: any) => (
              <tr key={t.id}>
                <td className="font-medium text-slate-800">{t.fullName}</td>
                <td className="font-mono text-xs text-slate-500">{t.nationalIdMasked}</td>
                <td>{t.email || '—'}</td>
                <td>{t.department || '—'}</td>
                <td><span className={`badge ring-1 ring-inset ${t.isActive ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-red-50 text-red-700 ring-red-200'}`}>{t.isActive ? 'Active' : 'Inactive'}</span></td>
                <td>{t.isFirstLogin ? <span className="text-amber-700">Pending</span> : 'Done'}</td>
                <td>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => toggle(t.id, t.isActive)}>{t.isActive ? 'Deactivate' : 'Activate'}</Button>
                    <Button variant="secondary" size="sm" icon={KeyRound} onClick={() => resetPw(t.id, t.fullName)}>Reset password</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
