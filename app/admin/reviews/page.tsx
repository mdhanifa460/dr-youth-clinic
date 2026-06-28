'use client';

import { useEffect, useState, useCallback } from 'react';
import { AiFillStar, AiOutlineStar } from 'react-icons/ai';
import { FaGoogle, FaPlay } from 'react-icons/fa';
import { MdVerified } from 'react-icons/md';
import {
  Eye, EyeOff, Star, Home, Trash2, RefreshCw, Plus, X, Loader,
  Edit2, CheckCircle,
} from 'lucide-react';

// ── Source badge config ───────────────────────────────────────────────────────
const SOURCE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  google: { label: 'Google', bg: '#EA4335', color: '#fff' },
  manual: { label: 'Manual', bg: '#0B2560', color: '#fff' },
  video:  { label: 'Video',  bg: '#F5A623', color: '#fff' },
};
const getSrc = (s: string) => SOURCE_CONFIG[s] ?? { label: s, bg: '#6B7280', color: '#fff' };

const CITIES = ['', 'chennai', 'bangalore', 'coimbatore', 'kochi'];
const CITY_LABELS: Record<string, string> = {
  '': 'All Cities', chennai: 'Chennai', bangalore: 'Bangalore',
  coimbatore: 'Coimbatore', kochi: 'Kochi',
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) =>
        n <= rating
          ? <AiFillStar key={n} className="text-[#F5A623]" size={13} />
          : <AiOutlineStar key={n} className="text-gray-300" size={13} />
      )}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ tab, onAdd }: { tab: string; onAdd: () => void }) {
  return (
    <div className="text-center py-20 col-span-full">
      <p className="text-5xl mb-4">💬</p>
      <p className="text-gray-500 font-semibold mb-1">No {tab === 'all' ? '' : tab} reviews yet</p>
      <p className="text-gray-400 text-sm mb-6">
        {tab === 'google'
          ? 'Click "Sync Google" to import reviews from your Google Business profile.'
          : 'Add your first review to display on the homepage.'}
      </p>
      {tab !== 'google' && (
        <button onClick={onAdd} className="bg-[#0B2560] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#0d2d73] transition">
          + Add Review
        </button>
      )}
    </div>
  );
}

