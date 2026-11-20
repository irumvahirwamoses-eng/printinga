import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FileText, FilePlus2, Search, Eye } from 'lucide-react';
import api from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { ChatButton } from '../components/ChatButton';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';

export default function MyRequests() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['myRequests'], queryFn: async () => (await api.get('/requests?limit=100')).data.data });
  const items = (data?.items || []).filter((r: any) => `${r.title} ${r.requestNumber}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="My Requests"
        subtitle="Everything you've sent to the print room, in one place."
        icon={FileText}
        actions={<Link to="/teacher/submit" className="btn-primary"><FilePlus2 className="h-4 w-4" /> New request</Link>}
      />

      <div className="card mb-4 p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search your requests…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Request #</th><th>Title</th><th>Submitted</th><th>Pages × Copies</th><th>Priority</th><th>Status</th><th className="text-right">Details</th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="py-10 text-center text-slate-500">Loading requests…</td></tr>}
            {!isLoading && items.length === 0 && <tr><td colSpan={7}><EmptyState icon={FileText} title="No requests found" description="Submit a print request or try a different search." action={<Link to="/teacher/submit" className="btn-primary btn-sm">Submit a request</Link>} /></td></tr>}
            {items.map((r: any) => (
              <tr key={r._id}>
                <td className="font-mono text-xs text-slate-500">{r.requestNumber}</td>
                <td className="max-w-xs truncate font-medium text-slate-800">{r.title}</td>
                <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                <td>{r.numberOfPages} × {r.numberOfCopies}</td>
                <td>{r.priority === 'URGENT' ? <span className="badge bg-red-50 text-red-700 ring-1 ring-inset ring-red-200">Urgent</span> : 'Normal'}</td>
                <td><StatusBadge status={r.status} /></td>
                <td>
                  <div className="flex items-center justify-end gap-2">
                    <ChatButton request={r} />
                    <Link to={`/requests/${r._id}`} className="btn-secondary btn-sm"><Eye className="h-3.5 w-3.5" /> Open</Link>
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
