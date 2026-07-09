'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle, Save, Loader } from 'lucide-react';
import MediaGalleryModal from './MediaGalleryModal';
import { FieldInput, StringArrayEditor, ObjectArrayEditor, ImagePicker } from './FormControls';

const CATEGORIES = [
  'Hair', 'Skin', 'Laser', 'Botox', 'Acne', 'PRP', 'GFC',
  'Technology', 'Doctor Talks', 'Patient Stories', 'FAQ', 'Recovery', 'Lifestyle',
];

interface FormData {
  title: string;
  youtubeUrl: string;
  thumbnail: string;
  category: string;
  doctor: string;
  service: string;
  duration: string;
  featured: boolean;
  chapters: Array<{ time: string; label: string }>;
  tags: string[];
  language: string;
  faq: Array<{ question: string; answer: string }>;
  journeyKey: string;
  journeyOrder: number;
  displayOrder: number;
  status: 'draft' | 'published';
  transcript: string;
}

const DEFAULTS: FormData = {
  title: '', youtubeUrl: '', thumbnail: '', category: 'Hair', doctor: '', service: '',
  duration: '', featured: false, chapters: [], tags: [], language: 'English',
  faq: [], journeyKey: '', journeyOrder: 0, displayOrder: 0, status: 'draft', transcript: '',
};

function toSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function youtubeThumb(url: string) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : '';
}

