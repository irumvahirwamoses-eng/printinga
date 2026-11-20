import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, FileText, Layers, Copy, TriangleAlert, Download, CalendarDays } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../lib/api';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/ui/StatCard';
import { useToast } from '../components/ui/Toast';

export default function Reports() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { toast } = useToast();
  const params = { from: from || undefined, to: to || undefined };
  const { data: overview } = useQuery({ queryKey: ['r-overview', from, to], queryFn: async () => (await api.get('/reports/overview', { params })).data.data });
  const { data: printing } = useQuery({ queryKey: ['r-printing', from, to], queryFn: async () => (await api.get('/reports/printing', { params })).data.data });
  const { data: teachers } = useQuery({ queryKey: ['r-teachers', from, to], queryFn: async () => (await api.get('/reports/teachers', { params })).data.data });

  const exportFile = async (format: 'csv' | 'xlsx') => {
    try {
      const res = await api.get('/reports/export', { params: { ...params, format }, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = `schoolprint-report.${format}`; a.click(); URL.revokeObjectURL(url);
      toast(`${format.toUpperCase()} report downloaded.`, 'success');
    } catch { toast('Could not export the report.', 'error'); }
  };

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Understand demand, output and reliability across the print room."
        icon={BarChart3}
        actions={<>
          <Button variant="secondary" size="sm" icon={Download} onClick={() => exportFile('csv')}>CSV</Button>
          <Button variant="secondary" size="sm" icon={Download} onClick={() => exportFile('xlsx')}>Excel</Button>
        </>}
      />

      <div className="card mb-5 flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="label" htmlFor="from">From</label>
          <input id="from" type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="to">To</label>
          <input id="to" type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <p className="flex items-center gap-1.5 pb-2 text-xs text-slate-500"><CalendarDays className="h-3.5 w-3.5" /> Leave blank to include all dates.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total requests" value={overview?.totalRequests || 0} icon={FileText} tone="blue" />
        <StatCard label="Pages printed" value={overview?.totalPagesPrinted || 0} icon={Layers} tone="blue" />
        <StatCard label="Copies printed" value={overview?.totalCopiesPrinted || 0} icon={Copy} tone="green" />
        <StatCard label="Failed operations" value={overview?.failedPrintingOperations || 0} icon={TriangleAlert} tone="amber" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="card">
          <div className="card-header"><div className="card-title">Daily activity</div></div>
          <div className="card-body h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={printing?.dailyActivity || []}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#1d4ed8" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="card">
          <div className="card-header"><div className="card-title">Monthly activity</div></div>
          <div className="card-body h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={printing?.monthlyActivity || []}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="month" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#0ea5e9" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="card mt-5">
        <div className="card-header">
          <div className="card-title">Most active teachers</div>
          <span className="chip">Completion rate: {Number(printing?.completionRate || 0).toFixed(1)}%</span>
        </div>
        <div className="table-wrap border-0 rounded-none">
          <table className="table">
            <thead><tr><th>Teacher</th><th>Department</th><th>Requests</th><th>Pages</th><th>Copies</th></tr></thead>
            <tbody>
              {(teachers?.mostActiveTeachers || []).map((t: any, i: number) => (
                <tr key={i}><td className="font-medium">{t.teacher?.fullName || '—'}</td><td>{t.teacher?.department || '—'}</td><td>{t.count}</td><td>{t.pages}</td><td>{t.copies}</td></tr>
              ))}
              {(!teachers?.mostActiveTeachers?.length) && <tr><td colSpan={5} className="py-8 text-center text-slate-500">No data for this period.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
