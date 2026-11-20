import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, FileText, Clock3, Printer, CheckCircle2, Package, ArrowRight } from 'lucide-react';
import api from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { PrintButton } from '../components/PrintButton';
import { ChatButton } from '../components/ChatButton';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { Button } from '../components/ui/Button';

export default function OfficerDashboard() {
  const { data: reqData } = useQuery({ queryKey: ['officerReqs'], queryFn: async () => (await api.get('/requests?limit=8')).data.data });
  const { data: overview } = useQuery({ queryKey: ['overview'], queryFn: async () => (await api.get('/reports/overview')).data.data });
  const items = reqData?.items || [];
  const b = overview?.statusBreakdown || {};

  const cards = [
    { label: 'Teachers', value: overview?.totalTeachers || 0, icon: Users },
    { label: 'Total requests', value: overview?.totalRequests || 0, icon: FileText },
    { label: 'Pending', value: b.PENDING || 0, icon: Clock3, tone: 'amber' as const },
    { label: 'In progress', value: (b.ACCEPTED || 0) + (b.PROCESSING || 0) + (b.PRINTING || 0), icon: Printer, tone: 'blue' as const },
    { label: 'Printed / ready', value: (b.PRINTED || 0) + (b.READY_FOR_COLLECTION || 0), icon: CheckCircle2, tone: 'green' as const },
    { label: 'Collected', value: b.COLLECTED || 0, icon: Package, tone: 'slate' as const },
  ];

  return (
    <div>
      <PageHeader
        title="Good to see you"
        subtitle="Here is what is happening in your print queue today."
        icon={Printer}
        actions={<Link to="/officer/requests" className="btn-primary"><FileText className="h-4 w-4" /> All requests</Link>}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => <StatCard key={c.label} label={c.label} value={c.value} icon={c.icon} tone={c.tone} />)}
      </div>

      <div className="card mt-6">
        <div className="card-header">
          <div className="card-title"><Clock3 className="h-4 w-4 text-blue-700" /> Recent requests</div>
          <Link to="/officer/requests" className="btn-ghost btn-sm">View all <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="table-wrap border-0 rounded-none">
          <table className="table">
            <thead><tr><th>Request</th><th>Teacher</th><th>Title</th><th>Copies</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {items.map((r: any) => (
                <tr key={r._id}>
                  <td className="font-mono text-xs text-slate-500">{r.requestNumber}</td>
                  <td className="font-medium">{r.teacherId?.fullName || '—'}</td>
                  <td className="max-w-xs truncate">{r.title}</td>
                  <td>{r.numberOfCopies}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td><div className="flex justify-end gap-2"><ChatButton request={r} /><PrintButton request={r} /><Link to={`/requests/${r._id}`} className="btn-ghost btn-sm">View</Link></div></td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-slate-500">No requests yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/officer/teachers" className="btn-secondary"><Users className="h-4 w-4" /> Manage teachers</Link>
        <Link to="/officer/reports" className="btn-secondary"><FileText className="h-4 w-4" /> View reports</Link>
        <Link to="/officer/history" className="btn-secondary"><Printer className="h-4 w-4" /> Print history</Link>
      </div>
    </div>
  );
}
