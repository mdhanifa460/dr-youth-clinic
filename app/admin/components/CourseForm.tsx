'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle, Save, Loader, Plus, X } from 'lucide-react';
import MediaGalleryModal from './MediaGalleryModal';
import { FieldInput, StringArrayEditor, ImagePicker } from './FormControls';

// Mirrors COURSE_CATEGORIES in app/models/Course.ts — not imported directly
// since that file pulls in mongoose, unsafe to bundle into a client
// component (same reason app/admin/courses/page.tsx and VideoForm.tsx
// duplicate their category enums).
const COURSE_CATEGORIES = [
  'Botox & Fillers', 'Laser & Energy Devices', 'Hair Restoration',
  'Thread Lifts', 'Chemical Peels', 'PRP & Regenerative Aesthetics',
  'Body Contouring', 'Practice Management',
];

interface CourseModuleForm { title: string; topics: string; duration: string }
interface CourseBatchForm { label: string; startDate: string; endDate: string; seatsTotal: string; seatsFilled: string; status: string }

interface FormData {
  title: string;
  category: string;
  shortDescription: string;
  description: string;
  thumbnail: string;
  format: 'in-person' | 'online' | 'hybrid';
  level: 'beginner' | 'intermediate' | 'advanced';
  durationLabel: string;
  curriculum: CourseModuleForm[];
  instructors: string[];
  certificationName: string;
  feeAmount: string;
  feeCurrency: string;
  feeDiscountedAmount: string;
  installmentsAvailable: boolean;
  batches: CourseBatchForm[];
  eligibility: string[];
  highlights: string[];
  brochure: string;
  featured: boolean;
  displayOrder: number;
  status: 'draft' | 'published';
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  keywords: string;
}

const DEFAULTS: FormData = {
  title: '', category: COURSE_CATEGORIES[0], shortDescription: '', description: '', thumbnail: '',
  format: 'in-person', level: 'beginner', durationLabel: '', curriculum: [], instructors: [],
  certificationName: '', feeAmount: '', feeCurrency: 'INR', feeDiscountedAmount: '', installmentsAvailable: false,
  batches: [], eligibility: [], highlights: [], brochure: '', featured: false, displayOrder: 0, status: 'draft',
  metaTitle: '', metaDescription: '', canonicalUrl: '', keywords: '',
};

// Curriculum's `topics` needs a per-line list, same as the free-text-textarea
// convention already used for benefits/highlights elsewhere in this
// codebase — one topic per line, joined/split rather than routed through
// ObjectArrayEditor (which only supports flat string fields per row).
function CurriculumEditor({ items, onChange }: { items: CourseModuleForm[]; onChange: (v: CourseModuleForm[]) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Modules</label>
        <button type="button" onClick={() => onChange([...items, { title: '', topics: '', duration: '' }])}
          className="text-[10px] text-[#0B2560] font-bold flex items-center gap-0.5 hover:underline">
          <Plus size={10} /> Add Module
        </button>
      </div>
      <div className="space-y-3">
        {items.map((m, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Module {i + 1}</span>
              <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                className="text-gray-300 hover:text-red-500"><X size={13} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={m.title} onChange={(e) => { const n = [...items]; n[i] = { ...n[i], title: e.target.value }; onChange(n); }}
                placeholder="Module title" className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
              <input value={m.duration} onChange={(e) => { const n = [...items]; n[i] = { ...n[i], duration: e.target.value }; onChange(n); }}
                placeholder="Duration (e.g. Day 1)" className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
            </div>
            <textarea value={m.topics} onChange={(e) => { const n = [...items]; n[i] = { ...n[i], topics: e.target.value }; onChange(n); }}
              placeholder="One topic per line" rows={3}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none resize-none" />
          </div>
        ))}
      </div>
    </div>
  );
}

