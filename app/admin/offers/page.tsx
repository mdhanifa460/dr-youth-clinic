'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Eye, EyeOff, Star, ChevronRight, Tag, Percent, Calendar } from 'lucide-react';
import ImageUpload from '@/app/admin/components/ImageUpload';

const CATEGORIES = ['Skin Care', 'Hair Care', 'Laser', 'Body', 'Package'];

const CATEGORY_COLORS: Record<string, string> = {
  'Skin Care': 'bg-pink-100 text-pink-700',
  'Hair Care': 'bg-green-100 text-green-700',
  'Laser':     'bg-purple-100 text-purple-700',
  'Body':      'bg-orange-100 text-orange-700',
  'Package':   'bg-amber-100 text-amber-700',
};

const EMPTY: any = {
  title: '', description: '', category: 'Package',
  originalPrice: '', discountedPrice: '',
  badge: '', features: ['', '', ''],
  image: { url: '', publicId: '' },
  validUntil: '', terms: '',
  featured: false, active: true, order: 0,
};

function discountPct(orig: number, disc: number) {
  if (!orig || !disc || orig <= disc) return 0;
  return Math.round(((orig - disc) / orig) * 100);
}

// ── Offer list item ──
function OfferItem({ offer, selected, onSelect }: { offer: any; selected: boolean; onSelect: () => void }) {
  const pct = discountPct(offer.originalPrice, offer.discountedPrice);
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left px-4 py-3.5 border-b border-gray-100 transition hover:bg-[#f6faff] ${
        selected ? 'bg-[#eef4ff] border-l-2 border-l-[#0B2560]' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mb-1 ${CATEGORY_COLORS[offer.category] || 'bg-gray-100 text-gray-600'}`}>
            {offer.category}
          </span>
          <p className="text-sm font-semibold text-[#0B2560] leading-snug line-clamp-1">{offer.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-400 line-through">₹{offer.originalPrice?.toLocaleString()}</span>
            <span className="text-xs font-bold text-[#0B2560]">₹{offer.discountedPrice?.toLocaleString()}</span>
            {pct > 0 && <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">-{pct}%</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {offer.featured && <Star size={11} className="text-amber-500 fill-amber-500" />}
          <div className={`w-2 h-2 rounded-full mt-1 ${offer.active ? 'bg-green-500' : 'bg-gray-300'}`} />
        </div>
      </div>
    </button>
  );
}

// ── Offer form ──
function OfferForm({ offer, onSaved, onDeleted, onCancel }: {
  offer: any | null;
  onSaved: (o: any) => void;
  onDeleted: (id: string) => void;
  onCancel: () => void;
}) {
  const isNew = !offer?._id;
  const [form, setForm] = useState<any>(offer ? { ...offer, validUntil: offer.validUntil ? offer.validUntil.slice(0, 10) : '' } : { ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const set = (key: string, val: any) => setForm((f: any) => ({ ...f, [key]: val }));

  const setFeature = (i: number, val: string) => {
    const features = [...(form.features || ['', '', ''])];
    features[i] = val;
    setForm((f: any) => ({ ...f, features }));
  };

  const addFeature = () => setForm((f: any) => ({ ...f, features: [...(f.features || []), ''] }));
  const removeFeature = (i: number) => setForm((f: any) => ({ ...f, features: f.features.filter((_: any, idx: number) => idx !== i) }));

  const save = async () => {
    if (!form.title.trim()) return setError('Title is required');
    if (!form.originalPrice || !form.discountedPrice) return setError('Both prices are required');
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        originalPrice: Number(form.originalPrice),
        discountedPrice: Number(form.discountedPrice),
        order: Number(form.order) || 0,
        features: (form.features || []).filter((f: string) => f.trim()),
        validUntil: form.validUntil || null,
      };
      const url = isNew ? '/api/admin/offers' : `/api/admin/offers/${offer._id}`;
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
      await fetch(`/api/admin/offers/${offer._id}`, { method: 'DELETE' });
      onDeleted(offer._id);
    } catch { setError('Delete failed'); }
    finally { setDeleting(false); }
  };

  const pct = discountPct(Number(form.originalPrice), Number(form.discountedPrice));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
        <div>
          <h2 className="text-base font-bold text-[#0B2560]">{isNew ? 'New Offer' : 'Edit Offer'}</h2>
          {!isNew && <p className="text-xs text-gray-400 mt-0.5">{offer.title}</p>}
        </div>
        <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600 font-semibold">Cancel</button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2">{error}</p>}

        {/* Title + Category */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Offer Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="e.g. PRP Hair Therapy 3-Session Pack"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 focus:border-[#0B2560]" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Category</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20">
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="Short description of what's included..."
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 resize-none" />
        </div>

        {/* Pricing */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Pricing *</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-gray-400 mb-1 block">Original Price (₹)</label>
              <input type="number" value={form.originalPrice} onChange={e => set('originalPrice', e.target.value)}
                placeholder="e.g. 24000"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 mb-1 block">Offer Price (₹)</label>
              <input type="number" value={form.discountedPrice} onChange={e => set('discountedPrice', e.target.value)}
                placeholder="e.g. 14999"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
            </div>
          </div>
          {pct > 0 && (
            <p className="text-xs text-green-600 font-semibold mt-2 flex items-center gap-1">
              <Percent size={11} /> Customer saves {pct}% — ₹{(Number(form.originalPrice) - Number(form.discountedPrice)).toLocaleString()}
            </p>
          )}
        </div>

        {/* Badge + Valid Until */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">
              <Tag size={10} className="inline mr-1" />Offer Badge
            </label>
            <input value={form.badge} onChange={e => set('badge', e.target.value)}
              placeholder="e.g. Most Popular, Best Value"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">
              <Calendar size={10} className="inline mr-1" />Valid Until
            </label>
            <input type="date" value={form.validUntil} onChange={e => set('validUntil', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
          </div>
        </div>

        {/* Features */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">What's Included</label>
            <button onClick={addFeature} className="text-[10px] text-[#0B2560] font-semibold flex items-center gap-1 hover:underline">
              <Plus size={10} /> Add item
            </button>
          </div>
          <div className="space-y-2">
            {(form.features || []).map((f: string, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-green-500 text-xs font-bold shrink-0">✓</span>
                <input value={f} onChange={e => setFeature(i, e.target.value)}
                  placeholder={`Feature ${i + 1}`}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
                <button onClick={() => removeFeature(i)} className="text-gray-300 hover:text-red-500 shrink-0">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Image */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Offer Image</label>
          {form.image?.url && (
            <div className="relative mb-2 rounded-xl overflow-hidden border border-gray-100 aspect-video w-full max-w-xs">
              <img src={form.image.url} alt="" className="w-full h-full object-cover" />
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
            folder="dr-youth-clinic/offers"
            label="Upload Offer Image"
          />
        </div>

        {/* Terms */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Terms & Conditions</label>
          <textarea value={form.terms} onChange={e => set('terms', e.target.value)}
            placeholder="Add any offer-specific T&Cs..."
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 resize-none" />
        </div>

        {/* Order + Toggles */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Display Order</label>
            <input type="number" value={form.order} onChange={e => set('order', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer pb-2">
              <div
                onClick={() => set('featured', !form.featured)}
                className={`w-10 h-5.5 rounded-full relative transition-colors ${form.featured ? 'bg-amber-400' : 'bg-gray-200'}`}
                style={{ height: '22px' }}
              >
                <div className={`absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${form.featured ? 'translate-x-5' : 'translate-x-0.5'}`}
                  style={{ width: '18px', height: '18px', transform: form.featured ? 'translateX(18px)' : 'translateX(2px)' }} />
              </div>
              <span className="text-xs font-semibold text-gray-600">Featured</span>
            </label>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer pb-2">
              <div
                onClick={() => set('active', !form.active)}
                className={`relative rounded-full transition-colors ${form.active ? 'bg-green-500' : 'bg-gray-200'}`}
                style={{ width: '40px', height: '22px' }}
              >
                <div className={`absolute top-0.5 bg-white rounded-full shadow transition-transform`}
                  style={{ width: '18px', height: '18px', transform: form.active ? 'translateX(18px)' : 'translateX(2px)' }} />
              </div>
              <span className="text-xs font-semibold text-gray-600">Active</span>
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
          {saving ? 'Saving…' : isNew ? 'Create Offer' : 'Save Changes'}
          {!saving && <ChevronRight size={14} />}
        </button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function OffersAdminPage() {
  const [offers, setOffers] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState('All');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/offers');
      const data = await res.json();
      if (data.success) setOffers(data.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setSelected(null); setIsNew(true); };
  const openEdit = (o: any) => { setSelected(o); setIsNew(false); };
  const close = () => { setSelected(null); setIsNew(false); };

  const onSaved = (o: any) => {
    setOffers(prev => {
      const idx = prev.findIndex(p => p._id === o._id);
      return idx >= 0 ? prev.map(p => p._id === o._id ? o : p) : [o, ...prev];
    });
    close();
  };

  const onDeleted = (id: string) => {
    setOffers(prev => prev.filter(p => p._id !== id));
    close();
  };

  const allCats = ['All', ...CATEGORIES];
  const filtered = catFilter === 'All' ? offers : offers.filter(o => o.category === catFilter);
  const showForm = isNew || selected;

  return (
    <div className="-m-6 flex flex-col h-screen bg-white overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white shrink-0">
        <div>
          <h1 className="text-lg font-bold text-[#0B2560]">Offers & Packages</h1>
          <p className="text-xs text-gray-400">{offers.length} offer{offers.length !== 1 ? 's' : ''} · {offers.filter(o => o.active).length} live</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-[#0B2560] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:-translate-y-0.5 transition shadow-lg shadow-[#0B2560]/20">
          <Plus size={15} /> Add Offer
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-72 shrink-0 border-r border-gray-100 flex flex-col overflow-hidden">
          {/* Category tabs */}
          <div className="px-3 pt-3 pb-2 border-b border-gray-100 shrink-0">
            <div className="flex flex-wrap gap-1">
              {allCats.map(c => (
                <button key={c} onClick={() => setCatFilter(c)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition ${
                    catFilter === c ? 'bg-[#0B2560] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}>
                  {c}
                  {c !== 'All' && <span className="ml-1 opacity-60">({offers.filter(o => o.category === c).length})</span>}
                  {c === 'All' && <span className="ml-1 opacity-60">({offers.length})</span>}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="text-center py-16 text-gray-400 text-sm">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-3xl mb-2">🏷️</p>
                <p className="text-sm font-semibold">No offers yet</p>
                <p className="text-xs mt-1">Click "Add Offer" to get started</p>
              </div>
            ) : (
              filtered.map(o => (
                <OfferItem key={o._id} offer={o} selected={selected?._id === o._id} onSelect={() => openEdit(o)} />
              ))
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 overflow-hidden">
          {showForm ? (
            <OfferForm
              key={selected?._id ?? 'new'}
              offer={isNew ? null : selected}
              onSaved={onSaved}
              onDeleted={onDeleted}
              onCancel={close}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-4">
              <div className="w-20 h-20 rounded-3xl bg-gray-50 flex items-center justify-center text-4xl shadow-inner">🏷️</div>
              <div>
                <p className="font-semibold text-gray-500 text-base">Select an offer to edit</p>
                <p className="text-sm mt-1">or</p>
              </div>
              <button onClick={openNew}
                className="flex items-center gap-2 bg-[#0B2560] text-white px-6 py-3 rounded-2xl font-bold text-sm hover:-translate-y-0.5 transition shadow-lg">
                <Plus size={15} /> Create New Offer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
