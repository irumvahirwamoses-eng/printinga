import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Send, X, MessageSquare, Loader2 } from 'lucide-react';
import api from '../lib/api';
import { connectSocket } from '../lib/socket';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui/Button';

export interface ChatTarget {
  _id: string;
  requestNumber?: string;
  title?: string;
  teacherId?: { fullName?: string } | string;
}

interface DrawerProps {
  request: ChatTarget;
  onClose: () => void;
}

function teacherName(request: ChatTarget) {
  const teacher = request.teacherId;
  return typeof teacher === 'string' ? teacher : teacher?.fullName || 'Teacher';
}

function ChatDrawer({ request, onClose }: DrawerProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<number | null>(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', request._id],
    queryFn: async () => (await api.get(`/requests/${request._id}/messages`)).data.data,
  });

  useEffect(() => {
    const s = connectSocket();
    s.emit('join_request', { requestId: request._id });
    s.emit('mark_read', { requestId: request._id });

    const onMessage = (m: any) => {
      if (m.requestId === request._id || m.requestId?._id === request._id) {
        qc.invalidateQueries({ queryKey: ['messages', request._id] });
        s.emit('mark_read', { requestId: request._id });
      }
    };
    const onTyping = (payload: { requestId: string; userId: string; typing: boolean }) => {
      if (payload.requestId === request._id && payload.userId !== user?.id) setTyping(payload.typing);
    };
    s.on('new_message', onMessage);
    s.on('typing', onTyping);
    return () => {
      s.emit('leave_request', { requestId: request._id });
      s.off('new_message', onMessage);
      s.off('typing', onTyping);
      if (typingTimer.current) window.clearTimeout(typingTimer.current);
    };
  }, [request._id, user?.id, qc]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

  const notifyTyping = () => {
    const s = connectSocket();
    s.emit('typing_start', { requestId: request._id });
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => s.emit('typing_stop', { requestId: request._id }), 1200);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    setSending(true);
    try {
      await api.post(`/requests/${request._id}/messages`, { content });
      setText('');
      connectSocket().emit('typing_stop', { requestId: request._id });
      qc.invalidateQueries({ queryKey: ['messages', request._id] });
      qc.invalidateQueries({ queryKey: ['messages', 'index'] });
    } catch {
      // The toast provider is available in the app layout; a failed send simply
      // leaves the text in the box so the officer/teacher can retry.
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="no-print fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-blue-100 bg-gradient-to-r from-blue-800 to-blue-700 px-5 py-4 text-white">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold"><MessageSquare className="h-4 w-4" /> Request chat</p>
            <p className="mt-1 truncate font-mono text-xs text-blue-100">{request.requestNumber || request._id}</p>
            <p className="truncate text-sm text-blue-50">{request.title || `With ${teacherName(request)}`}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-blue-100 transition hover:bg-white/15 hover:text-white" aria-label="Close chat"><X className="h-5 w-5" /></button>
        </header>

        <div className="flex-1 space-y-2 overflow-y-auto bg-slate-50 p-4">
          {isLoading && <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading conversation…</div>}
          {!isLoading && messages.length === 0 && (
            <div className="py-10 text-center text-sm text-slate-500">
              <MessageCircle className="mx-auto mb-2 h-7 w-7 text-blue-300" />
              No messages yet. Ask a question about the print request here.
            </div>
          )}
          {messages.map((m: any) => {
            const mine = m.senderRole === user?.role;
            return (
              <div key={m._id} className={`max-w-[85%] rounded-xl px-3 py-2 text-sm shadow-sm ${mine ? 'ml-auto bg-blue-700 text-white' : 'bg-white text-slate-800 ring-1 ring-slate-200'}`}>
                <div className="text-[10px] opacity-70">{m.senderId?.fullName || m.senderRole} · {new Date(m.createdAt).toLocaleTimeString()}</div>
                <div className="mt-0.5 whitespace-pre-wrap break-words">{m.content}</div>
              </div>
            );
          })}
          {typing && <div className="text-xs italic text-slate-500">Other participant is typing…</div>}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={send} className="flex items-center gap-2 border-t border-slate-100 bg-white p-3">
          <input
            value={text}
            onChange={(e) => { setText(e.target.value); notifyTyping(); }}
            className="input"
            placeholder="Type a message…"
            maxLength={2000}
            autoFocus
          />
          <Button type="submit" size="sm" icon={Send} loading={sending} disabled={!text.trim()}>Send</Button>
        </form>
      </aside>
    </div>
  );
}

interface Props {
  request: ChatTarget;
  size?: 'sm' | 'md';
  full?: boolean;
  label?: string;
}

/** Chat button that opens a real-time conversation for a specific request. */
export function ChatButton({ request, size = 'sm', full, label = 'Chat' }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="secondary"
        size={size}
        icon={MessageCircle}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className={full ? 'w-full' : ''}
        title={`Chat about ${request.requestNumber || 'this request'}`}
      >
        {label}
      </Button>
      {open && <ChatDrawer request={request} onClose={() => setOpen(false)} />}
    </>
  );
}
