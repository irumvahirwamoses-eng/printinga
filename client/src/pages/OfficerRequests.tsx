import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FileText, RefreshCw, Search, Eye } from 'lucide-react';
import api from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { PrintButton } from '../components/PrintButton';
import { ChatButton } from '../components/ChatButton';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { getSocket } from '../lib/socket';

const statuses = ['', 'PENDING', 'ACCEPTED', 'PROCESSING', 'PRINTING', 'PRINTED', 'READY_FOR_COLLECTION', 'COLLECTED', 'REJECTED', 'CANCELLED', 'FAILED'];

export default function OfficerRequests() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [search, setSearch] = useState('');
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['officerRequests', status, priority, search],
    queryFn: async () => (await api.get('/requests', { params: { status: status || undefined, priority: priority || undefined, search: search || undefined, limit: 100 } })).data.data,
  });
  const items = data?.items || [];

  useEffect(() => {
    const s = getSocket();
    const onNewRequest = () => {
      qc.invalidateQueries({ queryKey: ['officerRequests'] });
      qc.invalidateQueries({ queryKey: ['overview'] });
    };
    s.on('request_created', onNewRequest);
    return () => { s.off('request_created', onNewRequest); };
  }, [qc]);

  return (
    <div>
      <PageHeader
        title="Print Requests"
        subtitle="Review incoming requests and send them straight to print."
        icon={FileText}
        actions={<Button variant="secondary" size="sm" icon={RefreshCw} loading={isFetching} onClick={() => refetch()}>Refresh</Button>}
      />

      <div className="card mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input className="input pl-9" placeholder="Search by title or request number" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            {statuses.map((s) => <option key={s} value={s}>{s ? s.replace('_', ' ') : 'All statuses'}</option>)}
          </select>
          <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Filter by priority">
            <option value="">All priorities</option><option value="NORMAL">Normal</option><option value="URGENT">Urgent</option>
          </select>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Request</th><th>Teacher</th><th>Title</th><th>Pages × Copies</th><th>Priority</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="py-10 text-center text-slate-500">Loading requests…</td></tr>}
            {!isLoading && items.length === 0 && <tr><td colSpan={7}><EmptyState icon={FileText} title="No requests found" description="Try a different filter, or wait for a teacher to submit a request." /></td></tr>}
            {items.map((r: any) => (
              <tr key={r._id}>
                <td className="font-mono text-xs text-slate-500">{r.requestNumber}</td>
                <td className="font-medium text-slate-800">{r.teacherId?.fullName || '—'}</td>
                <td className="max-w-xs truncate">{r.title}</td>
                <td>{r.numberOfPages} × {r.numberOfCopies}</td>
                <td>{r.priority === 'URGENT' ? <span className="badge bg-red-50 text-red-700 ring-1 ring-inset ring-red-200">Urgent</span> : 'Normal'}</td>
                <td><StatusBadge status={r.status} /></td>
                <td>
                  <div className="flex items-center justify-end gap-2">
                    <ChatButton request={r} />
                    <PrintButton request={r} />
                    <Link to={`/requests/${r._id}`} className="btn-ghost btn-sm" title="View details"><Eye className="h-4 w-4" /> <span className="sr-only">View</span></Link>
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
