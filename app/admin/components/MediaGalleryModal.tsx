'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Search, Loader, Check, Images, RefreshCw, Upload, CloudUpload } from 'lucide-react';

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

const UPLOAD_FOLDER = 'dr-youth-clinic/gallery';

function fmt(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

type Tab = 'gallery' | 'upload';

// ─── Upload panel ─────────────────────────────────────────────────────────────

interface UploadState {
  status: 'idle' | 'uploading' | 'done' | 'error';
  progress: number;
  preview: string | null;
  fileName: string;
  error: string;
}

function UploadPanel({ onUploaded }: { onUploaded: (img: MediaImage) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [upload, setUpload] = useState<UploadState>({
    status: 'idle', progress: 0, preview: null, fileName: '', error: '',
  });

  const reset = () => setUpload({ status: 'idle', progress: 0, preview: null, fileName: '', error: '' });

  const processFile = useCallback(async (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setUpload((u) => ({ ...u, status: 'error', error: 'Only JPG, PNG, WebP, or GIF allowed.' }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUpload((u) => ({ ...u, status: 'error', error: `File too large (${fmt(file.size)}). Max is 5MB.` }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setUpload((u) => ({ ...u, preview: e.target?.result as string }));
    };
    reader.readAsDataURL(file);

    setUpload({ status: 'uploading', progress: 10, preview: null, fileName: file.name, error: '' });

    const form = new FormData();
    form.append('file', file);
    form.append('folder', UPLOAD_FOLDER);

    // Simulate progress while real upload runs
    let prog = 10;
    const ticker = setInterval(() => {
      prog = Math.min(prog + Math.random() * 15, 85);
      setUpload((u) => ({ ...u, progress: Math.round(prog) }));
    }, 300);

    try {
      const res = await fetch('/api/admin/services/upload', { method: 'POST', body: form });
      clearInterval(ticker);
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Upload failed');

      setUpload((u) => ({ ...u, status: 'done', progress: 100 }));
      onUploaded({
        publicId:  data.data.public_id,
        url:       data.data.secure_url,
        width:     data.data.width  ?? 0,
        height:    data.data.height ?? 0,
        bytes:     data.data.bytes  ?? file.size,
        createdAt: new Date().toISOString(),
      });
    } catch (e: any) {
      clearInterval(ticker);
      setUpload((u) => ({ ...u, status: 'error', progress: 0, error: e.message }));
    }
  }, [onUploaded]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[320px]">
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden" onChange={onFileChange} />

      {upload.status === 'idle' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`w-full max-w-md border-2 border-dashed rounded-3xl p-10 flex flex-col items-center gap-4 cursor-pointer transition-all ${
            dragging
              ? 'border-[#0B2560] bg-[#0B2560]/5 scale-[1.01]'
              : 'border-gray-200 hover:border-[#0B2560]/50 hover:bg-gray-50'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-[#0B2560]/8 flex items-center justify-center">
            <CloudUpload size={30} className="text-[#0B2560]" />
          </div>
          <div className="text-center">
            <p className="font-bold text-[#0B2560] text-base">
              {dragging ? 'Drop to upload' : 'Drag & drop your image here'}
            </p>
            <p className="text-sm text-gray-400 mt-1">or click to browse from your device</p>
          </div>
          <button
            type="button"
            className="mt-1 px-6 py-2.5 bg-[#0B2560] text-white text-sm font-bold rounded-xl hover:bg-[#1a3a7a] transition flex items-center gap-2"
          >
            <Upload size={14} /> Choose File
          </button>
          <p className="text-xs text-gray-300">JPG, PNG, WebP, GIF · Max 5 MB</p>
        </div>
      )}

      {(upload.status === 'uploading') && (
        <div className="w-full max-w-md flex flex-col items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[#0B2560]/8 flex items-center justify-center">
            <Loader size={28} className="text-[#0B2560] animate-spin" />
          </div>
          <p className="font-semibold text-[#0B2560]">Uploading to Cloudinary…</p>
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#0B2560] to-[#3B82C4] rounded-full transition-all duration-300"
              style={{ width: `${upload.progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400">{upload.fileName} · {upload.progress}%</p>
        </div>
      )}

      {upload.status === 'done' && (
        <div className="w-full max-w-md flex flex-col items-center gap-5 text-center">
          <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center">
            <Check size={28} className="text-green-600" />
          </div>
          <div>
            <p className="font-bold text-green-700 text-base">Upload complete!</p>
            <p className="text-sm text-gray-400 mt-1">Image saved to Cloudinary · switching to gallery…</p>
          </div>
        </div>
      )}

      {upload.status === 'error' && (
        <div className="w-full max-w-md flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
            <X size={28} className="text-red-500" />
          </div>
          <div>
            <p className="font-bold text-red-600 text-base">Upload failed</p>
            <p className="text-sm text-gray-400 mt-1">{upload.error}</p>
          </div>
          <button type="button" onClick={reset}
            className="px-5 py-2 bg-[#0B2560] text-white text-sm font-bold rounded-xl hover:bg-[#1a3a7a] transition">
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

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
  const [tab, setTab]         = useState<Tab>('gallery');
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
    setTab('gallery');
    setFolder(defaultFolder);
    fetchImages(defaultFolder);
  }, [isOpen, defaultFolder]); // eslint-disable-line react-hooks/exhaustive-deps

  // Called when an upload finishes: prepend the new image, auto-select it, switch to gallery
  const handleUploaded = (img: MediaImage) => {
    setImages((prev) => [img, ...prev]);
    setSelected(img);
    // Short delay so user sees the success state, then switch to gallery
    setTimeout(() => {
      setTab('gallery');
      setFolder('dr-youth-clinic/gallery');
      fetchImages('dr-youth-clinic/gallery');
    }, 900);
  };

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
            {tab === 'gallery' && !loading && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {filtered.length} images
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Tab switcher */}
            <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
              <button
                type="button"
                onClick={() => setTab('gallery')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  tab === 'gallery' ? 'bg-white text-[#0B2560] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Images size={12} /> Gallery
              </button>
              <button
                type="button"
                onClick={() => setTab('upload')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  tab === 'upload' ? 'bg-white text-[#0B2560] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Upload size={12} /> Upload
              </button>
            </div>
            <button type="button" onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Gallery toolbar (only shown on gallery tab) */}
        {tab === 'gallery' && (
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
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'upload' ? (
            <UploadPanel onUploaded={handleUploaded} />
          ) : (
            <div className="p-4">
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
                <div className="flex flex-col items-center justify-center h-52 gap-3">
                  <span className="text-4xl">📷</span>
                  <p className="text-sm text-gray-400">
                    {search ? 'No images match your search' : 'No images in this folder yet'}
                  </p>
                  <button type="button" onClick={() => setTab('upload')}
                    className="flex items-center gap-1.5 text-xs text-[#0B2560] font-bold hover:underline">
                    <Upload size={12} /> Upload your first image
                  </button>
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
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
          {tab === 'gallery' ? (
            <>
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
            </>
          ) : (
            <p className="text-xs text-gray-400 w-full text-center">
              Images are uploaded to <span className="font-semibold text-[#0B2560]">Cloudinary / gallery</span> and appear in your media library immediately.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
