import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, CircleCheck, CircleX, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';

export default function PrintHistory() {
  const { data, isLoading } = useQuery({ queryKey: ['printJobs'], queryFn: async () => (await api.get('/print-jobs?limit=100')).data.data });
  const items = data?.items || [];

  return (
    <div>
      <PageHeader title="Print History" subtitle="A record of every print job and its outcome." icon={History} />
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Request</th><th>Title</th><th>Officer</th><th>Printer</th><th>Copies</th><th>Outcome</th><th>Printed at</th></tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="py-10 text-center text-slate-500">Loading history…</td></tr>}
            {!isLoading && items.length === 0 && <tr><td colSpan={7}><EmptyState icon={History} title="No print jobs yet" description="Jobs appear here as soon as an officer prints a document." /></td></tr>}
            {items.map((j: any) => {
              const success = j.outcome === 'SUCCESS' || j.outcome === 'REPRINT';
              return (
                <tr key={j._id}>
                  <td className="font-mono text-xs text-slate-500">{j.requestId?.requestNumber || '—'}</td>
                  <td className="max-w-xs truncate font-medium">{j.requestId?.title || '—'}</td>
                  <td>{j.officerId?.fullName || '—'}</td>
                  <td>{j.printerName || '—'}</td>
                  <td>{j.numberOfCopiesPrinted}</td>
                  <td><span className={`badge ring-1 ring-inset ${success ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-red-50 text-red-700 ring-red-200'}`}>
                    {success ? <CircleCheck className="h-3 w-3" /> : <CircleX className="h-3 w-3" />}{j.outcome}
                  </span></td>
                  <td className="whitespace-nowrap">{new Date(j.printedAt).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><RefreshCw className="h-3.5 w-3.5" /> This list updates when you print a document or when a page is refreshed.</p>
    </div>
  );
}