function BatchEditor({ items, onChange }: { items: CourseBatchForm[]; onChange: (v: CourseBatchForm[]) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Upcoming Batches</label>
        <button type="button" onClick={() => onChange([...items, { label: '', startDate: '', endDate: '', seatsTotal: '', seatsFilled: '', status: 'upcoming' }])}
          className="text-[10px] text-[#0B2560] font-bold flex items-center gap-0.5 hover:underline">
          <Plus size={10} /> Add Batch
        </button>
      </div>
      <div className="space-y-3">
        {items.map((b, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Batch {i + 1}</span>
              <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                className="text-gray-300 hover:text-red-500"><X size={13} /></button>
            </div>
            <input value={b.label} onChange={(e) => { const n = [...items]; n[i] = { ...n[i], label: e.target.value }; onChange(n); }}
              placeholder="Label (e.g. Batch 12 — Sep 2026)" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={b.startDate} onChange={(e) => { const n = [...items]; n[i] = { ...n[i], startDate: e.target.value }; onChange(n); }}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
              <input type="date" value={b.endDate} onChange={(e) => { const n = [...items]; n[i] = { ...n[i], endDate: e.target.value }; onChange(n); }}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input type="number" value={b.seatsTotal} onChange={(e) => { const n = [...items]; n[i] = { ...n[i], seatsTotal: e.target.value }; onChange(n); }}
                placeholder="Total seats" className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
              <input type="number" value={b.seatsFilled} onChange={(e) => { const n = [...items]; n[i] = { ...n[i], seatsFilled: e.target.value }; onChange(n); }}
                placeholder="Seats filled" className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
              <select value={b.status} onChange={(e) => { const n = [...items]; n[i] = { ...n[i], status: e.target.value }; onChange(n); }}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none bg-white">
                <option value="upcoming">Upcoming</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CourseForm({ initialData }: { initialData?: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [doctors, setDoctors] = useState<{ _id: string; name: string; title: string }[]>([]);

  const [form, setForm] = useState<FormData>(
    initialData
      ? {
          ...DEFAULTS,
          ...initialData,
          thumbnail: initialData.thumbnail?.url ?? '',
          instructors: (initialData.instructors ?? []).map((d: any) => d._id ?? d),
          curriculum: (initialData.curriculum ?? []).map((m: any) => ({ title: m.title || '', topics: (m.topics || []).join('\n'), duration: m.duration || '' })),
          feeAmount: String(initialData.fee?.amount ?? ''),
          feeCurrency: initialData.fee?.currency ?? 'INR',
          feeDiscountedAmount: initialData.fee?.discountedAmount != null ? String(initialData.fee.discountedAmount) : '',
          installmentsAvailable: !!initialData.fee?.installmentsAvailable,
          batches: (initialData.batches ?? []).map((b: any) => ({
            label: b.label || '',
            startDate: b.startDate ? String(b.startDate).slice(0, 10) : '',
            endDate: b.endDate ? String(b.endDate).slice(0, 10) : '',
            seatsTotal: b.seatsTotal != null ? String(b.seatsTotal) : '',
            seatsFilled: b.seatsFilled != null ? String(b.seatsFilled) : '',
            status: b.status || 'upcoming',
          })),
          eligibility: initialData.eligibility ?? [],
          highlights: initialData.highlights ?? [],
          brochure: initialData.brochure?.url ?? '',
          keywords: Array.isArray(initialData.keywords) ? initialData.keywords.join(', ') : (initialData.keywords ?? ''),
        }
      : DEFAULTS
  );

  const updateForm = (data: Partial<FormData>) => setForm((f) => ({ ...f, ...data }));

  useEffect(() => {
    fetch('/api/admin/doctors').then((r) => r.json()).then((d) => { if (d.success) setDoctors(d.data ?? []); }).catch(() => {});
  }, []);

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

  const toggleInstructor = (id: string) => {
    updateForm({ instructors: form.instructors.includes(id) ? form.instructors.filter((x) => x !== id) : [...form.instructors, id] });
  };

  async function handleSubmit() {
    if (!form.title.trim()) { setError('Title is required'); return; }

    setLoading(true);
    setError('');
    try {
      const url = initialData ? `/api/admin/courses/${initialData._id}` : '/api/admin/courses';
      const method = initialData ? 'PUT' : 'POST';
      const payload = {
        ...form,
        thumbnail: form.thumbnail ? { url: form.thumbnail } : undefined,
        brochure: form.brochure ? { url: form.brochure } : undefined,
        curriculum: form.curriculum.map((m) => ({ title: m.title, duration: m.duration, topics: m.topics.split('\n').map((t) => t.trim()).filter(Boolean) })),
        fee: {
          amount: Number(form.feeAmount) || 0,
          currency: form.feeCurrency,
          discountedAmount: form.feeDiscountedAmount ? Number(form.feeDiscountedAmount) : undefined,
          installmentsAvailable: form.installmentsAvailable,
        },
        batches: form.batches.map((b) => ({
          label: b.label,
          startDate: b.startDate || undefined,
          endDate: b.endDate || undefined,
          seatsTotal: b.seatsTotal ? Number(b.seatsTotal) : undefined,
          seatsFilled: b.seatsFilled ? Number(b.seatsFilled) : undefined,
          status: b.status,
        })),
        keywords: form.keywords.split(',').map((k) => k.trim()).filter(Boolean),
      };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) { setError(data.message || 'Failed to save course'); return; }
      setSuccess(true);
      setTimeout(() => router.push('/admin/courses'), 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to save course');
    } finally {
      setLoading(false);
    }
  }

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
        <h2 className="text-2xl font-bold text-[#0B2560]">Course Details</h2>

        <FieldInput label="Title" value={form.title} onChange={(v) => updateForm({ title: v })} placeholder="e.g., Advanced Botox & Fillers Certification" />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Category</label>
            <select value={form.category} onChange={(e) => updateForm({ category: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20">
              {COURSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <FieldInput label="Duration (e.g. 3 Days)" value={form.durationLabel} onChange={(v) => updateForm({ durationLabel: v })} placeholder="3 Days" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Format</label>
            <select value={form.format} onChange={(e) => updateForm({ format: e.target.value as FormData['format'] })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20">
              <option value="in-person">In-Person</option>
              <option value="online">Online</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Level</label>
            <select value={form.level} onChange={(e) => updateForm({ level: e.target.value as FormData['level'] })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        <FieldInput label="Short Description (listing card blurb)" value={form.shortDescription} onChange={(v) => updateForm({ shortDescription: v })} type="textarea" placeholder="One or two lines shown on the course card" />
        <FieldInput label="Full Description" value={form.description} onChange={(v) => updateForm({ description: v })} type="textarea" placeholder="Full course description" />
        <ImagePicker label="Thumbnail" value={form.thumbnail} onChange={(v) => updateForm({ thumbnail: v })} openGallery={openGallery} />
        <FieldInput label="Certification Name" value={form.certificationName} onChange={(v) => updateForm({ certificationName: v })} placeholder="e.g., Certificate in Advanced Botox & Fillers" />

        <label className="flex items-center gap-2 cursor-pointer">
          <div onClick={() => updateForm({ featured: !form.featured })} className="rounded-full transition-colors shrink-0"
            style={{ width: 40, height: 22, background: form.featured ? '#0B2560' : '#d1d5db' }}>
            <div className="bg-white rounded-full shadow transition-transform" style={{ width: 18, height: 18, margin: 2, transform: form.featured ? 'translateX(18px)' : 'translateX(0)' }} />
          </div>
          <span className="text-xs font-semibold text-gray-600">Featured</span>
        </label>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-[#0B2560]">Instructors</h2>
          <p className="text-sm text-gray-500 mt-1">Faculty leading this course — references real Doctor profiles.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {doctors.map((d) => (
            <label key={d._id} className="flex items-center gap-2 text-sm text-gray-600 border border-gray-100 rounded-lg px-3 py-2 cursor-pointer">
              <input type="checkbox" checked={form.instructors.includes(d._id)} onChange={() => toggleInstructor(d._id)} />
              {d.name} <span className="text-gray-400 text-xs">— {d.title}</span>
            </label>
          ))}
          {doctors.length === 0 && <p className="text-xs text-gray-400">No doctors found — add doctors in Admin → Doctors first.</p>}
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <h2 className="text-2xl font-bold text-[#0B2560]">Curriculum</h2>
        <CurriculumEditor items={form.curriculum} onChange={(v) => updateForm({ curriculum: v })} />
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <h2 className="text-2xl font-bold text-[#0B2560]">Fee & Certification</h2>
        <div className="grid grid-cols-3 gap-4">
          <FieldInput label="Fee Amount" value={form.feeAmount} onChange={(v) => updateForm({ feeAmount: v })} type="number" placeholder="50000" />
          <FieldInput label="Currency" value={form.feeCurrency} onChange={(v) => updateForm({ feeCurrency: v })} placeholder="INR" />
          <FieldInput label="Discounted Amount (optional)" value={form.feeDiscountedAmount} onChange={(v) => updateForm({ feeDiscountedAmount: v })} type="number" placeholder="Optional" />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <div onClick={() => updateForm({ installmentsAvailable: !form.installmentsAvailable })} className="rounded-full transition-colors shrink-0"
            style={{ width: 40, height: 22, background: form.installmentsAvailable ? '#0B2560' : '#d1d5db' }}>
            <div className="bg-white rounded-full shadow transition-transform" style={{ width: 18, height: 18, margin: 2, transform: form.installmentsAvailable ? 'translateX(18px)' : 'translateX(0)' }} />
          </div>
          <span className="text-xs font-semibold text-gray-600">Installments available</span>
        </label>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <h2 className="text-2xl font-bold text-[#0B2560]">Batches</h2>
        <BatchEditor items={form.batches} onChange={(v) => updateForm({ batches: v })} />
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <h2 className="text-2xl font-bold text-[#0B2560]">Eligibility & Highlights</h2>
        <StringArrayEditor label="Eligibility (e.g. MBBS/BDS required)" items={form.eligibility} onChange={(v) => updateForm({ eligibility: v })} />
        <StringArrayEditor label="Highlights" items={form.highlights} onChange={(v) => updateForm({ highlights: v })} />
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-[#0B2560]">SEO</h2>
          <p className="text-sm text-gray-500 mt-1">Controls how this course's page appears in Google and when shared.</p>
        </div>
        <FieldInput label="Meta Title" value={form.metaTitle} onChange={(v) => updateForm({ metaTitle: v })} placeholder="Falls back to the course title if left blank" />
        <FieldInput label="Meta Description" value={form.metaDescription} onChange={(v) => updateForm({ metaDescription: v })} type="textarea" placeholder="Under 155 characters" />
        <FieldInput label="Canonical URL (optional)" value={form.canonicalUrl} onChange={(v) => updateForm({ canonicalUrl: v })} placeholder="Leave blank unless duplicated elsewhere" />
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Keywords</label>
          <input value={form.keywords} onChange={(e) => updateForm({ keywords: e.target.value })} placeholder="botox certification, aesthetic training"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
        </div>
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
          {initialData ? 'Save Changes' : 'Create Course'}
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
