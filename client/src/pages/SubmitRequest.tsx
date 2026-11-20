import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePlus2, UploadCloud, Settings2, FileText, Send, CircleAlert, CheckCircle2 } from 'lucide-react';
import api from '../lib/api';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';

export default function SubmitRequest() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '', numberOfPages: 1, numberOfCopies: 1, printingType: 'BLACK_AND_WHITE', paperSize: 'A4',
    sides: 'SINGLE', pageSelection: 'ALL', pageRange: '', orientation: 'PORTRAIT', priority: 'NORMAL',
    description: '', requestedCompletionDate: '',
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (!file) { setError('Please upload a PDF or DOCX document.'); return; }
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', file);
      const up = await api.post('/documents/upload', fd);
      const documentId = up.data.data.id;
      const payload: any = { ...form, documentId, numberOfPages: Number(form.numberOfPages), numberOfCopies: Number(form.numberOfCopies) };
      if (payload.pageSelection !== 'CUSTOM') delete payload.pageRange;
      if (!payload.requestedCompletionDate) delete payload.requestedCompletionDate;
      const res = await api.post('/requests', payload);
      toast('Your print request has been submitted.', 'success');
      navigate(`/requests/${res.data.data._id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to submit your request. Please try again.');
    } finally { setUploading(false); }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="New Print Request" subtitle="Fill in the details below and we'll take care of the rest." icon={FilePlus2} />

      <form onSubmit={submit} className="space-y-5">
        <section className="card">
          <div className="card-header"><div className="card-title"><FileText className="h-4 w-4 text-blue-700" /> 1. Your document</div></div>
          <div className="card-body space-y-4">
            <div>
              <label className="label" htmlFor="title">Document title</label>
              <input id="title" className="input" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Grade 9 Science Worksheet" required />
            </div>
            <div>
              <label className="label" htmlFor="file">Upload file (PDF or DOCX, max 10 MB)</label>
              <label htmlFor="file" className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-7 text-center transition ${file ? 'border-emerald-300 bg-emerald-50' : 'border-blue-200 bg-blue-50/50 hover:border-blue-400 hover:bg-blue-50'}`}>
                {file ? <CheckCircle2 className="h-7 w-7 text-emerald-600" /> : <UploadCloud className="h-7 w-7 text-blue-600" />}
                <span className="mt-2 text-sm font-semibold text-slate-800">{file ? file.name : 'Click to choose a file'}</span>
                <span className="mt-0.5 text-xs text-slate-500">{file ? `${Math.round(file.size / 1024)} KB selected` : 'PDF or DOCX only'}</span>
                <input id="file" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
              </label>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-header"><div className="card-title"><Settings2 className="h-4 w-4 text-blue-700" /> 2. Printing preferences</div></div>
          <div className="card-body grid gap-4 md:grid-cols-2">
            <div>
              <label className="label" htmlFor="pages">Number of pages in document</label>
              <input id="pages" type="number" min={1} className="input" value={form.numberOfPages} onChange={(e) => set('numberOfPages', e.target.value)} required />
            </div>
            <div>
              <label className="label" htmlFor="copies">Number of copies</label>
              <input id="copies" type="number" min={1} className="input" value={form.numberOfCopies} onChange={(e) => set('numberOfCopies', e.target.value)} required />
            </div>
            <div>
              <label className="label" htmlFor="colour">Colour</label>
              <select id="colour" className="input" value={form.printingType} onChange={(e) => set('printingType', e.target.value)}>
                <option value="BLACK_AND_WHITE">Black and white</option><option value="COLOUR">Colour</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="paper">Paper size</label>
              <select id="paper" className="input" value={form.paperSize} onChange={(e) => set('paperSize', e.target.value)}>
                <option value="A4">A4</option><option value="A3">A3</option><option value="A5">A5</option><option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="sides">Sides</label>
              <select id="sides" className="input" value={form.sides} onChange={(e) => set('sides', e.target.value)}>
                <option value="SINGLE">Single-sided</option><option value="DOUBLE">Double-sided</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="orientation">Orientation</label>
              <select id="orientation" className="input" value={form.orientation} onChange={(e) => set('orientation', e.target.value)}>
                <option value="PORTRAIT">Portrait</option><option value="LANDSCAPE">Landscape</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="selection">Pages to print</label>
              <select id="selection" className="input" value={form.pageSelection} onChange={(e) => set('pageSelection', e.target.value)}>
                <option value="ALL">All pages</option><option value="CUSTOM">Custom range</option>
              </select>
            </div>
            {form.pageSelection === 'CUSTOM' && (
              <div>
                <label className="label" htmlFor="range">Page range</label>
                <input id="range" className="input" placeholder="e.g. 1-5, 8" value={form.pageRange} onChange={(e) => set('pageRange', e.target.value)} required />
              </div>
            )}
            <div>
              <label className="label" htmlFor="priority">Priority</label>
              <select id="priority" className="input" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                <option value="NORMAL">Normal</option><option value="URGENT">Urgent</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="due">Needed by (optional)</label>
              <input id="due" type="date" className="input" value={form.requestedCompletionDate} onChange={(e) => set('requestedCompletionDate', e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="label" htmlFor="instructions">Additional instructions (optional)</label>
              <textarea id="instructions" className="input" rows={3} placeholder="Anything the printing officer should know…" value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>
          </div>
        </section>

        {error && <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}</div>}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" icon={Send} loading={uploading}>{uploading ? 'Submitting…' : 'Submit request'}</Button>
          <p className="text-xs text-slate-500">You'll be able to track your request and message the printing officer afterwards.</p>
        </div>
      </form>
    </div>
  );
}
