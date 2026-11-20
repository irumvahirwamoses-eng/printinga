import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, MessageSquare, History, ShieldCheck, Send, Download, Printer, CheckCircle2, XCircle, Clock3 } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { StatusBadge } from '../components/StatusBadge';
import { PrintButton } from '../components/PrintButton';
import { documentUrl } from '../lib/print';
import { getSocket } from '../lib/socket';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';

const officerActions: Record<string, string[]> = {
  PENDING: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: ['PROCESSING', 'REJECTED'],
  PROCESSING: ['PRINTING', 'FAILED'],
  PRINTING: ['PRINTED', 'FAILED'],
  PRINTED: ['READY_FOR_COLLECTION', 'FAILED'],
  READY_FOR_COLLECTION: ['COLLECTED', 'FAILED'],
  FAILED: ['PROCESSING', 'REJECTED'],
};

const actionMeta: Record<string, { icon: React.ComponentType<{ className?: string }>; variant: 'primary' | 'secondary' | 'danger' | 'success' }> = {
  ACCEPTED: { icon: CheckCircle2, variant: 'primary' },
  PROCESSING: { icon: Printer, variant: 'primary' },
  PRINTING: { icon: Printer, variant: 'primary' },
  PRINTED: { icon: CheckCircle2, variant: 'success' },
  READY_FOR_COLLECTION: { icon: Clock3, variant: 'success' },
  COLLECTED: { icon: CheckCircle2, variant: 'success' },
  REJECTED: { icon: XCircle, variant: 'danger' },
  FAILED: { icon: XCircle, variant: 'danger' },
};

