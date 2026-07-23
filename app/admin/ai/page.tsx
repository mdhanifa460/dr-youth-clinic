'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bot, Database, MessageSquare, BarChart3, RefreshCw, Plus, Trash2,
  ChevronRight, Loader2, CheckCircle, AlertCircle, X, MessageCircle,
} from 'lucide-react';

type Tab = 'knowledge' | 'conversations' | 'analytics';

const DOC_TYPES = ['policy', 'treatment_guide', 'research', 'admin_note'] as const;
const DOC_TYPE_LABELS: Record<string, string> = {
  policy: '📋 Policy', treatment_guide: '🩺 Treatment Guide', research: '🔬 Research', admin_note: '📝 Admin Note',
};
const SOURCE_TYPES = ['service', 'doctor', 'blog', 'location', 'faq', 'result', 'offer', 'document'];

// ── Knowledge Base tab ──────────────────────────────────────────────────
function KnowledgeBaseTab() {
  const [chunks, setChunks] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [reindexing, setReindexing] = useState(false);
  const [reindexResult, setReindexResult] = useState('');

  const [documents, setDocuments] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [isNew, setIsNew] = useState(false);

  const loadChunks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/knowledge-base/chunks${filter ? `?sourceType=${filter}` : ''}`);
      const data = await res.json();
      if (data.success) { setChunks(data.data); setCounts(data.counts); }
    } finally { setLoading(false); }
  }, [filter]);

  const loadDocuments = useCallback(async () => {
    const res = await fetch('/api/admin/knowledge-documents');
    const data = await res.json();
    if (data.success) setDocuments(data.data);
  }, []);

  useEffect(() => { loadChunks(); }, [loadChunks]);
  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  const reindex = async () => {
    setReindexing(true); setReindexResult('');
    try {
      const res = await fetch('/api/admin/knowledge-base/reindex', { method: 'POST' });
      const data = await res.json();
      setReindexResult(data.success ? `Reindexed ${data.upserted}/${data.total} documents${data.failed?.length ? ` (${data.failed.length} failed)` : ''}.` : data.message);
      loadChunks();
    } catch { setReindexResult('Reindex failed.'); }
    finally { setReindexing(false); }
  };

  const openNew = () => { setSelected(null); setIsNew(true); };
  const openEdit = (d: any) => { setSelected(d); setIsNew(false); };
  const close = () => { setSelected(null); setIsNew(false); };

  const onSaved = () => { close(); loadDocuments(); loadChunks(); };
  const onDeleted = () => { close(); loadDocuments(); loadChunks(); };

  return (
    <div className="space-y-6">
      {/* Reindex + counts */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-sm font-bold text-[#0B2560]">Vector Search Index</h2>
            <p className="text-xs text-gray-400 mt-0.5">{chunks.length > 0 ? `${Object.values(counts).reduce((a, b) => a + b, 0)} chunks embedded` : 'Loading…'}</p>
          </div>
          <button onClick={reindex} disabled={reindexing}
            className="flex items-center gap-2 bg-[#0B2560] text-white px-4 py-2 rounded-xl text-xs font-bold hover:-translate-y-0.5 transition disabled:opacity-50">
            {reindexing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Reindex All
          </button>
        </div>
        {reindexResult && <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">{reindexResult}</p>}
        <div className="flex flex-wrap gap-2 mt-3">
          {SOURCE_TYPES.map(t => (
            <button key={t} onClick={() => setFilter(filter === t ? '' : t)}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition capitalize ${
                filter === t ? 'bg-[#0B2560] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}>
              {t} ({counts[t] ?? 0})
            </button>
          ))}
        </div>
      </div>

      {/* Knowledge Documents CRUD */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-[#0B2560]">Policies, Guides &amp; Notes</h2>
          <button onClick={openNew} className="flex items-center gap-1.5 text-xs font-bold text-[#0B2560] hover:underline">
            <Plus size={13} /> Add Document
          </button>
        </div>
        <div className="space-y-2">
          {documents.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">No documents yet — add policies, treatment guides, research notes, or internal notes for the AI to reference.</p>
          ) : documents.map(d => (
            <button key={d._id} onClick={() => openEdit(d)}
              className="w-full text-left flex items-center justify-between px-3.5 py-2.5 rounded-xl hover:bg-gray-50 transition border border-gray-100">
              <div>
                <span className="text-[10px] font-bold text-gray-400">{DOC_TYPE_LABELS[d.docType]}</span>
                <p className="text-sm font-semibold text-[#0B2560]">{d.title}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${d.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                <ChevronRight size={14} className="text-gray-300" />
              </div>
            </button>
          ))}
        </div>
        {(selected || isNew) && (
          <DocumentModal document={isNew ? null : selected} onSaved={onSaved} onDeleted={onDeleted} onClose={close} />
        )}
      </div>

      {/* Chunk browser */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h2 className="text-sm font-bold text-[#0B2560] mb-4">Indexed Chunks {filter && `— ${filter}`}</h2>
        {loading ? (
          <p className="text-xs text-gray-400 text-center py-6">Loading…</p>
        ) : chunks.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">No chunks found.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {chunks.map((c: any) => (
              <div key={c._id} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-bold uppercase bg-blue-50 text-[#3B82C4] px-1.5 py-0.5 rounded">{c.sourceType}</span>
                  <p className="text-xs font-bold text-[#0B2560] truncate">{c.title}</p>
                </div>
                <p className="text-[11px] text-gray-400 line-clamp-2">{c.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentModal({ document, onSaved, onDeleted, onClose }: { document: any | null; onSaved: () => void; onDeleted: () => void; onClose: () => void }) {
  const isNew = !document?._id;
  const [form, setForm] = useState<any>(document || { title: '', body: '', docType: 'admin_note', tags: [], active: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!form.title.trim() || !form.body.trim()) return setError('Title and body are required');
    setSaving(true); setError('');
    try {
      const url = isNew ? '/api/admin/knowledge-documents' : `/api/admin/knowledge-documents/${document._id}`;
      const res = await fetch(url, { method: isNew ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.success) onSaved(); else setError(data.message || 'Save failed');
    } catch { setError('Network error'); }
    finally { setSaving(false); }
  };

  const del = async () => {
    if (!confirm(`Delete "${form.title}"?`)) return;
    await fetch(`/api/admin/knowledge-documents/${document._id}`, { method: 'DELETE' });
    onDeleted();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-[#0B2560] text-sm">{isNew ? 'New Document' : 'Edit Document'}</h3>
          <button onClick={onClose}><X size={16} className="text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <select value={form.docType} onChange={e => setForm({ ...form, docType: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
            {DOC_TYPES.map(t => <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>)}
          </select>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Title"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} placeholder="Full text — this gets embedded and used to answer patient questions" rows={8}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none" />
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
            <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} /> Active (included in AI knowledge base)
          </label>
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
          {!isNew ? <button onClick={del} className="text-red-500 text-xs font-semibold flex items-center gap-1"><Trash2 size={13} /> Delete</button> : <div />}
          <button onClick={save} disabled={saving} className="bg-[#0B2560] text-white px-5 py-2 rounded-xl text-xs font-bold disabled:opacity-50">
            {saving ? 'Saving…' : isNew ? 'Create' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Conversations tab ────────────────────────────────────────────────────
function ConversationsTab() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/ai/conversations').then(r => r.json()).then(d => { if (d.success) setConversations(d.data); }).finally(() => setLoading(false));
  }, []);

  const openConversation = async (id: string) => {
    const res = await fetch(`/api/admin/ai/conversations/${id}`);
    const data = await res.json();
    if (data.success) setSelected(data.data);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-bold text-[#0B2560]">Conversation History</h2>
        <p className="text-xs text-gray-400 mt-0.5">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
      </div>
      {loading ? (
        <p className="text-xs text-gray-400 text-center py-10">Loading…</p>
      ) : conversations.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-10">No conversations yet.</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {conversations.map(c => (
            <button key={c._id} onClick={() => openConversation(c._id)}
              className="w-full text-left px-5 py-3.5 hover:bg-gray-50 transition flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#0B2560] truncate">{c.firstUserMessage || '(no message)'}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{new Date(c.lastMessageAt).toLocaleString()} · {c.messageCount} messages{c.location ? ` · ${c.location}` : ''}</p>
              </div>
              {c.handedOffToWhatsApp && <span className="text-[10px] font-bold bg-green-50 text-green-600 px-2 py-1 rounded-full shrink-0">WhatsApp</span>}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-bold text-[#0B2560] text-sm">Conversation</h3>
              <button onClick={() => setSelected(null)}><X size={16} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              {selected.messages.map((m: any, i: number) => (
                <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div className={`max-w-[80%] text-xs px-3.5 py-2 rounded-xl ${m.role === 'user' ? 'bg-[#0B2560] text-white' : 'bg-gray-100 text-gray-700'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Analytics tab ────────────────────────────────────────────────────────
function AnalyticsTab() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/admin/ai/analytics').then(r => r.json()).then(d => { if (d.success) setData(d.data); });
  }, []);

  if (!data) return <p className="text-xs text-gray-400 text-center py-10">Loading…</p>;

  const maxDaily = Math.max(1, ...data.dailyVolume.map((d: any) => d.count));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Conversations', value: data.totalConversations },
          { label: 'Messages', value: data.totalMessages },
          { label: 'Avg / Conversation', value: data.avgMessagesPerConversation },
          { label: 'WhatsApp Handoffs', value: data.whatsappHandoffs },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <p className="text-2xl font-bold text-[#0B2560]">{s.value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h2 className="text-sm font-bold text-[#0B2560] mb-4">Message Volume — Last 14 Days</h2>
        {data.dailyVolume.length === 0 ? (
          <p className="text-xs text-gray-400">No activity yet.</p>
        ) : (
          <div className="flex items-end gap-1.5 h-32">
            {data.dailyVolume.map((d: any) => (
              <div key={d._id} className="flex-1 flex flex-col items-center gap-1" title={`${d._id}: ${d.count}`}>
                <div className="w-full bg-[#0B2560] rounded-t" style={{ height: `${Math.max(4, (d.count / maxDaily) * 100)}%` }} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-[#0B2560] mb-4">Most Recommended</h2>
          {data.cardTypeBreakdown.length === 0 ? (
            <p className="text-xs text-gray-400">No recommendations shown yet.</p>
          ) : data.cardTypeBreakdown.map((c: any) => (
            <div key={c._id} className="flex items-center justify-between py-1.5 text-sm">
              <span className="capitalize text-gray-600">{c._id}</span>
              <span className="font-bold text-[#0B2560]">{c.count}</span>
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-[#0B2560] mb-4">Recent Questions</h2>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {data.recentQuestions.length === 0 ? (
              <p className="text-xs text-gray-400">No questions yet.</p>
            ) : data.recentQuestions.map((q: any, i: number) => (
              <p key={i} className="text-xs text-gray-600 border-b border-gray-50 pb-1.5">{q.question}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────
export default function AiPlatformPage() {
  const [tab, setTab] = useState<Tab>('knowledge');

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: 'knowledge', label: 'Knowledge Base', icon: Database },
    { key: 'conversations', label: 'Conversations', icon: MessageSquare },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#0B2560] flex items-center gap-2"><Bot size={20} /> AI Platform</h1>
          <p className="text-gray-400 text-sm mt-0.5">Knowledge base, conversation history, and analytics for the AI assistant.</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${
              tab === t.key ? 'bg-white text-[#0B2560] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'knowledge' && <KnowledgeBaseTab />}
      {tab === 'conversations' && <ConversationsTab />}
      {tab === 'analytics' && <AnalyticsTab />}
    </div>
  );
}
