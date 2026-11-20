import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MessageSquare, MessageCircle, ArrowRight } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { StatusBadge } from '../components/StatusBadge';
import { ChatButton } from '../components/ChatButton';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';

export default function Messages() {
  const { user } = useAuth();
  const isOfficer = user?.role === 'OFFICER';
  const { data, isLoading } = useQuery({
    queryKey: ['messages', 'index'],
    queryFn: async () => (await api.get('/requests?limit=100')).data.data,
  });
  const items = data?.items || [];

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle={isOfficer
          ? 'Chat with the teacher who sent each print request.'
          : 'Open a request to chat with the printing officer about it.'}
        icon={MessageSquare}
      />
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Request #</th><th>Title</th><th>{isOfficer ? 'Teacher' : 'Status'}</th><th>Submitted</th><th className="text-right">Conversation</th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={5} className="py-10 text-center text-slate-500">Loading requests…</td></tr>}
            {!isLoading && items.length === 0 && <tr><td colSpan={5}><EmptyState icon={MessageCircle} title="No requests yet" description={isOfficer ? 'Conversations appear here when teachers submit requests.' : 'Once you submit a request, you can message the officer here.'} /></td></tr>}
            {items.map((r: any) => (
              <tr key={r._id}>
                <td className="font-mono text-xs text-slate-500">{r.requestNumber}</td>
                <td className="max-w-xs truncate font-medium">{r.title}</td>
                <td>{isOfficer ? (r.teacherId?.fullName || '—') : <StatusBadge status={r.status} />}</td>
                <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className="flex items-center justify-end gap-2">
                    <ChatButton request={r} />
                    <Link to={`/requests/${r._id}`} className="btn-ghost btn-sm"><ArrowRight className="h-3.5 w-3.5" /> Open</Link>
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
