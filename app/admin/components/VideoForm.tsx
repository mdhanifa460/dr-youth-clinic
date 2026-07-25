'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, CheckCircle, Save, Loader, Sparkles, ExternalLink } from 'lucide-react';
import MediaGalleryModal from './MediaGalleryModal';
import SeoAiAssistant from './SeoAiAssistant';
import { FieldInput, StringArrayEditor, ObjectArrayEditor, ImagePicker } from './FormControls';

const CATEGORIES = [
  'Hair', 'Skin', 'Laser', 'Botox', 'Acne', 'PRP', 'GFC',
  'Technology', 'Doctor Talks', 'Patient Stories', 'FAQ', 'Recovery', 'Lifestyle',
];

interface FormData {
  title: string;
  youtubeUrl: string;
  channel: string;
  format: 'video' | 'short';
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
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  keywords: string;
  aiSummary: string;
  keyTakeaways: string[];
}

const DEFAULTS: FormData = {
  title: '', youtubeUrl: '', channel: '', format: 'video', thumbnail: '', category: 'Hair', doctor: '', service: '',
  duration: '', featured: false, chapters: [], tags: [], language: 'English',
  faq: [], journeyKey: '', journeyOrder: 0, displayOrder: 0, status: 'draft', transcript: '',
  metaTitle: '', metaDescription: '', canonicalUrl: '', keywords: '', aiSummary: '', keyTakeaways: [],
};

function toSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function youtubeThumb(url: string) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : '';
}

function detectFormat(url: string): 'video' | 'short' {
  return /youtube\.com\/shorts\//.test(url) ? 'short' : 'video';
}

type VideoAiFlags = { generateSeoEnabled: boolean; generateSummaryEnabled: boolean; generateFaqEnabled: boolean; generateBlogEnabled: boolean; generateStoryEnabled: boolean };
const AI_FLAGS_DEFAULT: VideoAiFlags = { generateSeoEnabled: true, generateSummaryEnabled: true, generateFaqEnabled: false, generateBlogEnabled: false, generateStoryEnabled: false };

