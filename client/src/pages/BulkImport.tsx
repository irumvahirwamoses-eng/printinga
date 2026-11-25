import React, { useState } from 'react';
import { UploadCloud, FileSpreadsheet, Eye, CheckCircle2, Download, CircleAlert } from 'lucide-react';
import api from '../lib/api';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';

export default function BulkImport() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const doPreview = async () => {
    if (!file) return; setLoading(true); setError(''); setResult(null);
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await api.post('/teachers/bulk-import/preview', fd);
      setPreview(res.data.data);
    } catch (err: any) { setError(err?.response?.data?.message || 'Preview failed.'); }
    finally { setLoading(false); }
  };

  const doConfirm = async () => {
    if (!file) return; setLoading(true); setError('');
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await api.post('/teachers/bulk-import', fd);
      setResult(res.data.data);
      toast('Teacher import completed.', 'success');
    } catch (err: any) { setError(err?.response?.data?.message || 'Import failed.'); }
    finally { setLoading(false); }
  };

  const downloadCredentials = () => {
    if (!result?.credentials) return;
    const header = 'Full Name,National ID (masked),Default Password\n';
    const rows = result.credentials.map((c: any) => `"${String(c.fullName).replace(/"/g, '""')}","${String(c.nationalIdMasked).replace(/"/g, '""')}","${String(c.tempPassword).replace(/"/g, '""')}"`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'import-credentials.csv'; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader title="Bulk Teacher Import" subtitle="Add many teachers at once from a spreadsheet." icon={FileSpreadsheet} />

      <section className="card mb-5">
        <div className="card-header"><div className="card-title"><UploadCloud className="h-4 w-4 text-blue-700" /> Upload file</div></div>
        <div className="card-body space-y-4">
          <p className="text-sm text-slate-600">Upload an Excel (<strong>.xlsx</strong>) or <strong>.csv</strong> file. Required columns: <strong>Full Name</strong>, <strong>National ID</strong>. Optional: Email, Phone Number, Department.</p>
          <input type="file" accept=".xlsx,.csv" className="input" onChange={(e) => { setFile(e.target.files?.[0] || null); setPreview(null); setResult(null); }} />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={Eye} loading={loading} disabled={!file} onClick={doPreview}>Preview rows</Button>
            <Button icon={CheckCircle2} loading={loading} disabled={!file || !preview || loading || preview.validCount === 0} onClick={doConfirm}>
              Confirm import ({preview?.validCount || 0} valid)
            </Button>
          </div>
          {error && <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}</div>}
        </div>
      </section>

      {preview && (
        <section className="card mb-5">
          <div className="card-header">
            <div className="card-title">Preview</div>
            <div className="flex gap-2">
              <span className="chip text-emerald-700 ring-emerald-200 bg-emerald-50">{preview.validCount} valid</span>
              <span className="chip text-red-700 ring-red-200 bg-red-50">{preview.invalidCount} invalid</span>
              <span className="chip">of {preview.total} rows</span>
            </div>
          </div>
          <div className="table-wrap max-h-96 border-0 rounded-none">
            <table className="table">
              <thead><tr><th>Row</th><th>Full name</th><th>National ID</th><th>Department</th><th>Status</th><th>Errors</th></tr></thead>
              <tbody>{preview.rows.map((r: any, i: number) => (
                <tr key={i} className={r.valid ? '' : 'bg-red-50/50'}>
                  <td className="text-slate-500">{r._row}</td><td>{r.fullName}</td>
                  <td className="font-mono text-xs">{r.nationalId ? `****${String(r.nationalId).slice(-4)}` : '—'}</td>
                  <td>{r.department || '—'}</td>
                  <td>{r.valid ? <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200">Valid</span> : <span className="badge bg-red-50 text-red-700 ring-1 ring-inset ring-red-200">Invalid</span>}</td>
                  <td className="text-xs text-red-700">{r.errors?.join('; ')}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      )}

      {result && (
        <section className="card border-emerald-200">
          <div className="card-header"><div className="card-title text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Import complete</div></div>
          <div className="card-body space-y-3">
            <p className="text-sm text-slate-700">Imported: <strong>{result.imported}</strong> · Failed/Skipped: <strong>{result.failed}</strong> · Total: <strong>{result.total}</strong></p>
            <Button icon={Download} onClick={downloadCredentials}>Download credentials report (CSV)</Button>
            <p className="text-xs text-slate-500">All imported teachers start with the default password <strong className="font-mono">changeme</strong>. They will be asked to change it on first login.</p>
          </div>
        </section>
      )}
    </div>
  );
}