// ── Review card ───────────────────────────────────────────────────────────────
function ReviewCard({
  review,
  onToggle,
  onDelete,
  onEdit,
}: {
  review: any;
  onToggle: (id: string, field: 'isVisible' | 'isFeatured' | 'showOnHomepage', val: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (review: any) => void;
}) {
  const src = getSrc(review.source);
  const initials = review.authorName?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div className={`bg-white rounded-2xl border p-5 flex flex-col gap-3 shadow-sm transition ${
      !review.isVisible ? 'opacity-60 border-dashed border-gray-300' : 'border-gray-100'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full"
            style={{ background: src.bg, color: src.color }}
          >
            {review.source === 'google' && <FaGoogle size={8} />}
            {review.source === 'video' && <FaPlay size={8} />}
            {review.source === 'manual' && <MdVerified size={9} />}
            {src.label}
          </span>
          {review.rating && <Stars rating={review.rating} />}
          {review.location && (
            <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full capitalize">
              {review.location}
            </span>
          )}
        </div>
        <button
          onClick={() => onDelete(review._id)}
          className="text-gray-300 hover:text-red-500 transition shrink-0"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Author */}
      <div className="flex items-center gap-2.5">
        {review.authorAvatar ? (
          <img src={review.authorAvatar} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#0B2560] flex items-center justify-center shrink-0">
            <span className="text-white text-[10px] font-bold">{initials}</span>
          </div>
        )}
        <div>
          <p className="text-sm font-bold text-[#0B2560]">{review.authorName}</p>
          {review.services?.length > 0 && (
            <p className="text-[10px] text-[#3B82C4]">{review.services.slice(0, 2).join(', ')}</p>
          )}
        </div>
      </div>

      {/* Video thumbnail */}
      {review.source === 'video' && review.videoUrl && (
        <a href={review.videoUrl} target="_blank" rel="noopener noreferrer"
          className="relative rounded-lg overflow-hidden h-28 bg-gray-900 flex items-center justify-center group">
          {review.videoThumbnail && (
            <img src={review.videoThumbnail} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition" />
          <div className="relative w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
            <FaPlay className="text-[#0B2560] ml-0.5" size={12} />
          </div>
        </a>
      )}

      {/* Review text */}
      {review.reviewText && (
        <p className="text-gray-600 text-xs leading-relaxed line-clamp-3 italic">
          &ldquo;{review.reviewText}&rdquo;
        </p>
      )}

      {/* Toggle controls */}
      <div className="flex items-center gap-1.5 pt-1 border-t border-gray-50 flex-wrap">
        <ToggleBtn
          active={review.isVisible}
          onClick={() => onToggle(review._id, 'isVisible', !review.isVisible)}
          activeIcon={<Eye size={11} />}
          inactiveIcon={<EyeOff size={11} />}
          activeLabel="Visible"
          inactiveLabel="Hidden"
          activeClass="bg-green-100 text-green-700"
          inactiveClass="bg-gray-100 text-gray-500"
        />
        <ToggleBtn
          active={review.isFeatured}
          onClick={() => onToggle(review._id, 'isFeatured', !review.isFeatured)}
          activeIcon={<Star size={11} />}
          inactiveIcon={<Star size={11} />}
          activeLabel="Featured"
          inactiveLabel="Feature"
          activeClass="bg-[#F5A623]/15 text-[#b87a00]"
          inactiveClass="bg-gray-100 text-gray-500"
        />
        <ToggleBtn
          active={review.showOnHomepage}
          onClick={() => onToggle(review._id, 'showOnHomepage', !review.showOnHomepage)}
          activeIcon={<Home size={11} />}
          inactiveIcon={<Home size={11} />}
          activeLabel="Homepage"
          inactiveLabel="Homepage"
          activeClass="bg-[#0B2560]/10 text-[#0B2560]"
          inactiveClass="bg-gray-100 text-gray-500"
        />
        {review.source !== 'google' && (
          <button
            onClick={() => onEdit(review)}
            className="ml-auto flex items-center gap-1 text-[10px] text-[#3B82C4] hover:text-[#0B2560] font-semibold transition"
          >
            <Edit2 size={10} /> Edit
          </button>
        )}
      </div>

      {/* Sync date for Google reviews */}
      {review.source === 'google' && review.syncedAt && (
        <p className="text-[9px] text-gray-300 -mt-1">
          Synced {new Date(review.syncedAt).toLocaleDateString('en-IN')}
        </p>
      )}
    </div>
  );
}

function ToggleBtn({
  active, onClick, activeIcon, inactiveIcon, activeLabel, inactiveLabel, activeClass, inactiveClass,
}: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full transition ${
        active ? activeClass : inactiveClass
      }`}
    >
      {active ? activeIcon : inactiveIcon}
      {active ? activeLabel : inactiveLabel}
    </button>
  );
}

// ── Add / Edit modal ──────────────────────────────────────────────────────────
const EMPTY_FORM = {
  source: 'manual', authorName: '', authorAvatar: '', rating: 5,
  reviewText: '', videoUrl: '', videoThumbnail: '', location: '',
  services: '', isFeatured: false, showOnHomepage: true, isVisible: true,
  reviewDate: new Date().toISOString().split('T')[0],
};

