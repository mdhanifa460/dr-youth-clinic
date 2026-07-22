'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, Trash2, ChevronRight, ChevronLeft, Search, ExternalLink } from 'lucide-react';
import ImageUpload from '@/app/admin/components/ImageUpload';
import VideoUpload from '@/app/admin/components/VideoUpload';

const BRANCHES = ['all', 'chennai', 'bangalore', 'coimbatore', 'kochi'];
const PAGE_SIZE = 8;

const EMPTY: any = {
  title: '', slug: '', description: '', category: '',
  before: { url: '', publicId: '' },
  after: { url: '', publicId: '' },
  beforeImages: [], afterImages: [], gallery: [],
  video: { url: '', publicId: '' },
  service: '', doctor: '', branch: '',
  sessions: '', duration: '', patientAge: '',
  featured: false, status: 'published', order: 0,
  seoTitle: '', seoDescription: '',
};

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer pb-2" onClick={onChange}>
      <div className={`relative rounded-full transition-colors ${checked ? 'bg-green-500' : 'bg-gray-200'}`} style={{ width: '40px', height: '22px' }}>
        <div className="absolute top-0.5 bg-white rounded-full shadow transition-transform"
          style={{ width: '18px', height: '18px', transform: checked ? 'translateX(18px)' : 'translateX(2px)' }} />
      </div>
      <span className="text-xs font-semibold text-gray-600">{label}</span>
    </label>
  );
}

function MultiImageField({ label, folder, images, onChange }: { label: string; folder: string; images: any[]; onChange: (imgs: any[]) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</label>
        <span className="text-[10px] text-gray-400">{images.length} image{images.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-2">
        {images.map((img, i) => (
          <div key={i} className="relative rounded-xl overflow-hidden border border-gray-100 aspect-square">
            <img src={img.url} alt="" className="w-full h-full object-cover" />
            <button type="button" onClick={() => onChange(images.filter((_, idx) => idx !== i))}
              className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600 transition">
              <Trash2 size={10} />
            </button>
          </div>
        ))}
      </div>
      <ImageUpload onUpload={(v) => onChange([...images, v])} folder={folder} label={`Add ${label.toLowerCase()}`} />
    </div>
  );
}

// ── Result list item ──
function ResultItem({ result, selected, onSelect }: { result: any; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-4 py-3.5 border-b border-gray-100 transition hover:bg-[#f6faff] flex items-center gap-3 ${
        selected ? 'bg-[#eef4ff] border-l-2 border-l-[#0B2560]' : ''
      }`}
    >
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0 flex">
        {result.before?.url ? (
          <img src={result.before.url} alt="" className="w-1/2 h-full object-cover" />
        ) : <div className="w-1/2 h-full bg-gray-100" />}
        {result.after?.url ? (
          <img src={result.after.url} alt="" className="w-1/2 h-full object-cover" />
        ) : <div className="w-1/2 h-full bg-gray-200" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          {result.category && (
            <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-[#3B82C4]">{result.category}</span>
          )}
          {result.featured && <span className="text-[10px]">⭐</span>}
        </div>
        <p className="text-sm font-semibold text-[#0B2560] leading-snug line-clamp-1">{result.title || 'Untitled'}</p>
      </div>
      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${
        result.status === 'draft' ? 'bg-gray-100 text-gray-500' : 'bg-green-50 text-green-600'
      }`}>{result.status || 'published'}</span>
    </button>
  );
}

