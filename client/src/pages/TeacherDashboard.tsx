import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FilePlus2, FileText, Clock3, Printer, CheckCircle2, Package, ArrowRight } from 'lucide-react';
import api from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { ChatButton } from '../components/ChatButton';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';

export default function TeacherDashboard() {
  const { data } = useQuery({
    queryKey: ['myRequests', 'dash'],
    queryFn: async () => (await api.get('/requests?limit=8')).data.data,
  });
  const { data: statsData } = useQuery({
    queryKey: ['myRequestStats'],
    queryFn: async () => (await api.get('/requests/stats')).data.data,
  });
  const items = data?.items || [];
  const b = statsData?.statusBreakdown || {};
  const cards = [
    { label: 'Total requests', value: statsData?.total || 0, icon: FileText, tone: 'blue' as const },
    { label: 'Pending', value: b.PENDING || 0, icon: Clock3, tone: 'amber' as const },
    { label: 'In progress', value: (b.ACCEPTED || 0) + (b.PROCESSING || 0) + (b.PRINTING || 0), icon: Printer, tone: 'blue' as const },
    { label: 'Ready / printed', value: (b.PRINTED || 0) + (b.READY_FOR_COLLECTION || 0), icon: CheckCircle2, tone: 'green' as const },
    { label: 'Collected', value: b.COLLECTED || 0, icon: Package, tone: 'slate' as const },
  ];

  return (
    <div>
      <PageHeader
        title="My Printing Dashboard"
        subtitle="Track your requests from submission to collection."
        icon={FileText}
        actions={<Link to="/teacher/submit" className="btn-primary"><FilePlus2 className="h-4 w-4" /> New print request</Link>}
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {cards.map((c) => <StatCard key={c.label} label={c.label} value={c.value} icon={c.icon} tone={c.tone} />)}
      </div>

      <div className="card mt-6">
        <div className="card-header">
          <div className="card-title"><Clock3 className="h-4 w-4 text-blue-700" /> Recent requests</div>
          <Link to="/teacher/requests" className="btn-ghost btn-sm">View all <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="table-wrap border-0 rounded-none">
          <table className="table">
            <thead><tr><th>Request #</th><th>Title</th><th>Submitted</th><th>Pages × Copies</th><th>Status</th><th className="text-right">Details</th></tr></thead>
            <tbody>
              {items.map((r: any) => (
                <tr key={r._id}>
                  <td className="font-mono text-xs text-slate-500">{r.requestNumber}</td>
                  <td className="max-w-xs truncate font-medium">{r.title}</td>
                  <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td>{r.numberOfPages} × {r.numberOfCopies}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td><div className="flex justify-end gap-2"><ChatButton request={r} /><Link to={`/requests/${r._id}`} className="btn-secondary btn-sm">Open</Link></div></td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-slate-500">No requests yet. Submit your first one to get started.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
