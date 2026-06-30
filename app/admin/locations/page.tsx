'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Upload, Trash2, Plus, Loader, CheckCircle, Eye, EyeOff,
  GripVertical, ImageIcon, MapPin, ExternalLink,
} from 'lucide-react';
import Image from 'next/image';
import { CLOUD_FOLDERS } from '@/app/lib/cloudinary-url';

const CITIES = [
  { key: 'chennai',    label: 'Chennai' },
  { key: 'bangalore',  label: 'Bangalore' },
  { key: 'coimbatore', label: 'Coimbatore' },
  { key: 'kochi',      label: 'Kochi' },
];

const TREATMENTS = [
  'Hair Restoration', 'PRP Therapy', 'GFC Therapy', 'Hair Transplant',
  'Skin Rejuvenation', 'Acne Treatment', 'Laser Hair Removal',
  'Laser Skin Treatment', 'Chemical Peel', 'Anti-Aging', 'Scar Treatment',
  'Pigmentation', 'Other',
];

// ── Tiny image upload field ───────────────────────────────────────────────────
function ImgUpload({
  value,
  onChange,
  folder,
  label,
  aspect = '16/9',
}: {
  value: { publicId: string; url: string };
  onChange: (v: { publicId: string; url: string }) => void;
  folder: string;
  label: string;
  aspect?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const upload = async (file: File) => {
    setErr('');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', folder);
      const res = await fetch('/api/admin/services/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      onChange({ url: json.data.secure_url, publicId: json.data.public_id });
    } catch (e: any) {
      setErr(e.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className="text-xs font-semibold text-gray-600 mb-1.5">{label}</p>
      <div
        onClick={() => !loading && ref.current?.click()}
        className={`relative rounded-xl border-2 border-dashed transition cursor-pointer group overflow-hidden ${
          value?.url ? 'border-transparent' : 'border-gray-200 hover:border-[#0B2560]/40'
        }`}
        style={{ aspectRatio: aspect }}
      >
        {value?.url ? (
          <>
            <Image src={value.url} alt={label} fill className="object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
              <button type="button" onClick={(e) => { e.stopPropagation(); onChange({ publicId: '', url: '' }); }}
                className="bg-red-500 text-white p-1.5 rounded-lg shadow"><Trash2 size={13} /></button>
              <span className="bg-white text-[#0B2560] text-xs font-semibold px-3 py-1.5 rounded-lg shadow flex items-center gap-1">
                <Upload size={11} /> Replace
              </span>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gray-50">
            {loading
              ? <Loader size={22} className="animate-spin text-[#0B2560]" />
              : <><ImageIcon size={22} className="text-gray-300" /><span className="text-xs text-gray-400 font-medium">Click to upload</span></>}
          </div>
        )}
        <input ref={ref} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
      </div>
      {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
    </div>
  );
}

// ── Before/After pair editor ──────────────────────────────────────────────────
function PairEditor({
  pair,
  city,
  idx,
  onChange,
  onRemove,
}: {
  pair: any;
  city: string;
  idx: number;
  onChange: (p: any) => void;
  onRemove: () => void;
}) {
  const folder = CLOUD_FOLDERS.locationResults(city);

  return (
    <div className={`border rounded-2xl p-5 space-y-4 ${pair.isVisible ? 'border-gray-100 bg-white' : 'border-dashed border-gray-200 opacity-60 bg-gray-50'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <GripVertical size={14} className="text-gray-300 cursor-grab" />
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Pair {idx + 1}</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onChange({ ...pair, isVisible: !pair.isVisible })}
            className="text-gray-300 hover:text-[#0B2560] transition">
            {pair.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          <button type="button" onClick={onRemove} className="text-gray-300 hover:text-red-500 transition">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Title</label>
          <input value={pair.title} onChange={(e) => onChange({ ...pair, title: e.target.value })}
            placeholder="e.g. Acne Therapy & Scar Solution"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0B2560]" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Treatment Type</label>
          <select value={pair.treatment} onChange={(e) => onChange({ ...pair, treatment: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0B2560]">
            <option value="">Select treatment…</option>
            {TREATMENTS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Description (optional)</label>
        <textarea rows={2} value={pair.description} onChange={(e) => onChange({ ...pair, description: e.target.value })}
          placeholder="Brief description of the result…"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-[#0B2560]" />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <ImgUpload
          label="Before Image"
          value={pair.before}
          onChange={(v) => onChange({ ...pair, before: v })}
          folder={folder}
          aspect="4/3"
        />
        <ImgUpload
          label="After Image"
          value={pair.after}
          onChange={(v) => onChange({ ...pair, after: v })}
          folder={folder}
          aspect="4/3"
        />
      </div>
    </div>
  );
}

// ── Gallery image editor ──────────────────────────────────────────────────────
function GalleryItem({
  item,
  city,
  idx,
  onChange,
  onRemove,
}: {
  item: any;
  city: string;
  idx: number;
  onChange: (v: any) => void;
  onRemove: () => void;
}) {
  const folder = CLOUD_FOLDERS.locationPhotos(city);

  return (
    <div className={`border rounded-2xl p-4 space-y-3 ${item.isVisible ? 'border-gray-100 bg-white' : 'border-dashed border-gray-200 opacity-60 bg-gray-50'}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-400">Photo {idx + 1}</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onChange({ ...item, isVisible: !item.isVisible })}
            className="text-gray-300 hover:text-[#0B2560] transition">
            {item.isVisible ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
          <button type="button" onClick={onRemove} className="text-gray-300 hover:text-red-500 transition">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <ImgUpload
        label=""
        value={{ publicId: item.publicId, url: item.url }}
        onChange={(v) => onChange({ ...item, ...v })}
        folder={folder}
        aspect="4/3"
      />
      <input value={item.caption} onChange={(e) => onChange({ ...item, caption: e.target.value })}
        placeholder="Caption (optional)"
        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#0B2560]" />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LocationsAdminPage() {
  const [city, setCity] = useState('chennai');
  const [data, setData] = useState<any>({
    heroImage: { publicId: '', url: '' },
    googleMapsUrl: '',
    mapEmbedUrl: '',
    beforeAfterPairs: [],
    galleryImages: [],
    localDoctors: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/locations/${city}`);
      const json = await res.json();
      if (json.success && json.data) {
        setData({
          heroImage:        json.data.heroImage        || { publicId: '', url: '' },
          googleMapsUrl:    json.data.googleMapsUrl    || '',
          mapEmbedUrl:      json.data.mapEmbedUrl      || '',
          beforeAfterPairs: json.data.beforeAfterPairs || [],
          galleryImages:    json.data.galleryImages    || [],
          localDoctors:     json.data.localDoctors     || [],
        });
      }
    } catch {}
    setLoading(false);
  }, [city]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`/api/admin/locations/${city}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  const addPair = () =>
    setData((d: any) => ({
      ...d,
      beforeAfterPairs: [
        ...d.beforeAfterPairs,
        {
          title: '', treatment: '', description: '',
          before: { publicId: '', url: '' },
          after:  { publicId: '', url: '' },
          isVisible: true,
          displayOrder: d.beforeAfterPairs.length,
        },
      ],
    }));

  const updatePair = (i: number, p: any) =>
    setData((d: any) => {
      const arr = [...d.beforeAfterPairs];
      arr[i] = p;
      return { ...d, beforeAfterPairs: arr };
    });

  const removePair = (i: number) =>
    setData((d: any) => ({ ...d, beforeAfterPairs: d.beforeAfterPairs.filter((_: any, idx: number) => idx !== i) }));

  const addGallery = () =>
    setData((d: any) => ({
      ...d,
      galleryImages: [
        ...d.galleryImages,
        { publicId: '', url: '', caption: '', isVisible: true, displayOrder: d.galleryImages.length },
      ],
    }));

  const updateGallery = (i: number, v: any) =>
    setData((d: any) => {
      const arr = [...d.galleryImages];
      arr[i] = v;
      return { ...d, galleryImages: arr };
    });

  const removeGallery = (i: number) =>
    setData((d: any) => ({ ...d, galleryImages: d.galleryImages.filter((_: any, idx: number) => idx !== i) }));

  const cityLabel = CITIES.find((c) => c.key === city)?.label ?? city;

  return (
    <div className="p-8 max-w-4xl">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0B2560]">Location Content</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Manage city-specific before/after results, gallery, and clinic photos.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-[#0B2560] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#0d2d73] transition disabled:opacity-60 shrink-0"
        >
          {saving ? <Loader size={15} className="animate-spin" /> : saved ? <CheckCircle size={15} /> : null}
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* CITY TABS */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1 mb-8 w-fit">
        {CITIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCity(c.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              city === c.key ? 'bg-white text-[#0B2560] shadow-sm' : 'text-gray-500 hover:text-[#0B2560]'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader size={28} className="animate-spin text-[#0B2560]/30" />
        </div>
      ) : (
        <div className="space-y-10">

          {/* ── HERO IMAGE ─────────────────────────────────────── */}
          <section>
            <h2 className="text-base font-bold text-[#0B2560] mb-1">
              Hero / Banner Image — {cityLabel}
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              Shows at the top of the {cityLabel} city page. Recommended: 1280×720 px.
              Upload to Cloudinary folder: <code className="bg-gray-100 px-1 rounded">{CLOUD_FOLDERS.locationPhotos(city)}</code>
            </p>
            <div className="max-w-lg">
              <ImgUpload
                label=""
                value={data.heroImage}
                onChange={(v) => setData((d: any) => ({ ...d, heroImage: v }))}
                folder={CLOUD_FOLDERS.locationPhotos(city)}
                aspect="16/9"
              />
            </div>
          </section>

          {/* ── GOOGLE MAPS ────────────────────────────────────── */}
          <section>
            <div className="flex items-center gap-2 mb-1">
              <MapPin size={16} className="text-[#0B2560]" />
              <h2 className="text-base font-bold text-[#0B2560]">
                Google Maps — {cityLabel}
              </h2>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Both fields are optional — the public site falls back to address search automatically.
            </p>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">

              {/* Directions link */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Directions Link <span className="font-normal text-gray-400">(shown on "Get Directions" button)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    value={data.googleMapsUrl}
                    onChange={(e) => setData((d: any) => ({ ...d, googleMapsUrl: e.target.value }))}
                    placeholder="https://maps.app.goo.gl/... or https://www.google.com/maps/dir/..."
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0B2560]"
                  />
                  {data.googleMapsUrl && (
                    <a
                      href={data.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-500 hover:text-[#0B2560] hover:border-[#0B2560] transition"
                    >
                      <ExternalLink size={13} /> Test
                    </a>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">
                  In Google Maps: search your clinic → Share → <em>Copy link</em>. Or right-click pin → Directions → copy the URL.
                </p>
              </div>

              {/* Embed URL */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Map Embed <span className="font-normal text-gray-400">(paste the full &lt;iframe&gt; code or just the URL)</span>
                </label>
                <textarea
                  rows={3}
                  value={data.mapEmbedUrl}
                  onChange={(e) => {
                    const raw = e.target.value.trim();
                    // If the user pastes full <iframe> HTML, extract the src URL automatically
                    const srcMatch = raw.match(/src=["']([^"']+)["']/);
                    setData((d: any) => ({ ...d, mapEmbedUrl: srcMatch ? srcMatch[1] : raw }));
                  }}
                  placeholder={'Paste the <iframe> embed code from Google Maps, or just the src URL'}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0B2560] resize-none font-mono"
                />
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Google Maps → Share → <em>Embed a map</em> → copy the entire &lt;iframe&gt; code and paste here.
                </p>
                {data.mapEmbedUrl && data.mapEmbedUrl.startsWith('http') && (
                  <div className="mt-3 rounded-xl overflow-hidden border border-gray-100 h-40">
                    <iframe
                      src={data.mapEmbedUrl}
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      title="Map preview"
                    />
                  </div>
                )}
              </div>

            </div>
          </section>

          {/* ── BEFORE / AFTER ─────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-[#0B2560]">
                Before / After Results — {cityLabel}
              </h2>
              <button onClick={addPair}
                className="flex items-center gap-1.5 text-xs bg-[#0B2560] text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-[#0d2d73] transition">
                <Plus size={13} /> Add Pair
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Shown in the {cityLabel} city page results section. Upload to:
              <code className="bg-gray-100 px-1 rounded ml-1">{CLOUD_FOLDERS.locationResults(city)}</code>
            </p>
            {data.beforeAfterPairs.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-2xl py-12 text-center">
                <p className="text-gray-400 text-sm mb-3">No before/after pairs yet for {cityLabel}</p>
                <button onClick={addPair}
                  className="text-[#0B2560] text-sm font-semibold hover:underline flex items-center gap-1 mx-auto">
                  <Plus size={14} /> Add first pair
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {data.beforeAfterPairs.map((pair: any, i: number) => (
                  <PairEditor
                    key={i}
                    pair={pair}
                    city={city}
                    idx={i}
                    onChange={(p) => updatePair(i, p)}
                    onRemove={() => removePair(i)}
                  />
                ))}
                <button onClick={addPair}
                  className="text-xs text-[#0B2560] font-semibold flex items-center gap-1 hover:underline mt-2">
                  <Plus size={12} /> Add another pair
                </button>
              </div>
            )}
          </section>

          {/* ── CLINIC GALLERY ─────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-[#0B2560]">
                Clinic Gallery — {cityLabel}
              </h2>
              <button onClick={addGallery}
                className="flex items-center gap-1.5 text-xs bg-[#0B2560] text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-[#0d2d73] transition">
                <Plus size={13} /> Add Photo
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Clinic interior, equipment, and ambiance photos. Upload to:
              <code className="bg-gray-100 px-1 rounded ml-1">{CLOUD_FOLDERS.locationPhotos(city)}</code>
            </p>
            {data.galleryImages.length === 0 ? (
              <div className="border-2 border-dashed border-gray-200 rounded-2xl py-12 text-center">
                <p className="text-gray-400 text-sm mb-3">No gallery photos yet for {cityLabel}</p>
                <button onClick={addGallery}
                  className="text-[#0B2560] text-sm font-semibold hover:underline flex items-center gap-1 mx-auto">
                  <Plus size={14} /> Add first photo
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.galleryImages.map((item: any, i: number) => (
                  <GalleryItem
                    key={i}
                    item={item}
                    city={city}
                    idx={i}
                    onChange={(v) => updateGallery(i, v)}
                    onRemove={() => removeGallery(i)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── SAVE (bottom) ──────────────────────────────────── */}
          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 bg-[#0B2560] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#0d2d73] transition disabled:opacity-60"
            >
              {saving ? <Loader size={15} className="animate-spin" /> : saved ? <CheckCircle size={15} /> : null}
              {saving ? 'Saving…' : saved ? 'Saved!' : `Save ${cityLabel} Content`}
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