function ReviewModal({
  initial,
  onClose,
  onSave,
}: {
  initial: any;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        services: form.services
          ? form.services.split(',').map((s: string) => s.trim()).filter(Boolean)
          : [],
        rating: Number(form.rating),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h3 className="font-bold text-[#0B2560]">{initial._id ? 'Edit Review' : 'Add Review'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Source */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Source</label>
            <select value={form.source} onChange={(e) => set('source', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              <option value="manual">Manual (Verified Patient)</option>
              <option value="video">Video Review</option>
            </select>
          </div>

          {/* Author Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Patient Name *</label>
            <input required value={form.authorName} onChange={(e) => set('authorName', e.target.value)}
              placeholder="e.g. Priya S." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* Avatar URL (optional) */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Avatar URL (optional)</label>
            <input value={form.authorAvatar} onChange={(e) => set('authorAvatar', e.target.value)}
              placeholder="https://..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* Rating */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Rating</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => set('rating', n)}>
                  {n <= form.rating
                    ? <AiFillStar className="text-[#F5A623]" size={22} />
                    : <AiOutlineStar className="text-gray-300" size={22} />}
                </button>
              ))}
            </div>
          </div>

          {/* Review text */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Review Text</label>
            <textarea rows={3} value={form.reviewText} onChange={(e) => set('reviewText', e.target.value)}
              placeholder="What the patient said..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
          </div>

          {/* Video URL (only for video source) */}
          {form.source === 'video' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Video URL (YouTube/Vimeo)</label>
                <input value={form.videoUrl} onChange={(e) => set('videoUrl', e.target.value)}
                  placeholder="https://youtube.com/watch?v=..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Thumbnail URL (optional)</label>
                <input value={form.videoThumbnail} onChange={(e) => set('videoThumbnail', e.target.value)}
                  placeholder="https://..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </>
          )}

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Location</label>
            <select value={form.location} onChange={(e) => set('location', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {CITIES.map((c) => <option key={c} value={c}>{CITY_LABELS[c]}</option>)}
            </select>
          </div>

          {/* Services */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Services (comma-separated)
            </label>
            <input value={form.services} onChange={(e) => set('services', e.target.value)}
              placeholder="Hair Restoration, PRP Therapy" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Review Date</label>
            <input type="date" value={form.reviewDate} onChange={(e) => set('reviewDate', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-3 pt-1">
            {[
              { key: 'isFeatured', label: 'Featured' },
              { key: 'showOnHomepage', label: 'Show on Homepage' },
              { key: 'isVisible', label: 'Visible' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                <button
                  type="button"
                  onClick={() => set(key, !form[key])}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    form[key] ? 'bg-[#0B2560]' : 'bg-gray-200'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    form[key] ? 'translate-x-5' : ''
                  }`} />
                </button>
                <span className="text-xs text-gray-600 font-medium">{label}</span>
              </label>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-[#0B2560] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#0d2d73] transition disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? <><Loader size={14} className="animate-spin" /> Saving…</> : <><CheckCircle size={14} /> Save Review</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ReviewsAdminPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'manual' | 'google' | 'video'>('all');
  const [locationFilter, setLocationFilter] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  const [modal, setModal] = useState<any | null>(null); // null = closed, {} = new, {...} = edit

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (tab !== 'all') params.set('source', tab);
    if (locationFilter) params.set('location', locationFilter);
    try {
      const res = await fetch(`/api/admin/reviews?${params}`);
      const d = await res.json();
      if (d.success) setReviews(d.reviews);
    } catch {}
    setLoading(false);
  }, [tab, locationFilter]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const toggle = async (id: string, field: 'isVisible' | 'isFeatured' | 'showOnHomepage', val: boolean) => {
    setReviews((prev) => prev.map((r) => r._id === id ? { ...r, [field]: val } : r));
    await fetch(`/api/admin/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: val }),
    });
  };

  const deleteReview = async (id: string) => {
    if (!confirm('Delete this review?')) return;
    setReviews((prev) => prev.filter((r) => r._id !== id));
    await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' });
  };

  const saveReview = async (data: any) => {
    if (data._id) {
      // Edit
      await fetch(`/api/admin/reviews/${data._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } else {
      // Create
      await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    }
    setModal(null);
    fetchReviews();
  };

  const syncGoogle = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await fetch('/api/admin/reviews/sync-google', { method: 'POST' });
      const d = await res.json();
      if (d.success) {
        setSyncMsg(`✓ Synced ${d.synced} reviews (${d.created} new, ${d.updated} updated)`);
        fetchReviews();
      } else {
        setSyncMsg(`⚠ ${d.message}`);
      }
    } catch {
      setSyncMsg('⚠ Sync failed. Check your connection.');
    }
    setSyncing(false);
  };

  const counts = {
    all: reviews.length,
    manual: reviews.filter((r) => r.source === 'manual').length,
    google: reviews.filter((r) => r.source === 'google').length,
    video: reviews.filter((r) => r.source === 'video').length,
  };

  const TABS: { key: typeof tab; label: string }[] = [
    { key: 'all', label: `All (${counts.all})` },
    { key: 'manual', label: `Manual (${counts.manual})` },
    { key: 'google', label: `Google (${counts.google})` },
    { key: 'video', label: `Video (${counts.video})` },
  ];

  return (
    <div className="p-8 max-w-6xl">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2560]">Reviews</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Manage patient reviews from all sources. Homepage layout is configured in Homepage → Testimonials.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={syncGoogle}
            disabled={syncing}
            className="flex items-center gap-2 border border-[#EA4335] text-[#EA4335] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#EA4335]/5 transition disabled:opacity-60"
          >
            {syncing ? <Loader size={14} className="animate-spin" /> : <FaGoogle size={13} />}
            {syncing ? 'Syncing…' : 'Sync Google'}
          </button>
          <button
            onClick={() => setModal({})}
            className="flex items-center gap-2 bg-[#0B2560] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#0d2d73] transition"
          >
            <Plus size={15} /> Add Review
          </button>
        </div>
      </div>

      {/* Sync status message */}
      {syncMsg && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
          syncMsg.startsWith('✓') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
        }`}>
          {syncMsg}
          {syncMsg.includes('GOOGLE_PLACES_API_KEY') && (
            <p className="mt-1 text-xs opacity-80">Add GOOGLE_PLACES_API_KEY and GOOGLE_PLACE_ID to your .env.local file.</p>
          )}
        </div>
      )}

      {/* FILTERS */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Source tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
                tab === key ? 'bg-white text-[#0B2560] shadow-sm' : 'text-gray-500 hover:text-[#0B2560]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Location filter */}
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 focus:outline-none focus:border-[#0B2560]"
        >
          {CITIES.map((c) => <option key={c} value={c}>{CITY_LABELS[c]}</option>)}
        </select>

        <button onClick={fetchReviews} className="text-gray-400 hover:text-[#0B2560] transition p-2">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* REVIEW GRID */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse space-y-3">
              <div className="flex gap-2"><div className="h-5 w-16 rounded-full bg-gray-200" /><div className="h-5 w-20 rounded-full bg-gray-100" /></div>
              <div className="flex gap-2"><div className="w-8 h-8 rounded-full bg-gray-200" /><div className="space-y-1 flex-1"><div className="h-3 w-24 rounded bg-gray-200" /><div className="h-2.5 w-16 rounded bg-gray-100" /></div></div>
              <div className="space-y-1.5"><div className="h-2.5 w-full rounded bg-gray-100" /><div className="h-2.5 w-5/6 rounded bg-gray-100" /></div>
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="grid">
          <EmptyState tab={tab} onAdd={() => setModal({})} />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reviews.map((r) => (
            <ReviewCard
              key={r._id}
              review={r}
              onToggle={toggle}
              onDelete={deleteReview}
              onEdit={(rev) => setModal({ ...rev, services: rev.services?.join(', ') || '' })}
            />
          ))}
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {modal !== null && (
        <ReviewModal
          initial={modal}
          onClose={() => setModal(null)}
          onSave={saveReview}
        />
      )}
    </div>
  );
}
