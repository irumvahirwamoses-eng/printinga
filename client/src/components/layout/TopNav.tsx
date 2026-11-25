import React, { useEffect, useState } from 'react';
import { Bell, Menu, Printer, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../lib/api';
import { getSocket } from '../../lib/socket';

export function TopNav({ onMenu }: { onMenu: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = () => {
      api.get('/notifications?unread=true&limit=1').then((r) => setUnread(r.data.data.unreadCount || 0)).catch(() => {});
    };
    load();
    window.addEventListener('notifications:changed', load);
    const s = getSocket();
    // Refetch instead of incrementing so duplicate events (e.g. a message sent
    // to both the request room and the user room) can't inflate the badge.
    const onNotif = () => load();
    s.on('notification', onNotif);
    s.on('new_message', onNotif);
    return () => {
      window.removeEventListener('notifications:changed', load);
      s.off('notification', onNotif);
      s.off('new_message', onNotif);
    };
  }, [user]);

  const notifPath = user?.role === 'OFFICER' ? '/officer/notifications' : '/teacher/notifications';
  const profilePath = user?.role === 'OFFICER' ? '/officer/profile' : '/teacher/profile';

  return (
    <header className="no-print z-20 flex h-16 shrink-0 items-center justify-between border-b border-blue-100 bg-white px-4 shadow-sm md:px-6">
      <div className="flex items-center gap-3">
        <button className="rounded-lg p-2 text-slate-600 hover:bg-blue-50 hover:text-blue-700 lg:hidden" onClick={onMenu} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
        <span className="flex items-center gap-2 text-sm font-semibold text-blue-800 lg:hidden"><Printer className="h-5 w-5" /> SchoolPrint</span>
        <div className="hidden lg:block">
          <p className="text-sm font-semibold text-slate-800">Welcome back, {user?.fullName?.split(' ')[0]} 👋</p>
          <p className="text-xs text-slate-500">{user?.role === 'OFFICER' ? 'Your print room at a glance' : 'Here is the status of your requests'}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(profilePath)} className="hidden items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-600 transition hover:bg-blue-50 hover:text-blue-800 sm:flex" title="Your profile">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700"><UserRound className="h-3.5 w-3.5" /></span>
          <span className="font-medium">{user?.fullName}</span>
        </button>
        <button className="relative rounded-lg p-2 text-slate-600 transition hover:bg-blue-50 hover:text-blue-700" onClick={() => navigate(notifPath)} aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} title="Notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-700 px-1 text-[10px] font-bold text-white ring-2 ring-white">{unread > 99 ? '99+' : unread}</span>}
        </button>
      </div>
    </header>
  );
}
