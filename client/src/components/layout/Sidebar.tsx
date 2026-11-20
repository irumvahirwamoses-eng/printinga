import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard, FilePlus2, FileText, MessageSquare, Bell, User, Users, Upload,
  BarChart3, Printer, History, LogOut, ChevronRight,
} from 'lucide-react';

interface Props { open: boolean; onClose: () => void }

export function Sidebar({ open, onClose }: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const teacherLinks = [
    { to: '/teacher', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/teacher/submit', label: 'New request', icon: FilePlus2 },
    { to: '/teacher/requests', label: 'My requests', icon: FileText },
    { to: '/teacher/messages', label: 'Messages', icon: MessageSquare },
    { to: '/teacher/notifications', label: 'Notifications', icon: Bell },
    { to: '/teacher/profile', label: 'Profile', icon: User },
  ];
  const officerLinks = [
    { to: '/officer', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/officer/requests', label: 'Print requests', icon: FileText },
    { to: '/officer/messages', label: 'Messages', icon: MessageSquare },
    { to: '/officer/teachers', label: 'Teachers', icon: Users },
    { to: '/officer/import', label: 'Bulk import', icon: Upload },
    { to: '/officer/printers', label: 'Printers', icon: Printer },
    { to: '/officer/reports', label: 'Reports', icon: BarChart3 },
    { to: '/officer/history', label: 'Print history', icon: History },
    { to: '/officer/notifications', label: 'Notifications', icon: Bell },
    { to: '/officer/profile', label: 'Profile', icon: User },
  ];
  const links = user.role === 'TEACHER' ? teacherLinks : officerLinks;

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <>
      {open && <div className="no-print fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm lg:hidden" onClick={onClose} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 text-white transition-transform duration-300 lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-inset ring-white/25"><Printer className="h-5 w-5" /></span>
          <div>
            <span className="block text-lg font-bold leading-tight">SchoolPrint</span>
            <span className="block text-[10px] uppercase tracking-widest text-blue-200">Print management</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-widest text-blue-300/80">Menu</p>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/teacher' || l.to === '/officer'}
              onClick={onClose}
              className={({ isActive }) => `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-white text-blue-800 shadow-sm' : 'text-blue-100/85 hover:bg-white/10 hover:text-white'}`}
            >
              <l.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{l.label}</span>
              <ChevronRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-60" />
            </NavLink>
          ))}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-3">
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/40 text-xs font-bold ring-1 ring-inset ring-white/20">{user.fullName.charAt(0).toUpperCase()}</span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-white">{user.fullName}</span>
              <span className="block truncate text-[10px] text-blue-200">{user.role === 'OFFICER' ? 'Printing Officer' : 'Teacher'}</span>
            </span>
          </div>
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-blue-100/85 transition hover:bg-white/10 hover:text-white">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
