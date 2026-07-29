'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader, Save } from 'lucide-react';
import ImageUpload from './ImageUpload';
import VideoUpload from './VideoUpload';

// Mirrors ASSET_CATEGORIES in app/models/AnimationAsset.ts — not imported
// directly since that file pulls in mongoose, unsafe to bundle into a
// client component (same reason every other admin list/form in this
// codebase duplicates its Mongoose model's enum — see app/admin/courses/page.tsx).
const ASSET_CATEGORIES = ['ambient', 'skin', 'hair', 'wellness', 'beauty', 'corporate', 'particle'];

interface FormData {
  name: string;
  category: string;
  type: 'lottie' | 'rive' | 'image' | 'video';
  fileUrl: string;
  filePublicId: string;
  previewImage: { url: string; publicId: string };
  status: 'draft' | 'active' | 'deprecated';
  tags: string;
  performanceRating: 'light' | 'medium' | 'heavy';
}

export default function AnimationAssetForm({ initialData }: { initialData?: any }) {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({
    name: initialData?.name || '',
    category: initialData?.category || 'ambient',
    type: initialData?.type || 'lottie',
    fileUrl: initialData?.file?.url || '',
    filePublicId: initialData?.file?.publicId || '',
    previewImage: initialData?.previewImage || { url: '', publicId: '' },
    status: initialData?.status || 'draft',
    tags: (initialData?.tags || []).join(', '),
    performanceRating: initialData?.performanceRating || 'light',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const update = (patch: Partial<FormData>) => setForm((f) => ({ ...f, ...patch }));

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        category: form.category,
        type: form.type,
        file: { url: form.fileUrl, publicId: form.filePublicId },
        previewImage: form.previewImage,
        status: form.status,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        performanceRating: form.performanceRating,
      };
      const url = initialData ? `/api/admin/animation-assets/${initialData._id}` : '/api/admin/animation-assets';
      const res = await fetch(url, {
        method: initialData ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      router.push('/admin/animation-library');
    } catch (err: any) {
      setError(err.message || 'Failed to save animation asset');
    } finally {
      setLoading(false);
    }
  };

  const isUploadableType = form.type === 'image' || form.type === 'video';

  return (
    <div className="max-w-2xl space-y-4">
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>}

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Name</label>
          <input
            value={form.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="e.g. Aurora Sparkle Loop"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Category</label>
            <select
              value={form.category}
              onChange={(e) => update({ category: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              {ASSET_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Type</label>
            <select
              value={form.type}
              onChange={(e) => update({ type: e.target.value as FormData['type'] })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="lottie">Lottie</option>
              <option value="rive">Rive</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
            </select>
          </div>
        </div>

        {isUploadableType ? (
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">File</label>
            {form.type === 'image' ? (
              <ImageUpload
                folder="dr-youth-clinic/animation-library"
                currentPublicId={form.filePublicId}
                onUpload={(img) => update({ fileUrl: img.url, filePublicId: img.publicId })}
              />
            ) : (
              <VideoUpload currentUrl={form.fileUrl} onUpload={(vid) => update({ fileUrl: vid.url, filePublicId: vid.publicId })} />
            )}
          </div>
        ) : (
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">
              {form.type === 'lottie' ? 'Lottie JSON URL' : 'Rive (.riv) URL'}
            </label>
            <input
              value={form.fileUrl}
              onChange={(e) => update({ fileUrl: e.target.value })}
              placeholder={form.type === 'lottie' ? 'https://.../animation.json' : 'https://.../animation.riv'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              {form.type === 'rive'
                ? 'Cataloged for the upcoming Rive player — not yet rendered anywhere on the site.'
                : 'Pick this asset from the Lottie field in the Glass Hero banner editor once saved.'}
            </p>
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Preview Image (shown in the picker — required before this asset is selectable)</label>
          <ImageUpload
            folder="dr-youth-clinic/animation-library"
            currentPublicId={form.previewImage.publicId}
            onUpload={(img) => update({ previewImage: img })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Performance Rating</label>
            <select
              value={form.performanceRating}
              onChange={(e) => update({ performanceRating: e.target.value as FormData['performanceRating'] })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="light">Light</option>
              <option value="medium">Medium</option>
              <option value="heavy">Heavy</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Status</label>
            <select
              value={form.status}
              onChange={(e) => update({ status: e.target.value as FormData['status'] })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="deprecated">Deprecated</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Tags (comma-separated)</label>
          <input
            value={form.tags}
            onChange={(e) => update({ tags: e.target.value })}
            placeholder="sparkle, ambient, gold"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20"
          />
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="flex items-center justify-center gap-2 bg-[#0B2560] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0d2d72] transition disabled:opacity-50"
      >
        {loading ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
        {initialData ? 'Save Changes' : 'Add Asset'}
      </button>
    </div>
  );
}
