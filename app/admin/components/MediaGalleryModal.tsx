'use client';

import { useState, useEffect } from 'react';
import { X, Search, Loader, Check, Images, RefreshCw } from 'lucide-react';

interface MediaImage {
  publicId: string;
  url: string;
  width: number;
  height: number;
  bytes: number;
  createdAt: string;
}

const FOLDERS = [
  { label: 'All',      value: 'dr-youth-clinic' },
  { label: 'Homepage', value: 'dr-youth-clinic/homepage' },
  { label: 'Doctors',  value: 'dr-youth-clinic/doctors' },
  { label: 'Services', value: 'dr-youth-clinic/services' },
  { label: 'Blog',     value: 'dr-youth-clinic/blogs' },
  { label: 'Offers',   value: 'dr-youth-clinic/offers' },
];

function fmt(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export default function MediaGalleryModal({
  isOpen,
  onClose,
  onSelect,
  defaultFolder = 'dr-youth-clinic',
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (img: { url: string; publicId: string }) => void;
  defaultFolder?: string;
}) {
  const [folder, setFolder]   = useState(defaultFolder);
  const [images, setImages]   = useState<MediaImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');
  const [selected, setSelected] = useState<MediaImage | null>(null);

  const fetchImages = async (f: string) => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`/api/admin/media?folder=${encodeURIComponent(f)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setImages(data.images);
    } catch (e: any) {
      setError(e.message || 'Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setSelected(null);
    setSearch('');
    setFolder(defaultFolder);
    fetchImages(defaultFolder);
  }, [isOpen, defaultFolder]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = search
    ? images.filter((img) => img.publicId.toLowerCase().includes(search.toLowerCase()))
    : images;

  const confirm = () => {
    if (!selected) return;
    onSelect({ url: selected.url, publicId: selected.publicId });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <Images size={17} className="text-[#0B2560]" />
            <h2 className="font-bold text-[#0B2560] text-base">Media Library</h2>
            {!loading && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {filtered.length} images
              </span>
            )}
          </div>
          <button type="button" onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition">
            <X size={15} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-gray-50 flex items-center gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-1 flex-wrap">
            {FOLDERS.map((f) => (
              <button key={f.value} type="button" onClick={() => { setFolder(f.value); fetchImages(f.value); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  folder === f.value
                    ? 'bg-[#0B2560] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search…" value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-7 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#0B2560] w-40" />
            </div>
            <button type="button" onClick={() => fetchImages(folder)} title="Refresh"
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition">
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* Gallery */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-52">
              <Loader size={24} className="animate-spin text-[#0B2560]" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-52 gap-3">
              <p className="text-sm text-red-500 font-medium">{error}</p>
              <button type="button" onClick={() => fetchImages(folder)}
                className="text-xs text-[#0B2560] font-semibold hover:underline">
                Try again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-52 gap-2">
              <span className="text-4xl">📷</span>
              <p className="text-sm text-gray-400">
                {search ? 'No images match your search' : 'No images in this folder yet'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
              {filtered.map((img) => {
                const isSel = selected?.publicId === img.publicId;
                return (
                  <button key={img.publicId} type="button"
                    onClick={() => setSelected(isSel ? null : img)}
                    onDoubleClick={() => { onSelect({ url: img.url, publicId: img.publicId }); onClose(); }}
                    className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      isSel
                        ? 'border-[#0B2560] ring-2 ring-[#0B2560]/25 scale-[0.97]'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    {isSel && (
                      <div className="absolute inset-0 bg-[#0B2560]/20 flex items-center justify-center">
                        <div className="w-7 h-7 bg-[#0B2560] rounded-full flex items-center justify-center shadow-lg">
                          <Check size={14} className="text-white" />
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent text-white text-[9px] px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="truncate font-medium">{img.publicId.split('/').pop()}</p>
                      <p className="text-white/60">{img.width}×{img.height} · {fmt(img.bytes)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
          {selected ? (
            <div className="flex items-center gap-3 min-w-0">
              <img src={selected.url} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#0B2560] truncate max-w-[220px]">
                  {selected.publicId.split('/').pop()}
                </p>
                <p className="text-xs text-gray-400">
                  {selected.width}×{selected.height} · {fmt(selected.bytes)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400">Click to select · Double-click to use immediately</p>
          )}
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition font-medium">
              Cancel
            </button>
            <button type="button" onClick={confirm} disabled={!selected}
              className="px-5 py-2 rounded-xl text-sm bg-[#0B2560] text-white font-semibold hover:bg-[#0d2d73] transition disabled:opacity-40 disabled:cursor-not-allowed">
              Use Image
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
