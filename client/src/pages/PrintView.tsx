import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Printer, FileText, Download, CircleCheck, Info, MousePointerClick, Clock3, ShieldCheck, TriangleAlert } from 'lucide-react';
import api from '../lib/api';
import { PrintButton } from '../components/PrintButton';
import { ChatButton } from '../components/ChatButton';
import { documentUrl } from '../lib/print';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';

export default function PrintView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: request, isLoading } = useQuery({
    queryKey: ['request', id],
    queryFn: async () => (await api.get(`/requests/${id}`)).data.data,
    enabled: !!id,
  });

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading request…</div>;
  if (!request) return <div className="p-8 text-center text-slate-500">Request not found.</div>;

  const doc = request.documentId;
  const settings = [
    { label: 'Copies', value: `${request.numberOfCopies}` },
    { label: 'Paper', value: request.paperSize },
    { label: 'Orientation', value: request.orientation },
    { label: 'Colour', value: request.printingType?.replace('_', ' ') },
    { label: 'Sides', value: request.sides },
    { label: 'Pages', value: request.pageSelection === 'CUSTOM' ? request.pageRange || 'Custom' : 'All' },
  ];

  const reportProblem = async () => {
    try {
      await api.post('/print-jobs', {
        requestId: id,
        numberOfCopiesPrinted: request.numberOfCopies,
        outcome: 'FAILED',
        failureReason: 'Reported by officer from the print screen',
      });
      toast('Print failure recorded. The teacher has been notified.', 'success');
      qc.invalidateQueries();
      navigate(`/requests/${id}`);
    } catch (err: any) {
      toast(err?.response?.data?.message || 'Could not record the problem.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="no-print border-b border-blue-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="btn-ghost btn-sm"><ArrowLeft className="h-4 w-4" /> Back</button>
          <div className="flex items-center gap-2 font-semibold text-blue-800"><Printer className="h-5 w-5" /> SchoolPrint</div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
        <div className="rounded-2xl bg-gradient-to-br from-blue-700 to-blue-900 p-6 text-white shadow-card md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-blue-100">Print request</p>
              <h1 className="mt-1 text-2xl font-bold md:text-3xl">{request.title}</h1>
              <p className="mt-1 font-mono text-sm text-blue-200">{request.requestNumber}</p>
            </div>
            <StatusBadge status={request.status} />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {settings.map((s) => <span key={s.label} className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-inset ring-white/20">{s.label}: {s.value}</span>)}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="card lg:col-span-3">
            <div className="card-header">
              <div className="card-title"><CircleCheck className="h-4 w-4 text-emerald-600" /> Ready to print</div>
            </div>
            <div className="card-body space-y-4">
              <div className="flex items-start gap-3 rounded-xl bg-blue-50 p-4">
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                <div>
                  <p className="font-semibold text-slate-900">{doc?.originalName || 'No document attached'}</p>
                  <p className="text-sm text-slate-600">{doc?.fileType} · {doc?.size ? `${Math.round(doc.size / 1024)} KB` : 'size unavailable'}</p>
                </div>
              </div>

              {doc ? (
                <PrintButton request={request} size="lg" full />
              ) : (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">This request has no document. Contact the teacher to upload one.</p>
              )}

              <div className="flex flex-wrap gap-2">
                {doc && <a href={documentUrl(doc._id, 'download')} className="btn-secondary"><Download className="h-4 w-4" /> Download original</a>}
                <ChatButton request={request} label="Chat with teacher" />
                <Button variant="ghost" onClick={reportProblem} icon={TriangleAlert}>Report a problem</Button>
                <Link to={`/requests/${request._id}`} className="btn-ghost">View request</Link>
              </div>

              <p className="flex items-start gap-2 text-xs text-slate-500">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                Pages, copies, colour and paper are baked into the print file before the dialog opens. Keep <strong>Copies = 1</strong> and <strong>Pages = All</strong> in the dialog; only choose the printer and, if requested, <strong>Double-sided</strong> (browsers cannot set duplex). The job is recorded automatically.
              </p>
            </div>
          </div>

          <div className="card lg:col-span-2">
            <div className="card-header"><div className="card-title"><MousePointerClick className="h-4 w-4 text-blue-700" /> How it works</div></div>
            <div className="card-body space-y-4">
              {[
                { icon: Printer, title: '1. Click Print now', text: 'Pages, copies, colour and paper are prepared in the background.' },
                { icon: Clock3, title: '2. Confirm in your browser', text: 'Keep Copies = 1, pick the printer (and duplex if asked), then Print.' },
                { icon: ShieldCheck, title: '3. We record it', text: 'A print job is saved and the teacher is notified.' },
              ].map((step) => (
                <div key={step.title} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700"><step.icon className="h-4 w-4" /></span>
                  <div><p className="text-sm font-semibold text-slate-800">{step.title}</p><p className="text-xs text-slate-500">{step.text}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
