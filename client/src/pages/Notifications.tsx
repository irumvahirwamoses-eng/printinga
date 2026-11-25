import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bell, CircleCheck, ExternalLink, Inbox } from 'lucide-react';
import api from '../lib/api';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { getSocket } from '../lib/socket';

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['notifications'], queryFn: async () => (await api.get('/notifications?limit=50')).data.data });
  const items = data?.items || [];
  const unreadCount = data?.unreadCount ?? items.filter((n: any) => !n.isRead).length;

  useEffect(() => {
    const s = getSocket();
    const onNotification = () => qc.invalidateQueries({ queryKey: ['notifications'] });
    s.on('notification', onNotification);
    return () => { s.off('notification', onNotification); };
  }, [qc]);

  const refreshBadge = () => window.dispatchEvent(new Event('notifications:changed'));
  const markRead = async (id: string) => { await api.patch(`/notifications/${id}/read`); qc.invalidateQueries({ queryKey: ['notifications'] }); refreshBadge(); };
  const markAll = async () => { await api.patch('/notifications/read-all'); qc.invalidateQueries({ queryKey: ['notifications'] }); refreshBadge(); };

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={unreadCount ? `You have ${unreadCount} unread update${unreadCount === 1 ? '' : 's'}.` : 'You are all caught up.'}
        icon={Bell}
        actions={unreadCount > 0 ? <Button variant="secondary" size="sm" icon={CircleCheck} onClick={markAll}>Mark all as read</Button> : undefined}
      />
      <div className="card divide-y divide-slate-100">
        {isLoading && <div className="p-8 text-center text-slate-500">Loading notifications…</div>}
        {!isLoading && items.length === 0 && <EmptyState icon={Inbox} title="No notifications" description="Updates about your requests will appear here." />}
        {items.map((n: any) => (
          <div key={n._id} className={`flex items-start justify-between gap-4 p-4 transition ${n.isRead ? '' : 'bg-blue-50/50'}`}>
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${n.isRead ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-700'}`}>
                <Bell className="h-4 w-4" />
              </span>
              <div>
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  {n.title}
                  {!n.isRead && <span className="h-2 w-2 rounded-full bg-blue-600" aria-label="Unread" />}
                </div>
                <div className="mt-0.5 text-sm text-slate-600">{n.message}</div>
                <div className="mt-1 text-xs text-slate-400">{new Date(n.createdAt).toLocaleString()}</div>
                {n.linkUrl && <Link to={n.linkUrl} className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline">Open <ExternalLink className="h-3 w-3" /></Link>}
              </div>
            </div>
            {!n.isRead && <Button variant="ghost" size="sm" onClick={() => markRead(n._id)}>Mark read</Button>}
          </div>
        ))}
      </div>
    </div>
  );
}
