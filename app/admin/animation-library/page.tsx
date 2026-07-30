'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, Loader, Film, Sparkles } from 'lucide-react';

const ASSET_CATEGORIES = ['ambient', 'skin', 'hair', 'wellness', 'beauty', 'corporate', 'particle'];

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-400',
  active: 'bg-green-50 text-green-600',
  deprecated: 'bg-red-50 text-red-500',
};

const RATING_STYLES: Record<string, string> = {
  light: 'bg-green-50 text-green-600',
  medium: 'bg-amber-50 text-amber-600',
  heavy: 'bg-red-50 text-red-500',
};

interface AssetRow {
  _id: string;
  name: string;
  category: string;
  type: string;
  status: string;
  performanceRating: string;
  tags: string[];
  usageCount: number;
  previewImage?: { url: string };
}

export default function AnimationLibraryPage() {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [category, setCategory] = useState('');

  // Fetch the full (small, curated) asset library once — the category
  // filter used to re-fetch from the server on every dropdown change even
  // though it's just filtering this same small list.
  useEffect(() => { fetchAssets(); }, []);

  async function fetchAssets() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/animation-assets');
      const data = await res.json();
      if (data.success) setAssets(data.data);
    } finally {
      setLoading(false);
    }
  }

  const filteredAssets = useMemo(
    () => (category ? assets.filter((a) => a.category === category) : assets),
    [assets, category]
  );

  async function deleteAsset(id: string, usageCount: number) {
    if (usageCount > 0 && !confirm(`This asset is used by ${usageCount} banner${usageCount !== 1 ? 's' : ''}. Delete anyway?`)) return;
    if (usageCount === 0 && !confirm('Delete this animation asset?')) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/animation-assets/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) setAssets((a) => a.filter((x) => x._id !== id));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">🎞️ Animation Library</h1>
          <p className="text-gray-500 text-sm mt-1">Reusable Lottie, Rive, image, and video assets for the Experience Engine.</p>
        </div>
        <Link href="/admin/animation-library/new"
          className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0d2d72] transition">
          <Plus size={15} /> Add Asset
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold text-gray-500">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20"
        >
          <option value="">All Categories</option>
          {ASSET_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader className="animate-spin text-gray-300" size={24} /></div>
      ) : filteredAssets.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-4xl mb-3">🎞️</p>
          <p className="text-gray-500 font-semibold">
            {category ? `No assets in "${category}" yet.` : 'No animation assets yet — add your first one.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAssets.map((a) => (
            <div key={a._id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden group">
              <div className="relative aspect-video bg-gray-100 flex items-center justify-center">
                {a.previewImage?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.previewImage.url} alt={a.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <Film className="text-gray-300" size={28} />
                )}
                <span className="absolute top-2 left-2 bg-white/90 text-[#0B2560] text-[10px] font-bold uppercase px-2 py-1 rounded-full flex items-center gap-1">
                  <Sparkles size={10} /> {a.type}
                </span>
              </div>
              <div className="p-3">
                <p className="font-semibold text-gray-700 text-sm truncate">{a.name}</p>
                <p className="text-gray-400 text-xs mt-0.5">{a.category}</p>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${STATUS_STYLES[a.status]}`}>{a.status}</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${RATING_STYLES[a.performanceRating]}`}>{a.performanceRating}</span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase bg-blue-50 text-blue-600">
                    {a.usageCount} use{a.usageCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex items-center gap-1 justify-end mt-2">
                  <Link href={`/admin/animation-library/${a._id}`} className="p-1.5 text-gray-400 hover:text-[#0B2560] hover:bg-gray-100 rounded-lg transition">
                    <Edit size={14} />
                  </Link>
                  <button onClick={() => deleteAsset(a._id, a.usageCount)} disabled={deleting === a._id}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-40">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
