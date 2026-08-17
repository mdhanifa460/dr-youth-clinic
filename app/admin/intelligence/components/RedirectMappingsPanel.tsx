'use client';

// URL Redirects — Phase 1 of the sitemap-driven migration mapping flow:
// import the old site's sitemap.xml → deterministic OLD→NEW matching →
// admin review/approve/reject. Lives inside the same Domain Migration
// surface as DomainMigrationIntelligence.tsx (rendered as an additional
// section there) rather than a second page, per the approved plan.
//
// Deliberately does NOT serve any redirects yet — that's Phase 3, a
// separate, separately-approved change (see the plan file). This panel
// only ever produces reviewed, approved RedirectMapping rows; nothing here
// affects live traffic.
import { useEffect, useState, useCallback } from 'react';
import { Loader2, UploadCloud, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Search } from 'lucide-react';

interface Mapping {
  _id: string;
  oldUrl: string;
  newUrl: string | null;
  matchType: 'exact' | 'rule' | 'ai' | 'manual' | null;
  confidence: number;
  confidenceLevel: 'High' | 'Medium' | 'Low' | null;
  status: 'suggested' | 'approved' | 'rejected' | 'no_match';
  reasoning: string;
  sitemapImportBatch: string;
}

function ConfidenceBadge({ level, confidence }: { level: Mapping['confidenceLevel']; confidence: number }) {
  if (!level) return <span className="text-[10px] text-gray-400">—</span>;
  const styles: Record<string, string> = {
    High: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Medium: 'bg-amber-50 text-amber-700 border-amber-200',
    Low: 'bg-gray-100 text-gray-500 border-gray-200',
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${styles[level]}`}>
      {level} · {confidence}%
    </span>
  );
}

function StatusPill({ status }: { status: Mapping['status'] }) {
  const map: Record<Mapping['status'], { label: string; cls: string }> = {
    suggested: { label: 'Needs Review', cls: 'bg-blue-50 text-blue-700' },
    approved: { label: 'Approved', cls: 'bg-emerald-50 text-emerald-700' },
    rejected: { label: 'Rejected', cls: 'bg-gray-100 text-gray-500' },
    no_match: { label: 'No Match', cls: 'bg-red-50 text-red-600' },
  };
  const { label, cls } = map[status];
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

export default function RedirectMappingsPanel() {
  const [rows, setRows] = useState<Mapping[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [batch, setBatch] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [xmlInput, setXmlInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [gscImporting, setGscImporting] = useState(false);

  const load = useCallback((batchId?: string | null) => {
    setLoading(true);
    const qs = batchId ? `?batch=${encodeURIComponent(batchId)}` : '';
    fetch(`/api/admin/domain-migration/redirect-mappings${qs}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) { setRows(d.data); setStatusCounts(d.statusCounts || {}); }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(batch); }, [batch, load]);

  async function importSitemap() {
    if (!xmlInput.trim() && !urlInput.trim()) { setError('Paste the sitemap XML or provide a URL to fetch it from.'); return; }
    setImporting(true); setError('');
    try {
      const res = await fetch('/api/admin/domain-migration/sitemap-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(xmlInput.trim() ? { xml: xmlInput } : { url: urlInput.trim() }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message || 'Import failed'); return; }
      const newBatch = data.data.batchId;
      // Run deterministic matching immediately so the admin sees real
      // suggestions right away instead of an empty "suggested, unmatched" list.
      await fetch(`/api/admin/domain-migration/sitemap-import/${newBatch}/match`, { method: 'POST' });
      setBatch(newBatch);
      setXmlInput(''); setUrlInput('');
    } catch {
      setError('Network error — please try again.');
    } finally {
      setImporting(false);
    }
  }

  async function importFromGsc() {
    setGscImporting(true); setError('');
    try {
      const res = await fetch('/api/admin/domain-migration/gsc-import', { method: 'POST' });
      const data = await res.json();
      if (!data.success) { setError(data.message || 'Search Console import failed'); return; }
      const newBatch = data.data.batchId;
      await fetch(`/api/admin/domain-migration/sitemap-import/${newBatch}/match`, { method: 'POST' });
      setBatch(newBatch);
    } catch {
      setError('Network error — please try again.');
    } finally {
      setGscImporting(false);
    }
  }

  async function updateRow(id: string, patch: { status?: string; newUrl?: string }) {
    const res = await fetch(`/api/admin/domain-migration/redirect-mappings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!data.success) { setError(data.message || 'Update failed'); return; }
    setError('');
    load(batch);
  }

  async function bulkApprove() {
    if (!batch) return;
    const res = await fetch('/api/admin/domain-migration/redirect-mappings/bulk-approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch, minConfidence: 80 }),
    });
    const data = await res.json();
    if (!data.success) { setError(data.message || 'Bulk approve failed'); return; }
    load(batch);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50">
        <p className="text-sm font-bold text-[#0B2560]">URL Redirects — Old Sitemap Import</p>
        <p className="text-[11px] text-gray-400 mt-0.5">
          Import the old site's sitemap.xml, review AI/rules-suggested OLD→NEW mappings, and approve them. Review-only for now —
          approved mappings don't serve live redirects yet (a separate, separately-reviewed step).
        </p>
      </div>

      {/* Import */}
      <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <textarea
            value={xmlInput}
            onChange={(e) => setXmlInput(e.target.value)}
            placeholder="Paste the old sitemap.xml content here…"
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#0B2560]"
          />
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="…or a URL: https://dryouthclinic.co.in/sitemap.xml"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#0B2560]"
            />
            <button
              onClick={importSitemap}
              disabled={importing}
              className="inline-flex items-center justify-center gap-2 bg-[#0B2560] text-white px-4 py-2 rounded-xl font-semibold text-xs hover:bg-[#0d2d72] transition disabled:opacity-50"
            >
              {importing ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
              Import &amp; Suggest Matches
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[11px] text-gray-400">or, in addition —</span>
          <button
            onClick={importFromGsc}
            disabled={gscImporting}
            className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg font-semibold text-[11px] hover:border-[#0B2560] hover:text-[#0B2560] transition disabled:opacity-50"
          >
            {gscImporting ? <Loader2 size={11} className="animate-spin" /> : <Search size={11} />}
            Pull historically-indexed URLs from Search Console
          </button>
          <span className="text-[10px] text-gray-400">
            Uses the old-domain site URL already set in Settings → Analytics → Domain Migration.
          </span>
        </div>
        {error && (
          <p className="flex items-center gap-1.5 text-[11px] text-red-600"><AlertTriangle size={11} /> {error}</p>
        )}
      </div>

      {/* Batch summary / bulk actions */}
      {batch && (
        <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 text-[11px] text-gray-500">
            <span>Needs Review: <strong className="text-gray-800">{statusCounts.suggested || 0}</strong></span>
            <span>Approved: <strong className="text-gray-800">{statusCounts.approved || 0}</strong></span>
            <span>No Match: <strong className="text-gray-800">{statusCounts.no_match || 0}</strong></span>
            <span>Rejected: <strong className="text-gray-800">{statusCounts.rejected || 0}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => load(batch)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 hover:text-[#0B2560]">
              <RefreshCw size={11} /> Refresh
            </button>
            <button
              onClick={bulkApprove}
              className="inline-flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-semibold text-[11px] hover:bg-emerald-700 transition"
            >
              <CheckCircle2 size={12} /> Approve all High-confidence (≥80%)
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-300" size={20} /></div>
      ) : rows.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-10">
          {batch ? 'No mappings for this import yet.' : 'Import an old sitemap above to get started.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                {['Old URL', 'Suggested New URL', 'Confidence', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row) => (
                <tr key={row._id} className={row.status === 'no_match' ? 'bg-red-50/30' : ''}>
                  <td className="px-4 py-3 font-mono text-[11px] text-gray-700 max-w-[220px] truncate">{row.oldUrl}</td>
                  <td className="px-4 py-3 font-mono text-[11px]">
                    {editingId === row._id ? (
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => { updateRow(row._id, { newUrl: editValue }); setEditingId(null); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        className="border border-gray-200 rounded px-2 py-1 text-[11px] w-full"
                      />
                    ) : (
                      <button
                        onClick={() => { setEditingId(row._id); setEditValue(row.newUrl || ''); }}
                        className="text-left text-gray-700 hover:text-[#0B2560] hover:underline"
                        title="Click to edit"
                      >
                        {row.newUrl || <span className="text-gray-400 italic">— none —</span>}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3"><ConfidenceBadge level={row.confidenceLevel} confidence={row.confidence} /></td>
                  <td className="px-4 py-3"><StatusPill status={row.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {row.status !== 'approved' && (
                        <button
                          onClick={() => updateRow(row._id, { status: 'approved' })}
                          disabled={!row.newUrl}
                          className="text-emerald-600 hover:text-emerald-800 disabled:opacity-30 disabled:cursor-not-allowed"
                          title={row.newUrl ? 'Approve' : 'Set a new URL first'}
                        >
                          <CheckCircle2 size={15} />
                        </button>
                      )}
                      {row.status !== 'rejected' && (
                        <button onClick={() => updateRow(row._id, { status: 'rejected' })} className="text-gray-400 hover:text-red-600" title="Reject">
                          <XCircle size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