export default function RequestDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [comment, setComment] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: request, isLoading } = useQuery({ queryKey: ['request', id], queryFn: async () => (await api.get(`/requests/${id}`)).data.data, enabled: !!id });
  const { data: messages = [], refetch: refetchMsgs } = useQuery({ queryKey: ['messages', id], queryFn: async () => (await api.get(`/requests/${id}/messages`)).data.data, enabled: !!id });

  useEffect(() => {
    const s = getSocket();
    if (!id) return;
    s.emit('join_request', { requestId: id });
    const onMsg = (m: any) => { if (m.requestId === id || m.requestId?._id === id) refetchMsgs(); };
    const onStatus = () => qc.invalidateQueries({ queryKey: ['request', id] });
    s.on('new_message', onMsg);
    s.on('status_change', onStatus);
    return () => { s.emit('leave_request', { requestId: id }); s.off('new_message', onMsg); s.off('status_change', onStatus); };
  }, [id, refetchMsgs, qc]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading request…</div>;
  if (!request) return <div className="p-8 text-center text-slate-500">Request not found.</div>;

  const doc = request.documentId;
  const isOfficer = user?.role === 'OFFICER';
  const actions = isOfficer ? (officerActions[request.status] || []) : [];

  const doStatus = async (status: string) => {
    try {
      await api.patch(`/requests/${id}/status`, { status, comment: comment || undefined });
      setComment('');
      qc.invalidateQueries({ queryKey: ['request', id] });
      toast(`Request moved to ${status.replace('_', ' ')}.`, 'success');
    } catch (err: any) { toast(err?.response?.data?.message || 'Could not update status.', 'error'); }
  };

  const cancel = async () => {
    if (!window.confirm('Cancel this request?')) return;
    await api.post(`/requests/${id}/cancel`, { reason: 'Cancelled by teacher' });
    qc.invalidateQueries({ queryKey: ['request', id] });
    toast('Request cancelled.', 'info');
  };

  const confirmCollected = async () => {
    await api.patch(`/requests/${id}/status`, { status: 'COLLECTED', comment: 'Confirmed by teacher' });
    qc.invalidateQueries({ queryKey: ['request', id] });
    toast('Collection confirmed. Thank you!', 'success');
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msg.trim()) return;
    setSending(true);
    try {
      await api.post(`/requests/${id}/messages`, { content: msg });
      setMsg('');
      refetchMsgs();
    } finally { setSending(false); }
  };

  const details = [
    ['Teacher', `${request.teacherId?.fullName || '—'} ${request.teacherId?.department ? `(${request.teacherId.department})` : ''}`],
    ['Document', doc ? `${doc.originalName} · ${doc.fileType}` : 'No document'],
    ['Pages / copies', `${request.numberOfPages} × ${request.numberOfCopies}`],
    ['Colour', request.printingType?.replace('_', ' ')],
    ['Paper / sides', `${request.paperSize} / ${request.sides}`],
    ['Orientation', request.orientation],
    ['Page selection', request.pageSelection === 'CUSTOM' ? `Custom (${request.pageRange})` : 'All pages'],
    ['Priority', request.priority],
    ['Submitted', new Date(request.createdAt).toLocaleString()],
  ];

  return (
    <div>
      <PageHeader
        title={request.title}
        subtitle={request.requestNumber}
        icon={FileText}
        actions={<StatusBadge status={request.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card">
            <div className="card-header"><div className="card-title"><FileText className="h-4 w-4 text-blue-700" /> Request details</div></div>
            <div className="card-body">
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {details.map(([label, value]) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <dt className="text-xs font-medium text-slate-500">{label}</dt>
                    <dd className="text-sm font-medium text-slate-800">{value}</dd>
                  </div>
                ))}
              </dl>
              {request.description && <p className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-slate-700"><strong className="text-blue-800">Instructions:</strong> {request.description}</p>}
              {request.rejectionReason && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">Rejection reason: {request.rejectionReason}</p>}

              {doc && (
                <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  {isOfficer && <PrintButton request={request} size="md" />}
                  {isOfficer && <Link to={`/print/${request._id}`} className="btn-secondary"><Printer className="h-4 w-4" /> Print preview</Link>}
                  <a href={documentUrl(doc._id, 'download')} className="btn-ghost"><Download className="h-4 w-4" /> Download</a>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title"><History className="h-4 w-4 text-blue-700" /> Status history</div></div>
            <div className="card-body">
              {(request.statusHistory || []).length === 0 && <p className="text-sm text-slate-500">No updates yet.</p>}
              <ul className="space-y-3">
                {(request.statusHistory || []).map((h: any, i: number) => (
                  <li key={i} className="flex gap-3 border-l-2 border-blue-200 pl-3 text-sm">
                    <div>
                      <div className="font-semibold text-slate-800">{h.previous} → {h.new}</div>
                      <div className="text-xs text-slate-500">{h.userRole} · {new Date(h.changedAt).toLocaleString()}{h.comment ? ` · ${h.comment}` : ''}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="card-header"><div className="card-title"><ShieldCheck className="h-4 w-4 text-blue-700" /> Actions</div></div>
            <div className="card-body space-y-3">
              {isOfficer && actions.length > 0 && (
                <>
                  <input className="input" placeholder="Comment (required for rejection)" value={comment} onChange={(e) => setComment(e.target.value)} />
                  <div className="flex flex-wrap gap-2">
                    {actions.map((a) => {
                      const meta = actionMeta[a] || { icon: CheckCircle2, variant: 'secondary' as const };
                      return <Button key={a} size="sm" variant={meta.variant} icon={meta.icon} onClick={() => doStatus(a)}>{a.replace(/_/g, ' ')}</Button>;
                    })}
                  </div>
                </>
              )}
              {!isOfficer && request.status === 'PENDING' && <Button variant="danger" onClick={cancel}>Cancel request</Button>}
              {!isOfficer && request.status === 'READY_FOR_COLLECTION' && <Button variant="success" icon={CheckCircle2} onClick={confirmCollected}>Confirm collection</Button>}
              {!isOfficer && !['PENDING', 'READY_FOR_COLLECTION'].includes(request.status) && <p className="text-sm text-slate-500">Nothing to do right now. We will notify you when the status changes.</p>}
              {isOfficer && actions.length === 0 && <p className="text-sm text-slate-500">No status actions available for this request. Use <strong>Print now</strong> to print the document.</p>}
            </div>
          </div>

          <div className="card flex h-[26rem] flex-col">
            <div className="card-header"><div className="card-title"><MessageSquare className="h-4 w-4 text-blue-700" /> Messages</div></div>
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {messages.map((m: any) => (
                <div key={m._id} className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.senderRole === user?.role ? 'ml-auto bg-blue-700 text-white' : 'bg-slate-100 text-slate-800'}`}>
                  <div className="text-[10px] opacity-70">{m.senderId?.fullName || m.senderRole} · {new Date(m.createdAt).toLocaleTimeString()}</div>
                  <div>{m.content}</div>
                </div>
              ))}
              {messages.length === 0 && <div className="py-8 text-center text-sm text-slate-400">No messages yet. Ask a question below.</div>}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={send} className="flex gap-2 border-t border-slate-100 p-3">
              <input value={msg} onChange={(e) => setMsg(e.target.value)} className="input" placeholder="Type a message…" />
              <Button type="submit" size="sm" icon={Send} loading={sending} disabled={!msg.trim()}>Send</Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
