'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, ChevronRight } from 'lucide-react';
import ImageUpload from '@/app/admin/components/ImageUpload';
import NMCComplianceHint from '@/app/admin/components/NMCComplianceHint';

const EMPTY: any = {
  title: '',
  image: { url: '', publicId: '' },
  order: 0,
  active: true,
};

// ── Achievement list item ──
function AchievementItem({ achievement, selected, onSelect }: { achievement: any; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-4 py-3.5 border-b border-gray-100 transition hover:bg-[#f6faff] flex items-center gap-3 ${
        selected ? 'bg-[#eef4ff] border-l-2 border-l-[#0B2560]' : ''
      }`}
    >
      <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shrink-0 flex items-center justify-center">
        {achievement.image?.url ? (
          <img src={achievement.image.url} alt="" className="w-full h-full object-contain" />
        ) : (
          <span className="text-lg">🏆</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#0B2560] leading-snug line-clamp-2">{achievement.title}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">Order {achievement.order}</p>
      </div>
      <div className={`w-2 h-2 rounded-full shrink-0 ${achievement.active ? 'bg-green-500' : 'bg-gray-300'}`} />
    </button>
  );
}

// ── Achievement form ──
function AchievementForm({ achievement, onSaved, onDeleted, onCancel }: {
  achievement: any | null;
  onSaved: (a: any) => void;
  onDeleted: (id: string) => void;
  onCancel: () => void;
}) {
  const isNew = !achievement?._id;
  const [form, setForm] = useState<any>(achievement ? { ...achievement } : { ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const set = (key: string, val: any) => setForm((f: any) => ({ ...f, [key]: val }));

  const save = async () => {
    if (!form.title.trim()) return setError('Title is required');
    if (!form.image?.url) return setError('An image is required — upload the badge/award graphic below');
    setSaving(true); setError('');
    try {
      const payload = { ...form, order: Number(form.order) || 0 };
      const url = isNew ? '/api/admin/achievements' : `/api/admin/achievements/${achievement._id}`;
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
      const res = await fetch(`/api/admin/achievements/${achievement._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) onDeleted(achievement._id);
      else setError(data.message || 'Delete failed');
    } catch { setError('Delete failed'); }
    finally { setDeleting(false); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
        <div>
          <h2 className="text-base font-bold text-[#0B2560]">{isNew ? 'New Achievement' : 'Edit Achievement'}</h2>
          {!isNew && <p className="text-xs text-gray-400 mt-0.5">{achievement.title}</p>}
        </div>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600 font-semibold">Cancel</button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2">{error}</p>}

        {/* Title */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Title *</label>
          <input value={form.title} onChange={e => set('title', e.target.value)}
            placeholder="e.g. Award Winning Clinic in Trichology"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 focus:border-[#0B2560]" />
          <p className="text-[11px] text-gray-400 mt-1">Shown as alt text / a caption under the badge — the graphic itself carries the main design.</p>
          <NMCComplianceHint text={form.title} />
        </div>

        {/* Image */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Badge / Award Graphic *</label>
          {form.image?.url && (
            <div className="relative mb-2 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 aspect-square w-full max-w-[160px]">
              <img src={form.image.url} alt="" className="w-full h-full object-contain" />
              <button
                type="button"
                onClick={() => set('image', { url: '', publicId: '' })}
                className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition"
              >
                <Trash2 size={11} />
              </button>
            </div>
          )}
          <ImageUpload
            onUpload={v => set('image', v)}
            folder="dr-youth-clinic/achievements"
            label="Upload Badge Image"
          />
          <p className="text-[11px] text-gray-400 mt-1">A square or near-square PNG with a transparent background looks best (medallion/seal style badges).</p>
        </div>

        {/* Order + Active */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Display Order</label>
            <input type="number" value={form.order} onChange={e => set('order', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer pb-2">
              <div
                onClick={() => set('active', !form.active)}
                className={`relative rounded-full transition-colors ${form.active ? 'bg-green-500' : 'bg-gray-200'}`}
                style={{ width: '40px', height: '22px' }}
              >
                <div className="absolute top-0.5 bg-white rounded-full shadow transition-transform"
                  style={{ width: '18px', height: '18px', transform: form.active ? 'translateX(18px)' : 'translateX(2px)' }} />
              </div>
              <span className="text-xs font-semibold text-gray-600">Active (shown on homepage)</span>
            </label>
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
          {saving ? 'Saving…' : isNew ? 'Create Achievement' : 'Save Changes'}
          {!saving && <ChevronRight size={14} />}
        </button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function AchievementsAdminPage() {
  const [achievements, setAchievements] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/achievements');
      const data = await res.json();
      if (data.success) setAchievements(data.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setSelected(null); setIsNew(true); };
  const openEdit = (a: any) => { setSelected(a); setIsNew(false); };
  const close = () => { setSelected(null); setIsNew(false); };

  const onSaved = (a: any) => {
    setAchievements(prev => {
      const idx = prev.findIndex(p => p._id === a._id);
      return idx >= 0 ? prev.map(p => p._id === a._id ? a : p) : [a, ...prev];
    });
    close();
  };

  const onDeleted = (id: string) => {
    setAchievements(prev => prev.filter(p => p._id !== id));
    close();
  };

  const showForm = isNew || selected;

  return (
    <div className="-m-6 flex flex-col h-screen bg-white overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white shrink-0">
        <div>
          <h1 className="text-lg font-bold text-[#0B2560]">Achievements & Awards</h1>
          <p className="text-xs text-gray-400">
            {achievements.length} badge{achievements.length !== 1 ? 's' : ''} · {achievements.filter(a => a.active).length} live on homepage
          </p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-[#0B2560] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:-translate-y-0.5 transition shadow-lg shadow-[#0B2560]/20">
          <Plus size={15} /> Add Achievement
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-72 shrink-0 border-r border-gray-100 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>
            ) : achievements.length === 0 ? (
              <div className="text-center py-16 text-gray-400 px-4">
                <p className="text-3xl mb-2">🏆</p>
                <p className="text-sm font-semibold">No achievements yet</p>
                <p className="text-xs mt-1">Click "Add Achievement" to get started</p>
              </div>
            ) : (
              achievements.map(a => (
                <AchievementItem key={a._id} achievement={a} selected={selected?._id === a._id} onSelect={() => openEdit(a)} />
              ))
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 overflow-hidden">
          {showForm ? (
            <AchievementForm
              key={selected?._id ?? 'new'}
              achievement={isNew ? null : selected}
              onSaved={onSaved}
              onDeleted={onDeleted}
              onCancel={close}
            />
          ) : (
            <div className="h-full overflow-y-auto">
              <div className="flex flex-col items-center justify-center text-center text-gray-400 gap-4 py-16">
                <div className="w-20 h-20 rounded-3xl bg-gray-50 flex items-center justify-center text-4xl shadow-inner">🏆</div>
                <div>
                  <p className="font-semibold text-gray-500 text-base">Select an achievement to edit</p>
                  <p className="text-sm mt-1">or</p>
                </div>
                <button onClick={openNew}
                  className="flex items-center gap-2 bg-[#0B2560] text-white px-6 py-3 rounded-2xl font-bold text-sm hover:-translate-y-0.5 transition shadow-lg">
                  <Plus size={15} /> Create New Achievement
                </button>
                <div className="max-w-sm px-6 pt-4">
                  <p className="text-xs text-gray-400">
                    These badges show on the homepage as a dedicated "Achievements & Awards" section — admin at{' '}
                    <a href="/admin/homepage" className="underline text-[#2A6BA8] font-semibold">Admin → Homepage</a>{' '}
                    controls the section's headline and whether it's shown at all.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