// ── Result form ──
function ResultForm({ result, services, doctors, onSaved, onDeleted, onCancel }: {
  result: any | null;
  services: any[];
  doctors: any[];
  onSaved: (r: any) => void;
  onDeleted: (id: string) => void;
  onCancel: () => void;
}) {
  const isNew = !result?._id;
  const [form, setForm] = useState<any>(result ? {
    ...EMPTY, ...result,
    service: result.service?._id || result.service || '',
    doctor: result.doctor?._id || result.doctor || '',
  } : { ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const set = (key: string, val: any) => setForm((f: any) => ({ ...f, [key]: val }));

  const save = async () => {
    if (!form.title.trim()) return setError('Title is required');
    setSaving(true); setError('');
    try {
      const payload = { ...form, order: Number(form.order) || 0 };
      const url = isNew ? '/api/admin/results' : `/api/admin/results/${result._id}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) onSaved(data.data);
      else setError(data.message || 'Save failed');
    } catch { setError('Network error'); }
    finally { setSaving(false); }
  };

  const del = async () => {
    if (!confirm(`Delete "${form.title}"?`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/results/${result._id}`, { method: 'DELETE' });
      onDeleted(result._id);
    } catch { setError('Delete failed'); }
    finally { setDeleting(false); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
        <div>
          <h2 className="text-base font-bold text-[#0B2560]">{isNew ? 'New Result' : 'Edit Result'}</h2>
          {!isNew && <p className="text-xs text-gray-400 mt-0.5">{result.title}</p>}
        </div>
        <div className="flex items-center gap-3">
          {!isNew && form.status === 'published' && form.slug && (
            <a href={`/results/${form.slug}`} target="_blank" rel="noopener noreferrer"
              className="text-xs text-[#3B82C4] font-semibold flex items-center gap-1 hover:underline">
              View live <ExternalLink size={11} />
            </a>
          )}
          <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600 font-semibold">Cancel</button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2">{error}</p>}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="e.g. Acne Therapy & Scar Solution"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 focus:border-[#0B2560]" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Slug</label>
            <input value={form.slug} onChange={e => set('slug', e.target.value)}
              placeholder="auto-generated from title if left blank"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
            {form.slug && <p className="text-[11px] text-gray-400 mt-1">/results/{form.slug}</p>}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="Short description of the treatment/result..."
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 resize-none" />
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Category</label>
          <input value={form.category} onChange={e => set('category', e.target.value)}
            placeholder="e.g. Skin Care, Hair, Laser"
            list="results-categories"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
          <p className="text-[11px] text-gray-400 mt-1">
            Controls the filter tab this result shows under on the <a href="/results" target="_blank" rel="noopener noreferrer" className="underline">/results</a> page.
          </p>
        </div>

        {/* Service / Doctor / Branch */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Service</label>
            <select value={form.service} onChange={e => set('service', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20">
              <option value="">— None —</option>
              {services.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Doctor</label>
            <select value={form.doctor} onChange={e => set('doctor', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20">
              <option value="">— None —</option>
              {doctors.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Branch</label>
            <select value={form.branch} onChange={e => set('branch', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20">
              <option value="">— None —</option>
              {BRANCHES.map(b => <option key={b} value={b} className="capitalize">{b === 'all' ? 'All Branches' : b.charAt(0).toUpperCase() + b.slice(1)}</option>)}
            </select>
          </div>
        </div>

        {/* Primary Before / After — drives homepage carousel + listing card + comparison slider */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Primary Before / After</p>
          <p className="text-[11px] text-gray-400 mb-2">Used for the comparison slider on the card and detail page hero.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-2 block">Before Image</label>
              {form.before?.url && (
                <div className="relative mb-2 rounded-xl overflow-hidden border border-gray-100 aspect-square w-full max-w-[160px]">
                  <img src={form.before.url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => set('before', { url: '', publicId: '' })}
                    className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition">
                    <Trash2 size={11} />
                  </button>
                </div>
              )}
              <ImageUpload onUpload={v => set('before', v)} folder="dr-youth-clinic/results" label="Upload Before" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-2 block">After Image</label>
              {form.after?.url && (
                <div className="relative mb-2 rounded-xl overflow-hidden border border-gray-100 aspect-square w-full max-w-[160px]">
                  <img src={form.after.url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => set('after', { url: '', publicId: '' })}
                    className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition">
                    <Trash2 size={11} />
                  </button>
                </div>
              )}
              <ImageUpload onUpload={v => set('after', v)} folder="dr-youth-clinic/results" label="Upload After" />
            </div>
          </div>
        </div>

        {/* Multi-image galleries */}
        <div className="grid sm:grid-cols-2 gap-4">
          <MultiImageField label="Additional Before Images" folder="dr-youth-clinic/results" images={form.beforeImages || []} onChange={(v) => set('beforeImages', v)} />
          <MultiImageField label="Additional After Images" folder="dr-youth-clinic/results" images={form.afterImages || []} onChange={(v) => set('afterImages', v)} />
        </div>
        <MultiImageField label="Gallery Images" folder="dr-youth-clinic/results" images={form.gallery || []} onChange={(v) => set('gallery', v)} />

        {/* Video */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Video (Optional)</label>
          {form.video?.url && (
            <div className="mb-2 flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
              <span className="text-xs text-gray-500 truncate">{form.video.url}</span>
              <button type="button" onClick={() => set('video', { url: '', publicId: '' })} className="text-gray-300 hover:text-red-500 shrink-0 ml-2">
                <Trash2 size={13} />
              </button>
            </div>
          )}
          <VideoUpload onUpload={v => set('video', v)} label="Upload Video" />
        </div>

        {/* Sessions / Duration / Age */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Sessions</label>
            <input value={form.sessions} onChange={e => set('sessions', e.target.value)}
              placeholder="e.g. 6 sessions"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Duration</label>
            <input value={form.duration} onChange={e => set('duration', e.target.value)}
              placeholder="e.g. 3 months"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Patient Age (Optional)</label>
            <input value={form.patientAge} onChange={e => set('patientAge', e.target.value)}
              placeholder="e.g. 28"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
          </div>
        </div>

        {/* SEO */}
        <div className="rounded-xl border border-gray-100 p-4 space-y-3 bg-gray-50/50">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">SEO</p>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 mb-1 block">SEO Title</label>
            <input value={form.seoTitle} onChange={e => set('seoTitle', e.target.value)}
              placeholder="Falls back to Title if left blank"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 mb-1 block">SEO Description</label>
            <textarea value={form.seoDescription} onChange={e => set('seoDescription', e.target.value)}
              placeholder="Falls back to Description if left blank" rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 resize-none" />
          </div>
        </div>

        {/* Order + Featured + Status */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Display Order</label>
            <input type="number" value={form.order} onChange={e => set('order', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
          </div>
          <div className="flex items-end">
            <Toggle checked={!!form.featured} onChange={() => set('featured', !form.featured)} label="Featured" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20">
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
        {!isNew ? (
          <button onClick={del} disabled={deleting}
            className="flex items-center gap-1.5 text-red-500 hover:text-red-700 text-sm font-semibold transition disabled:opacity-50">
            <Trash2 size={14} /> {deleting ? 'Deleting…' : 'Delete'}
          </button>
        ) : <div />}
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 bg-[#0B2560] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:-translate-y-0.5 transition shadow-lg disabled:opacity-60">
          {saving ? 'Saving…' : isNew ? 'Create Result' : 'Save Changes'}
          {!saving && <ChevronRight size={14} />}
        </button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function ResultsAdminPage() {
  const [results, setResults] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/results');
      const data = await res.json();
      if (data.success) setResults(data.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch('/api/admin/services').then(r => r.json()).then(d => { if (d.success) setServices(d.data); }).catch(() => {});
    fetch('/api/admin/doctors').then(r => r.json()).then(d => { if (d.success) setDoctors(d.data); }).catch(() => {});
  }, []);

  const usedCategories = Array.from(new Set(results.map(r => r.category).filter(Boolean)));

  const filtered = useMemo(() => {
    let list = results;
    if (statusFilter) list = list.filter(r => (r.status || 'published') === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(r => r.title?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q) || r.category?.toLowerCase().includes(q));
    }
    return list;
  }, [results, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paged = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const openNew = () => { setSelected(null); setIsNew(true); };
  const openEdit = (r: any) => { setSelected(r); setIsNew(false); };
  const close = () => { setSelected(null); setIsNew(false); };

  const onSaved = (r: any) => {
    setResults(prev => {
      const idx = prev.findIndex(p => p._id === r._id);
      return idx >= 0 ? prev.map(p => p._id === r._id ? r : p) : [r, ...prev];
    });
    close();
  };

  const onDeleted = (id: string) => {
    setResults(prev => prev.filter(p => p._id !== id));
    close();
  };

  const showForm = isNew || selected;

  return (
    <div className="-m-6 flex flex-col h-screen bg-white overflow-hidden">
      <datalist id="results-categories">
        {usedCategories.map(c => <option key={c} value={c} />)}
      </datalist>

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white shrink-0">
        <div>
          <h1 className="text-lg font-bold text-[#0B2560]">Before / After Results</h1>
          <p className="text-xs text-gray-400">{results.length} result{results.length !== 1 ? 's' : ''} · {results.filter(r => (r.status || 'published') === 'published').length} published</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-[#0B2560] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:-translate-y-0.5 transition shadow-lg shadow-[#0B2560]/20">
          <Plus size={15} /> Add Result
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-80 shrink-0 border-r border-gray-100 flex flex-col overflow-hidden">
          {/* Search + status filter */}
          <div className="p-3 border-b border-gray-100 space-y-2 shrink-0">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search results..."
                className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
            </div>
            <div className="flex gap-1">
              {['', 'published', 'draft'].map(s => (
                <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition ${
                    statusFilter === s ? 'bg-[#0B2560] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}>
                  {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>
            ) : paged.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-3xl mb-2">📸</p>
                <p className="text-sm font-semibold">No results found</p>
                {results.length === 0 && <p className="text-xs mt-1">Click "Add Result" to get started</p>}
              </div>
            ) : (
              paged.map(r => (
                <ResultItem key={r._id} result={r} selected={selected?._id === r._id} onSelect={() => openEdit(r)} />
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 shrink-0">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pageSafe <= 1}
                className="text-gray-400 hover:text-[#0B2560] disabled:opacity-30 disabled:hover:text-gray-400">
                <ChevronLeft size={16} />
              </button>
              <span className="text-[11px] text-gray-400 font-medium">Page {pageSafe} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={pageSafe >= totalPages}
                className="text-gray-400 hover:text-[#0B2560] disabled:opacity-30 disabled:hover:text-gray-400">
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="flex-1 overflow-hidden">
          {showForm ? (
            <ResultForm
              key={selected?._id ?? 'new'}
              result={isNew ? null : selected}
              services={services}
              doctors={doctors}
              onSaved={onSaved}
              onDeleted={onDeleted}
              onCancel={close}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-4">
              <div className="w-20 h-20 rounded-3xl bg-gray-50 flex items-center justify-center text-4xl shadow-inner">📸</div>
              <div>
                <p className="font-semibold text-gray-500 text-base">Select a result to edit</p>
                <p className="text-sm mt-1">or</p>
              </div>
              <button onClick={openNew}
                className="flex items-center gap-2 bg-[#0B2560] text-white px-6 py-3 rounded-2xl font-bold text-sm hover:-translate-y-0.5 transition shadow-lg">
                <Plus size={15} /> Create New Result
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
