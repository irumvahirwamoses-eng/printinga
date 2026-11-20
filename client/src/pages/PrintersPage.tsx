import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Printer, Plus, CircleCheck } from 'lucide-react';
import api from '../lib/api';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';

export default function PrintersPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useQuery({ queryKey: ['printers'], queryFn: async () => (await api.get('/printers')).data.data });
  const [form, setForm] = useState({ name: '', model: '', location: '', supportsColour: true, supportsDuplex: true });
  const items = data || [];

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/printers', form);
    setForm({ name: '', model: '', location: '', supportsColour: true, supportsDuplex: true });
    qc.invalidateQueries({ queryKey: ['printers'] });
    toast('Printer added.', 'success');
  };

  const toggleActive = async (p: any) => {
    await api.patch(`/printers/${p._id}`, { isActive: !p.isActive });
    qc.invalidateQueries({ queryKey: ['printers'] });
    toast(p.isActive ? 'Printer deactivated.' : 'Printer activated.', 'success');
  };

  return (
    <div>
      <PageHeader title="Printer Configurations" subtitle="Track the printers available in your print room." icon={Printer} />

      <section className="card mb-5">
        <div className="card-header"><div className="card-title"><Plus className="h-4 w-4 text-blue-700" /> Add a printer</div></div>
        <form onSubmit={create} className="card-body grid gap-4 md:grid-cols-3">
          <div><label className="label">Printer name</label><input required placeholder="e.g. Library LaserJet" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Model</label><input placeholder="Model (optional)" className="input" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
          <div><label className="label">Location</label><input placeholder="e.g. Print room" className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.supportsColour} onChange={(e) => setForm({ ...form, supportsColour: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500" /> Supports colour</label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={form.supportsDuplex} onChange={(e) => setForm({ ...form, supportsDuplex: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500" /> Supports duplex</label>
          <div className="flex items-end"><Button type="submit" icon={Plus} className="w-full">Add printer</Button></div>
        </form>
      </section>

      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Name</th><th>Model</th><th>Location</th><th>Colour</th><th>Duplex</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="py-10 text-center text-slate-500">Loading printers…</td></tr>}
            {items.map((p: any) => (
              <tr key={p._id}>
                <td className="font-medium text-slate-800">{p.name}</td>
                <td>{p.model || '—'}</td><td>{p.location || '—'}</td>
                <td>{p.supportsColour ? 'Yes' : 'No'}</td><td>{p.supportsDuplex ? 'Yes' : 'No'}</td>
                <td><span className={`badge ring-1 ring-inset ${p.isActive ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-100 text-slate-600 ring-slate-200'}`}>{p.isActive ? 'Active' : 'Inactive'}</span></td>
                <td className="text-right"><Button variant="ghost" size="sm" onClick={() => toggleActive(p)}>{p.isActive ? 'Deactivate' : 'Activate'}</Button></td>
              </tr>
            ))}
            {!isLoading && items.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-slate-500">No printers configured yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><CircleCheck className="h-3.5 w-3.5" /> Print jobs are sent to the printer selected in your browser's print dialog.</p>
    </div>
  );
}
