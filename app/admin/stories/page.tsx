'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, Copy, Trash2, Settings2, X, ExternalLink } from 'lucide-react';

const PAGE_SIZE = 12;

function TypesModal({ onClose }: { onClose: () => void }) {
  const [types, setTypes] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('✨');

  const load = useCallback(() => {
    fetch('/api/admin/story-types').then(r => r.json()).then(d => { if (d.success) setTypes(d.data); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!name.trim()) return;
    await fetch('/api/admin/story-types', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, icon }) });
    setName(''); setIcon('✨'); load();
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/admin/story-types/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!data.success) alert(data.message);
    load();
  };

  const toggleActive = async (t: any) => {
    await fetch(`/api/admin/story-types/${t._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !t.active }) });
    load();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-[#0B2560] text-sm">Story Types</h3>
          <button onClick={onClose}><X size={16} className="text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-2">
          {types.map(t => (
            <div key={t._id} className="flex items-center gap-2 border border-gray-100 rounded-xl px-3 py-2">
              <span>{t.icon}</span>
              <span className="flex-1 text-sm font-semibold text-gray-700">{t.name}</span>
              <button onClick={() => toggleActive(t)} className={`w-2 h-2 rounded-full ${t.active ? 'bg-green-500' : 'bg-gray-300'}`} />
              <button onClick={() => remove(t._id)} className="text-gray-300 hover:text-red-500"><Trash2 size={13} /></button>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <input value={icon} onChange={e => setIcon(e.target.value)} className="w-12 border border-gray-200 rounded-xl px-2 py-2 text-center text-sm" />
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Hair Stories" onKeyDown={e => e.key === 'Enter' && add()}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            <button onClick={add} className="bg-[#0B2560] text-white px-3 rounded-xl"><Plus size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StoriesAdminPage() {
  const router = useRouter();
  const [stories, setStories] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showTypes, setShowTypes] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('storyType', typeFilter);
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/stories?${params}`);
      const data = await res.json();
      if (data.success) setStories(data.data);
    } finally { setLoading(false); }
  }, [statusFilter, typeFilter, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch('/api/admin/story-types').then(r => r.json()).then(d => { if (d.success) setTypes(d.data); });
  }, [showTypes]);

  const createStory = async () => {
    if (types.length === 0) { setShowTypes(true); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/stories', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Untitled Story', storyType: types[0]._id, status: 'draft', slides: [] }),
      });
      const data = await res.json();
      if (data.success) router.push(`/admin/stories/${data.data._id}`);
    } finally { setCreating(false); }
  };

  const duplicate = async (id: string) => {
    const res = await fetch(`/api/admin/stories/${id}/duplicate`, { method: 'POST' });
    const data = await res.json();
    if (data.success) load();
  };

  const remove = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    await fetch(`/api/admin/stories/${id}`, { method: 'DELETE' });
    load();
  };

  const totalPages = Math.max(1, Math.ceil(stories.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paged = stories.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-500', scheduled: 'bg-amber-50 text-amber-600',
    published: 'bg-green-50 text-green-600', archived: 'bg-red-50 text-red-500',
  };

  return (
    <div>
      {showTypes && <TypesModal onClose={() => setShowTypes(false)} />}

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-[#0B2560]">Web Stories</h1>
          <p className="text-xs text-gray-400">{stories.length} story{stories.length !== 1 ? 'ies' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowTypes(true)} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 px-3 py-2 rounded-xl hover:bg-gray-50">
            <Settings2 size={13} /> Story Types
          </button>
          <button onClick={createStory} disabled={creating}
            className="flex items-center gap-2 bg-[#0B2560] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:-translate-y-0.5 transition disabled:opacity-50">
            <Plus size={15} /> New Story
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search stories..."
            className="border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-xs w-56 focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-xs">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-xs">
          <option value="">All Types</option>
          {types.map(t => <option key={t._id} value={t._id}>{t.icon} {t.name}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-xs text-gray-400 text-center py-16">Loading…</p>
      ) : paged.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-3xl mb-2">📱</p>
          <p className="text-sm font-semibold">No stories yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {paged.map(s => (
            <div key={s._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group">
              <button onClick={() => router.push(`/admin/stories/${s._id}`)} className="w-full text-left">
                <div className="aspect-[9/16] bg-gradient-to-br from-[#0B2560] to-[#1a4a8a] relative overflow-hidden">
                  {s.coverImage?.url ? (
                    <img src={s.coverImage.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">{s.storyType?.icon || '📱'}</div>
                  )}
                  <span className={`absolute top-2 left-2 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_COLORS[s.status]}`}>{s.status}</span>
                  {s.featured && <span className="absolute top-2 right-2 text-sm">⭐</span>}
                </div>
                <div className="p-3">
                  <p className="text-xs font-bold text-[#0B2560] line-clamp-2 leading-snug">{s.title}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{s.storyType?.name} · {s.viewCount || 0} views</p>
                </div>
              </button>
              <div className="flex items-center justify-between px-3 pb-3 pt-1 border-t border-gray-50">
                {s.status === 'published' && s.slug ? (
                  <a href={`/web-stories/${s.slug}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[#3B82C4] font-semibold flex items-center gap-1">
                    View <ExternalLink size={10} />
                  </a>
                ) : <span />}
                <div className="flex items-center gap-2">
                  <button onClick={() => duplicate(s._id)} className="text-gray-300 hover:text-[#0B2560]"><Copy size={13} /></button>
                  <button onClick={() => remove(s._id, s.title)} className="text-gray-300 hover:text-red-500"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pageSafe <= 1} className="text-xs font-semibold text-gray-400 disabled:opacity-30">Prev</button>
          <span className="text-xs text-gray-400">Page {pageSafe} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={pageSafe >= totalPages} className="text-xs font-semibold text-gray-400 disabled:opacity-30">Next</button>
        </div>
      )}
    </div>
  );
}
