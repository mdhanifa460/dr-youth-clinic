'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, ChevronRight, Search, Sparkles, Loader2, X } from 'lucide-react';

const EMPTY: any = {
  question: '', answer: '', category: '', tags: [], doctor: '', service: '', location: '',
  featured: false, order: 0, active: true, seoTitle: '', seoDescription: '',
};

function FaqForm({ faq, doctors, services, onSaved, onDeleted, onCancel }: any) {
  const isNew = !faq?._id;
  const [form, setForm] = useState<any>(faq ? { ...faq, doctor: faq.doctor?._id || faq.doctor || '', service: faq.service?._id || faq.service || '' } : { ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.question.trim() || !form.answer.trim()) return setError('Question and answer are required');
    setSaving(true); setError('');
    try {
      const url = isNew ? '/api/admin/faqs' : `/api/admin/faqs/${faq._id}`;
      const res = await fetch(url, { method: isNew ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) onSaved(data.data); else setError(data.message || 'Save failed');
    } catch { setError('Network error'); }
    finally { setSaving(false); }
  };

  const del = async () => {
    if (!confirm('Delete this FAQ?')) return;
    await fetch(`/api/admin/faqs/${faq._id}`, { method: 'DELETE' });
    onDeleted(faq._id);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
        <h2 className="text-base font-bold text-[#0B2560]">{isNew ? 'New FAQ' : 'Edit FAQ'}</h2>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600 font-semibold">Cancel</button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>}
        <textarea value={form.question} onChange={e => set('question', e.target.value)} placeholder="Question" rows={2}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none" />
        <textarea value={form.answer} onChange={e => set('answer', e.target.value)} placeholder="Answer" rows={4}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none" />
        <div className="grid sm:grid-cols-2 gap-3">
          <input value={form.category} onChange={e => set('category', e.target.value)} placeholder="Category" className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          <input value={(form.tags || []).join(', ')} onChange={e => set('tags', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} placeholder="Tags (comma separated)" className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <select value={form.doctor} onChange={e => set('doctor', e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
            <option value="">— Doctor —</option>
            {doctors.map((d: any) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          <select value={form.service} onChange={e => set('service', e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
            <option value="">— Service —</option>
            {services.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <select value={form.location} onChange={e => set('location', e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
            <option value="">— Location —</option>
            {['chennai', 'bangalore', 'coimbatore', 'kochi'].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <input value={form.seoTitle} onChange={e => set('seoTitle', e.target.value)} placeholder="SEO Title (optional)" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-600"><input type="checkbox" checked={form.featured} onChange={e => set('featured', e.target.checked)} /> Featured</label>
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-600"><input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} /> Active</label>
          <input type="number" value={form.order} onChange={e => set('order', Number(e.target.value))} placeholder="Order" className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
        </div>
      </div>
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
        {!isNew ? <button onClick={del} className="text-red-500 text-sm font-semibold flex items-center gap-1"><Trash2 size={14} /> Delete</button> : <div />}
        <button onClick={save} disabled={saving} className="bg-[#0B2560] text-white px-6 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
          {saving ? 'Saving…' : isNew ? 'Create' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ── AI-generated FAQ suggestions ─────────────────────────────────────────
// Grounded strictly in a real Service's stored fields (see
// app/api/admin/faqs/generate/route.ts's prompt) — never presented as
// live to patients on generation. Every suggestion the admin keeps is
// created via the same POST /api/admin/faqs create route as a manually
// typed FAQ, with active:false, so it sits as a draft until an admin
// reviews it in context (wording, category, order) and flips it on —
// nothing an AI writes here reaches the chat assistant's knowledge base
// (KnowledgeChunk only syncs from an *active* Faq) without that explicit
// human step.
function GenerateFaqModal({ services, onAdded, onClose }: any) {
  const [serviceId, setServiceId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<any[] | null>(null);
  const [adding, setAdding] = useState(false);

  const generate = async () => {
    if (!serviceId) return setError('Choose a service first');
    setLoading(true); setError(''); setSuggestions(null);
    try {
      const res = await fetch('/api/admin/faqs/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId }),
      });
      const data = await res.json();
      if (data.success) {
        setSuggestions(data.suggestions.map((s: any) => ({ ...s, checked: true })));
      } else {
        setError(data.needsSetup ? 'AI isn\'t configured yet (missing GEMINI_API_KEY).' : (data.message || 'Could not generate suggestions.'));
      }
    } catch { setError('Network error — please try again.'); }
    finally { setLoading(false); }
  };

  const update = (i: number, k: string, v: any) => setSuggestions((prev) => prev!.map((s, si) => si === i ? { ...s, [k]: v } : s));

  const addSelected = async () => {
    const picked = (suggestions || []).filter(s => s.checked);
    if (!picked.length) return;
    setAdding(true);
    try {
      const created = await Promise.all(picked.map(s =>
        fetch('/api/admin/faqs', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: s.question, answer: s.answer, category: s.category, service: serviceId, active: false }),
        }).then(r => r.json())
      ));
      const okCount = created.filter(c => c.success).length;
      onAdded(okCount);
    } catch {
      setError('Some FAQs failed to save — please try again.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-bold text-[#0B2560] flex items-center gap-2"><Sparkles size={16} className="text-[#F5A623]" /> Generate FAQs with AI</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>}

          <div className="flex items-center gap-2">
            <select value={serviceId} onChange={e => setServiceId(e.target.value)} disabled={loading}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
              <option value="">— Choose a service —</option>
              {services.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            <button onClick={generate} disabled={loading || !serviceId}
              className="shrink-0 bg-[#0B2560] text-white px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-2">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Generate
            </button>
          </div>

          {suggestions && (
            <div className="space-y-3 pt-2">
              <p className="text-xs text-gray-400">Review and edit before adding — added as drafts (not visible to patients or the AI assistant until you activate them below).</p>
              {suggestions.map((s, i) => (
                <div key={i} className={`border rounded-xl p-3.5 space-y-2 transition ${s.checked ? 'border-blue-100 bg-[#f6faff]' : 'border-gray-100 opacity-60'}`}>
                  <label className="flex items-start gap-2">
                    <input type="checkbox" checked={s.checked} onChange={e => update(i, 'checked', e.target.checked)} className="mt-1 shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <textarea value={s.question} onChange={e => update(i, 'question', e.target.value)} rows={2}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-[#0B2560] resize-none" />
                      <textarea value={s.answer} onChange={e => update(i, 'answer', e.target.value)} rows={3}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-600 resize-none" />
                      <input value={s.category} onChange={e => update(i, 'category', e.target.value)}
                        className="w-40 border border-gray-200 rounded-lg px-2.5 py-1 text-[11px] text-gray-500" />
                    </div>
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        {suggestions && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
            <p className="text-xs text-gray-400">{suggestions.filter(s => s.checked).length} selected</p>
            <button onClick={addSelected} disabled={adding || !suggestions.some(s => s.checked)}
              className="bg-[#0B2560] text-white px-6 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
              {adding ? 'Adding…' : `Add Selected (${suggestions.filter(s => s.checked).length})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FaqsAdminPage() {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [isNew, setIsNew] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [addedNote, setAddedNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/faqs');
    const data = await res.json();
    if (data.success) setFaqs(data.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch('/api/admin/doctors').then(r => r.json()).then(d => d.success && setDoctors(d.data));
    fetch('/api/admin/services').then(r => r.json()).then(d => d.success && setServices(d.data));
  }, []);

  const filtered = faqs.filter(f => !search || f.question.toLowerCase().includes(search.toLowerCase()));

  const openNew = () => { setSelected(null); setIsNew(true); };
  const openEdit = (f: any) => { setSelected(f); setIsNew(false); };
  const close = () => { setSelected(null); setIsNew(false); };
  const onSaved = (f: any) => { setFaqs(prev => { const i = prev.findIndex(p => p._id === f._id); return i >= 0 ? prev.map(p => p._id === f._id ? f : p) : [f, ...prev]; }); close(); };
  const onDeleted = (id: string) => { setFaqs(prev => prev.filter(p => p._id !== id)); close(); };

  const showForm = isNew || selected;

  const onGenerated = (count: number) => {
    setShowGenerate(false);
    setAddedNote(`Added ${count} FAQ${count !== 1 ? 's' : ''} as drafts — review and switch "Active" on to publish them to the AI assistant.`);
    load();
    setTimeout(() => setAddedNote(''), 6000);
  };

  return (
    <div className="-m-6 flex flex-col h-screen bg-white overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
        <div>
          <h1 className="text-lg font-bold text-[#0B2560]">FAQs</h1>
          <p className="text-xs text-gray-400">{faqs.length} FAQ{faqs.length !== 1 ? 's' : ''} · reusable across Web Stories, AI Assistant, and future pages</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowGenerate(true)} className="flex items-center gap-2 bg-white border border-[#0B2560]/20 text-[#0B2560] px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#f6faff]">
            <Sparkles size={15} className="text-[#F5A623]" /> Generate with AI
          </button>
          <button onClick={openNew} className="flex items-center gap-2 bg-[#0B2560] text-white px-4 py-2.5 rounded-xl text-sm font-bold">
            <Plus size={15} /> Add FAQ
          </button>
        </div>
      </div>
      {addedNote && <div className="px-6 py-2 bg-emerald-50 border-b border-emerald-100 text-xs font-semibold text-emerald-700 shrink-0">{addedNote}</div>}
      {showGenerate && <GenerateFaqModal services={services} onAdded={onGenerated} onClose={() => setShowGenerate(false)} />}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 shrink-0 border-r border-gray-100 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-gray-100 relative shrink-0">
            <Search size={13} className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search FAQs..." className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-xs" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? <p className="text-xs text-gray-400 text-center py-10">Loading…</p> :
              filtered.length === 0 ? <p className="text-xs text-gray-400 text-center py-10">No FAQs yet.</p> :
              filtered.map(f => (
                <button key={f._id} onClick={() => openEdit(f)} className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-[#f6faff] flex items-center justify-between gap-2 ${selected?._id === f._id ? 'bg-[#eef4ff]' : ''}`}>
                  <div className="min-w-0">
                    {f.category && <span className="text-[10px] font-bold text-[#3B82C4] bg-blue-50 px-1.5 py-0.5 rounded mr-1">{f.category}</span>}
                    <p className="text-sm font-semibold text-[#0B2560] line-clamp-1 mt-1">{f.question}</p>
                  </div>
                  <ChevronRight size={13} className="text-gray-300 shrink-0" />
                </button>
              ))
            }
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {showForm ? (
            <FaqForm key={selected?._id ?? 'new'} faq={isNew ? null : selected} doctors={doctors} services={services} onSaved={onSaved} onDeleted={onDeleted} onCancel={close} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
              <p className="text-4xl">❓</p>
              <p className="font-semibold text-gray-500 text-sm">Select an FAQ to edit</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
