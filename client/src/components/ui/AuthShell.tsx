import React from 'react';
import { Printer } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: Props) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-800 via-blue-700 to-sky-600 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl shadow-blue-950/30">
        <div className="bg-gradient-to-r from-blue-800 to-blue-600 px-8 py-7 text-white">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-inset ring-white/25">
            <Printer className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-blue-100">{subtitle}</p>
        </div>
        <div className="p-8">{children}</div>
        {footer && <div className="border-t border-slate-100 bg-slate-50 px-8 py-4 text-center text-sm">{footer}</div>}
      </div>
      <p className="pointer-events-none fixed bottom-4 left-0 right-0 text-center text-xs text-white/70">SchoolPrint · Simple printing for schools</p>
    </div>
  );
}

export function AuthLink({ to, children }: { to: string; children: React.ReactNode }) {
  return <Link to={to} className="font-semibold text-blue-700 hover:text-blue-900 hover:underline">{children}</Link>;
}
