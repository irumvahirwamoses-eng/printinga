import React from 'react';
import { CheckCircle2, CircleDot, Clock3, LoaderCircle, Printer, PackageCheck, XCircle, Ban, CircleSlash, TriangleAlert } from 'lucide-react';

const config: Record<string, { className: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: { className: 'bg-amber-50 text-amber-700 ring-amber-200', icon: Clock3 },
  ACCEPTED: { className: 'bg-blue-50 text-blue-700 ring-blue-200', icon: CheckCircle2 },
  PROCESSING: { className: 'bg-indigo-50 text-indigo-700 ring-indigo-200', icon: LoaderCircle },
  PRINTING: { className: 'bg-sky-50 text-sky-700 ring-sky-200', icon: Printer },
  PRINTED: { className: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: CheckCircle2 },
  READY_FOR_COLLECTION: { className: 'bg-teal-50 text-teal-700 ring-teal-200', icon: PackageCheck },
  COLLECTED: { className: 'bg-slate-100 text-slate-700 ring-slate-200', icon: CircleDot },
  REJECTED: { className: 'bg-red-50 text-red-700 ring-red-200', icon: XCircle },
  CANCELLED: { className: 'bg-slate-100 text-slate-600 ring-slate-200', icon: Ban },
  FAILED: { className: 'bg-red-50 text-red-800 ring-red-200', icon: TriangleAlert },
};

export function StatusBadge({ status }: { status: string }) {
  const item = config[status] || { className: 'bg-slate-100 text-slate-600 ring-slate-200', icon: CircleSlash };
  const Icon = item.icon;
  return (
    <span className={`badge ring-1 ring-inset ${item.className}`}>
      <Icon className="h-3 w-3" />
      {status.replace(/_/g, ' ')}
    </span>
  );
}