export default function VideoForm({ initialData }: { initialData?: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [doctors, setDoctors] = useState<{ _id: string; name: string }[]>([]);
  const [services, setServices] = useState<{ _id: string; name: string }[]>([]);
  const [aiFlags, setAiFlags] = useState<VideoAiFlags>(AI_FLAGS_DEFAULT);
  const [oembedLoading, setOembedLoading] = useState(false);

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
          keyTakeaways: initialData.keyTakeaways ?? [],
          keywords: Array.isArray(initialData.keywords) ? initialData.keywords.join(', ') : (initialData.keywords ?? ''),
        }
      : DEFAULTS
  );

  const updateForm = (data: Partial<FormData>) => setForm((f) => ({ ...f, ...data }));

  useEffect(() => {
    fetch('/api/admin/doctors').then((r) => r.json()).then((d) => { if (d.success) setDoctors(d.data ?? []); }).catch(() => {});
    fetch('/api/admin/services').then((r) => r.json()).then((d) => { if (d.success) setServices(d.data ?? []); }).catch(() => {});
    fetch('/api/admin/settings').then((r) => r.json()).then((d) => { if (d.success && d.data?.videoAI) setAiFlags({ ...AI_FLAGS_DEFAULT, ...d.data.videoAI }); }).catch(() => {});
  }, []);

  // Level 1 (free): fires when the admin finishes editing the URL field —
  // fetches title + channel from YouTube's public oEmbed endpoint (no API
  // key, no quota) and detects Shorts from the URL shape. Title is only
  // overwritten if still empty, so it never clobbers a manual edit.
  const handleUrlBlur = useCallback(async () => {
    if (!form.youtubeUrl.trim()) return;
    updateForm({ format: detectFormat(form.youtubeUrl) });
    setOembedLoading(true);
    try {
      const res = await fetch(`/api/admin/videos/oembed?url=${encodeURIComponent(form.youtubeUrl)}`);
      const data = await res.json();
      if (data.success) {
        setForm((f) => ({
          ...f,
          title: f.title.trim() ? f.title : data.data.title,
          channel: data.data.channel || f.channel,
        }));
      }
    } catch {
      // Silent — this is a convenience auto-fill, not a required step; the
      // admin can still type the title/channel in manually.
    } finally {
      setOembedLoading(false);
    }
  }, [form.youtubeUrl]);

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
        keywords: form.keywords.split(',').map((k) => k.trim()).filter(Boolean),
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
        <div>
          <FieldInput label="YouTube URL" value={form.youtubeUrl} onChange={(v) => updateForm({ youtubeUrl: v })} onBlur={handleUrlBlur} placeholder="https://www.youtube.com/watch?v=..." />
          {oembedLoading && <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1"><Loader size={10} className="animate-spin" /> Looking up video info…</p>}
        </div>

        {previewThumb && (
          <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50 max-w-xs">
            <img src={previewThumb} alt="" className="w-full object-cover" style={{ height: 140 }} />
          </div>
        )}

        <ImagePicker label="Custom Thumbnail (optional — defaults to YouTube's)" value={form.thumbnail} onChange={(v) => updateForm({ thumbnail: v })} openGallery={openGallery} />

        <div className="grid grid-cols-2 gap-4">
          <FieldInput label="Channel (auto-filled)" value={form.channel} onChange={(v) => updateForm({ channel: v })} placeholder="Auto-filled from YouTube" />
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Format</label>
            <select value={form.format} onChange={(e) => updateForm({ format: e.target.value as 'video' | 'short' })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20">
              <option value="video">Video</option>
              <option value="short">Short</option>
            </select>
          </div>
        </div>

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
          <h2 className="text-2xl font-bold text-[#0B2560]">SEO</h2>
          <p className="text-sm text-gray-500 mt-1">Controls how this video's page appears in Google and when shared.</p>
        </div>
        <FieldInput label="Meta Title" value={form.metaTitle} onChange={(v) => updateForm({ metaTitle: v })} placeholder="Falls back to the video title if left blank" />
        <FieldInput label="Meta Description" value={form.metaDescription} onChange={(v) => updateForm({ metaDescription: v })} type="textarea" placeholder="Under 155 characters" />
        <FieldInput label="Canonical URL (optional)" value={form.canonicalUrl} onChange={(v) => updateForm({ canonicalUrl: v })} placeholder="Leave blank unless this video is duplicated elsewhere" />
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Keywords</label>
          <input value={form.keywords} onChange={(e) => updateForm({ keywords: e.target.value })} placeholder="hair prp, hair restoration chennai"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
        </div>
        {initialData?._id && aiFlags.generateSeoEnabled && (
          <SeoAiAssistant
            lpId={initialData._id}
            endpoint={`/api/admin/videos/${initialData._id}/seo-keywords`}
            pageTitle={form.title}
            template={form.category}
            description={form.metaDescription}
            keywords={form.keywords}
            onApplyDescription={(v) => updateForm({ metaDescription: v.slice(0, 160) })}
            onKeywordsChange={(v) => updateForm({ keywords: v })}
          />
        )}
      </div>

      {initialData?._id && (
        <AiGenerateCard
          videoId={initialData._id}
          flags={aiFlags}
          form={form}
          updateForm={updateForm}
        />
      )}

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-[#0B2560]">Chapters</h2>
          <p className="text-sm text-gray-500 mt-1">Timestamps patients can jump to directly (e.g. 00:00 Introduction, 02:30 Procedure). Entered manually — reliable and free.</p>
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
        <h2 className="text-2xl font-bold text-[#0B2560]">Transcript (optional, premium)</h2>
        <p className="text-sm text-gray-500 -mt-4">Paste a transcript to improve every AI generator above (Summary, FAQ, Blog, Story) — none of them require it, but all of them get more accurate with one.</p>
        <FieldInput label="Transcript" value={form.transcript} onChange={(v) => updateForm({ transcript: v })} type="textarea" placeholder="Paste a transcript (optional)." />
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

// ─── AI Generate (Level 2 — on-demand only, gated by Settings → Video AI) ──
function AiGenerateCard({ videoId, flags, form, updateForm }: {
  videoId: string;
  flags: VideoAiFlags;
  form: FormData;
  updateForm: (data: Partial<FormData>) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [genError, setGenError] = useState('');
  const [draftLinks, setDraftLinks] = useState<{ blog?: string; story?: string }>({});

  const anyEnabled = flags.generateSummaryEnabled || flags.generateFaqEnabled || flags.generateBlogEnabled || flags.generateStoryEnabled;
  if (!anyEnabled) return null;

  async function run(action: string, endpoint: string, onSuccess: (data: any) => void) {
    setBusy(action); setGenError('');
    try {
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json();
      if (!data.success) { setGenError(data.message || 'Generation failed'); return; }
      onSuccess(data.data);
    } catch {
      setGenError('Network error — please try again');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-[#0B2560] flex items-center gap-2"><Sparkles size={20} className="text-[#F5A623]" /> AI Generate</h2>
        <p className="text-sm text-gray-500 mt-1">On-demand only — nothing here runs automatically. Each result is added to the form for you to review and edit before Save.</p>
      </div>

      {genError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{genError}</p>}

      <div className="flex flex-wrap gap-2.5">
        {flags.generateSummaryEnabled && (
          <button disabled={busy !== null} onClick={() => run('summary', `/api/admin/videos/${videoId}/generate-summary`, (data) => updateForm({ aiSummary: data.summary, keyTakeaways: data.keyTakeaways }))}
            className="flex items-center gap-1.5 text-xs font-bold text-[#0B2560] bg-[#f6faff] hover:bg-blue-50 border border-blue-100 px-3.5 py-2 rounded-xl transition disabled:opacity-50">
            {busy === 'summary' ? <Loader size={12} className="animate-spin" /> : <Sparkles size={12} />} Generate Summary
          </button>
        )}
        {flags.generateFaqEnabled && (
          <button disabled={busy !== null} onClick={() => run('faq', `/api/admin/videos/${videoId}/generate-faq`, (data) => updateForm({ faq: [...form.faq, ...data] }))}
            className="flex items-center gap-1.5 text-xs font-bold text-[#0B2560] bg-[#f6faff] hover:bg-blue-50 border border-blue-100 px-3.5 py-2 rounded-xl transition disabled:opacity-50">
            {busy === 'faq' ? <Loader size={12} className="animate-spin" /> : <Sparkles size={12} />} Generate FAQ
          </button>
        )}
        {flags.generateBlogEnabled && (
          <button disabled={busy !== null} onClick={() => run('blog', `/api/admin/videos/${videoId}/generate-blog`, (data) => setDraftLinks((l) => ({ ...l, blog: data._id })))}
            className="flex items-center gap-1.5 text-xs font-bold text-[#0B2560] bg-[#f6faff] hover:bg-blue-50 border border-blue-100 px-3.5 py-2 rounded-xl transition disabled:opacity-50">
            {busy === 'blog' ? <Loader size={12} className="animate-spin" /> : <Sparkles size={12} />} Generate Blog Draft
          </button>
        )}
        {flags.generateStoryEnabled && (
          <button disabled={busy !== null} onClick={() => run('story', `/api/admin/videos/${videoId}/generate-story`, (data) => setDraftLinks((l) => ({ ...l, story: data._id })))}
            className="flex items-center gap-1.5 text-xs font-bold text-[#0B2560] bg-[#f6faff] hover:bg-blue-50 border border-blue-100 px-3.5 py-2 rounded-xl transition disabled:opacity-50">
            {busy === 'story' ? <Loader size={12} className="animate-spin" /> : <Sparkles size={12} />} Generate Web Story Draft
          </button>
        )}
      </div>

      {(form.aiSummary || form.keyTakeaways.length > 0) && (
        <div className="space-y-3 pt-2 border-t border-gray-50">
          <FieldInput label="AI Summary" value={form.aiSummary} onChange={(v) => updateForm({ aiSummary: v })} type="textarea" placeholder="Generated summary appears here — edit freely." />
          <StringArrayEditor label="Key Takeaways" items={form.keyTakeaways} onChange={(v) => updateForm({ keyTakeaways: v })} />
        </div>
      )}

      {(draftLinks.blog || draftLinks.story) && (
        <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-50">
          {draftLinks.blog && (
            <Link href={`/admin/blog/${draftLinks.blog}`} className="text-xs font-bold text-[#0B2560] flex items-center gap-1 hover:underline">
              <ExternalLink size={12} /> Blog draft created — open it to review and publish
            </Link>
          )}
          {draftLinks.story && (
            <Link href={`/admin/stories/${draftLinks.story}`} className="text-xs font-bold text-[#0B2560] flex items-center gap-1 hover:underline">
              <ExternalLink size={12} /> Web Story draft created — open it to review and publish
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