export default function VideoForm({ initialData }: { initialData?: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [doctors, setDoctors] = useState<{ _id: string; name: string }[]>([]);
  const [services, setServices] = useState<{ _id: string; name: string }[]>([]);

  const [form, setForm] = useState<FormData>(
    initialData
      ? {
          ...DEFAULTS,
          ...initialData,
          thumbnail: initialData.thumbnail?.url ?? '',
          doctor: initialData.doctor?._id ?? initialData.doctor ?? '',
          service: initialData.service?._id ?? initialData.service ?? '',
          chapters: initialData.chapters ?? [],
          tags: initialData.tags ?? [],
          faq: initialData.faq ?? [],
        }
      : DEFAULTS
  );

  const updateForm = (data: Partial<FormData>) => setForm((f) => ({ ...f, ...data }));

  useEffect(() => {
    fetch('/api/admin/doctors').then((r) => r.json()).then((d) => { if (d.success) setDoctors(d.data ?? []); }).catch(() => {});
    fetch('/api/admin/services').then((r) => r.json()).then((d) => { if (d.success) setServices(d.data ?? []); }).catch(() => {});
  }, []);

  // Gallery modal wiring (shared with landing-page / about builders)
  const [galleryOpen, setGalleryOpen] = useState(false);
  const galleryCallbackRef = useRef<((url: string) => void) | null>(null);
  const openGallery = useCallback((cb: (url: string) => void) => {
    galleryCallbackRef.current = cb;
    setGalleryOpen(true);
  }, []);
  const handleGallerySelect = useCallback(({ url }: { url: string; publicId: string }) => {
    galleryCallbackRef.current?.(url);
    galleryCallbackRef.current = null;
    setGalleryOpen(false);
  }, []);

  async function handleSubmit() {
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!form.youtubeUrl.trim()) { setError('YouTube URL is required'); return; }

    setLoading(true);
    setError('');
    try {
      const url = initialData ? `/api/admin/videos/${initialData._id}` : '/api/admin/videos';
      const method = initialData ? 'PUT' : 'POST';
      const payload = {
        ...form,
        thumbnail: form.thumbnail ? { url: form.thumbnail } : undefined,
        doctor: form.doctor || undefined,
        service: form.service || undefined,
      };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message || 'Failed to save video'); return; }
      setSuccess(true);
      setTimeout(() => router.push('/admin/videos'), 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to save video');
    } finally {
      setLoading(false);
    }
  }

  const previewThumb = form.thumbnail || youtubeThumb(form.youtubeUrl);

  return (
    <div className="max-w-3xl space-y-6">
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
          <AlertCircle size={14} /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl">
          <CheckCircle size={14} /> Saved — redirecting…
        </div>
      )}

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <h2 className="text-2xl font-bold text-[#0B2560]">Video Details</h2>

        <FieldInput label="Title" value={form.title} onChange={(v) => updateForm({ title: v })} placeholder="e.g., Hair PRP Explained" />
        <FieldInput label="YouTube URL" value={form.youtubeUrl} onChange={(v) => updateForm({ youtubeUrl: v })} placeholder="https://www.youtube.com/watch?v=..." />

        {previewThumb && (
          <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50 max-w-xs">
            <img src={previewThumb} alt="" className="w-full object-cover" style={{ height: 140 }} />
          </div>
        )}

        <ImagePicker label="Custom Thumbnail (optional — defaults to YouTube's)" value={form.thumbnail} onChange={(v) => updateForm({ thumbnail: v })} openGallery={openGallery} />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Category</label>
            <select value={form.category} onChange={(e) => updateForm({ category: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <FieldInput label="Duration (e.g. 12 min)" value={form.duration} onChange={(v) => updateForm({ duration: v })} placeholder="12 min" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Doctor</label>
            <select value={form.doctor} onChange={(e) => updateForm({ doctor: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20">
              <option value="">— None —</option>
              {doctors.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Related Treatment</label>
            <select value={form.service} onChange={(e) => updateForm({ service: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20">
              <option value="">— None —</option>
              {services.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <div onClick={() => updateForm({ featured: !form.featured })} className="rounded-full transition-colors shrink-0"
            style={{ width: 40, height: 22, background: form.featured ? '#0B2560' : '#d1d5db' }}>
            <div className="bg-white rounded-full shadow transition-transform" style={{ width: 18, height: 18, margin: 2, transform: form.featured ? 'translateX(18px)' : 'translateX(0)' }} />
          </div>
          <span className="text-xs font-semibold text-gray-600">Featured (shown large at the top of the Academy)</span>
        </label>

        <StringArrayEditor label="Tags" items={form.tags} onChange={(v) => updateForm({ tags: v })} />
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-[#0B2560]">Chapters</h2>
          <p className="text-sm text-gray-500 mt-1">Timestamps patients can jump to directly (e.g. 00:00 Introduction, 02:30 Procedure).</p>
        </div>
        <ObjectArrayEditor
          label="Chapters"
          items={form.chapters}
          onChange={(v) => updateForm({ chapters: v as any })}
          fields={[{ key: 'time', placeholder: '02:30', width: 'sm' }, { key: 'label', placeholder: 'Chapter title' }]}
          defaultItem={{ time: '', label: '' }}
        />
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <h2 className="text-2xl font-bold text-[#0B2560]">FAQ</h2>
        <ObjectArrayEditor
          label="Questions"
          items={form.faq}
          onChange={(v) => updateForm({ faq: v as any })}
          fields={[{ key: 'question', placeholder: 'Question' }, { key: 'answer', placeholder: 'Answer', type: 'textarea' }]}
          defaultItem={{ question: '', answer: '' }}
        />
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-[#0B2560]">Treatment Journey Sequence</h2>
          <p className="text-sm text-gray-500 mt-1">Group videos into an ordered journey (e.g. Consultation → Procedure → Recovery → Results) by giving them the same key.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FieldInput label="Journey Key (e.g. hair-prp)" value={form.journeyKey} onChange={(v) => updateForm({ journeyKey: v })} placeholder="Leave blank if not part of a journey" />
          <FieldInput label="Order within journey" value={form.journeyOrder} onChange={(v) => updateForm({ journeyOrder: Number(v) || 0 })} type="number" />
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <h2 className="text-2xl font-bold text-[#0B2560]">Transcript (optional)</h2>
        <FieldInput label="Transcript" value={form.transcript} onChange={(v) => updateForm({ transcript: v })} type="textarea" placeholder="Paste a transcript — used for future AI features (blog/FAQ/SEO generation)." />
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <h2 className="text-2xl font-bold text-[#0B2560]">Publish</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Status</label>
            <select value={form.status} onChange={(e) => updateForm({ status: e.target.value as 'draft' | 'published' })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
          <FieldInput label="Display Order" value={form.displayOrder} onChange={(v) => updateForm({ displayOrder: Number(v) || 0 })} type="number" />
        </div>

        <button onClick={handleSubmit} disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-[#0B2560] text-white py-3.5 rounded-xl font-bold hover:bg-[#0d2d72] transition disabled:opacity-50">
          {loading ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
          {initialData ? 'Save Changes' : 'Create Video'}
        </button>
      </div>

      <MediaGalleryModal
        isOpen={galleryOpen}
        onClose={() => { setGalleryOpen(false); galleryCallbackRef.current = null; }}
        onSelect={handleGallerySelect}
      />
    </div>
  );
}
