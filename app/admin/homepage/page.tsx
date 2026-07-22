'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, Upload, CheckCircle, Loader, Images } from 'lucide-react';
import MediaGalleryModal from '@/app/admin/components/MediaGalleryModal';
import SectionList from '@/app/admin/components/builder/SectionList';
import SectionCard from '@/app/admin/components/builder/SectionCard';
import SaveTemplateModal from '@/app/admin/components/builder/SaveTemplateModal';

// ─── Types ────────────────────────────────────────────────
// id/type mirror sectionKey — homepage sections are fixed, one-per-type slots
// (unlike Landing Pages/About's free-form lists), but keeping this shape
// structurally compatible with BuilderSection lets it reuse the same shared
// drag-and-drop SectionList/SectionCard components.
interface Section {
  _id?: string;
  id: string;
  type: string;
  sectionKey: string;
  label: string;
  order: number;
  visible: boolean;
  data: Record<string, any>;
}

// Homepage sections don't carry their own icon field (unlike Landing Pages/
// About's SECTION_LABELS) — this is purely cosmetic for the shared SectionCard.
const SECTION_ICONS: Record<string, string> = {
  topbar: '🔝',
  header: '🧭',
  hero: '🖼️',
  stats: '📊',
  trust_timeline: '🔴',
  consultation_form: '📝',
  cta_strip: '📣',
  before_after: '↔️',
  services: '🩺',
  founder: '👤',
  doctors: '👨‍⚕️',
  video_academy: '🎬',
  locations: '📍',
  testimonials: '💬',
  faq: '❓',
  blog: '📰',
  footer: '🔻',
};

// ─── FAQ categories ────────────────────────────────────────
// Mirrors the category groupings on the public /faqs page (app/(public)/faqs/page.tsx
// STATIC_FAQS) so an admin-authored FAQ lands in the matching section there.
const FAQ_CATEGORIES = [
  'General',
  'Skin Treatments',
  'Hair Treatments',
  'Laser Treatments',
  'Pricing & EMI',
  'Safety & Results',
  'Booking',
];

// ─── Dynamic FAQ keyword suggestions ──────────────────────
const STATIC_FAQ_SUGGESTIONS: Record<string, string[]> = {
  General: [
    'What treatments does DR Youth Clinic offer?',
    'Are your doctors certified dermatologists?',
    'Do you offer a free consultation?',
    'Can I book an appointment online?',
    'How do I choose the right treatment for me?',
  ],
  'Skin Treatments': [
    'What skin conditions do you treat?',
    'How many sessions of HydraFacial do I need?',
    'Is chemical peel safe for sensitive skin?',
    'What is the best treatment for pigmentation?',
    'How long does acne scar treatment take?',
  ],
  'Hair Treatments': [
    'Is PRP treatment effective for hair loss?',
    'How many sessions of GFC therapy do I need?',
    'What causes hair loss in women?',
    'Is hair transplant permanent?',
    'What is the difference between PRP and GFC?',
  ],
  Laser: [
    'How many laser hair removal sessions will I need?',
    'Is laser treatment safe for dark skin?',
    'Does laser hair removal hurt?',
    'What areas can be treated with laser?',
    'How long do laser hair removal results last?',
  ],
  'Pricing & EMI': [
    'How much does laser hair removal cost?',
    'Do you offer EMI or instalment payment options?',
    'Are treatment prices all-inclusive?',
    'Does insurance cover skin treatments?',
  ],
  Safety: [
    'Are treatments safe for all skin types?',
    'Is the treatment painful?',
    'What is the recovery time after treatment?',
    'How long do results last?',
    'Are there any side effects?',
  ],
};

function FAQSuggestions({
  existing,
  onAdd,
}: {
  existing: { question: string }[];
  onAdd: (question: string) => void;
}) {
  const [services, setServices] = useState<{ name: string; category: string }[]>([]);
  const [activeTab, setActiveTab] = useState('General');

  useEffect(() => {
    fetch('/api/admin/services?limit=50')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setServices(data.data.map((s: any) => ({ name: s.name, category: s.category })));
        }
      })
      .catch(() => {});
  }, []);

  const existingQuestions = new Set(existing.map((f) => f.question));

  // Build service-specific suggestions
  const serviceQuestions: string[] = services.flatMap((svc) => [
    `How many sessions does ${svc.name} require?`,
    `Is ${svc.name} safe for sensitive skin?`,
    `How long do results from ${svc.name} last?`,
  ]);

  const allSuggestions: Record<string, string[]> = {
    ...STATIC_FAQ_SUGGESTIONS,
    ...(serviceQuestions.length > 0 ? { 'By Treatment': serviceQuestions } : {}),
  };

  const tabs = Object.keys(allSuggestions);
  const current = allSuggestions[activeTab] ?? [];
  const available = current.filter((q) => !existingQuestions.has(q));

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
      <p className="text-xs font-bold text-[#0B2560] mb-0.5">Schema Markup Suggestions</p>
      <p className="text-[10px] text-gray-500 mb-3 leading-relaxed">
        Google shows these Q&amp;As as rich snippets in search results. Click any question to add it, then fill in your answer.
      </p>
      {/* Category tabs */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`text-[10px] px-2.5 py-1 rounded-full font-semibold transition ${
              activeTab === tab
                ? 'bg-[#0B2560] text-white'
                : 'bg-white border border-blue-200 text-[#0B2560] hover:bg-blue-100'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      {/* Question chips */}
      {available.length === 0 ? (
        <p className="text-[10px] text-gray-400 italic">All suggestions in this category already added.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {available.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onAdd(q)}
              className="text-[10px] bg-white border border-blue-200 text-[#0B2560] px-2.5 py-1 rounded-full hover:bg-[#0B2560] hover:text-white hover:border-[#0B2560] transition text-left"
            >
              + {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tiny image upload widget ─────────────────────────────
function ImgField({
  label,
  value,
  onChange,
  folder = 'dr-youth-clinic/homepage',
}: {
  label: string;
  value: { url: string; publicId: string };
  onChange: (v: { url: string; publicId: string }) => void;
  folder?: string;
}) {
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [galleryOpen, setGallery]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    const oldPublicId = value?.publicId;
    setError('');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', folder);
      const res  = await fetch('/api/admin/services/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      onChange({ url: json.data.secure_url, publicId: json.data.public_id });
      // Delete the replaced image from Cloudinary (fire-and-forget)
      if (oldPublicId) {
        fetch('/api/admin/media', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicId: oldPublicId }),
        }).catch(() => {});
      }
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <div className="flex items-start gap-3">
        {value?.url ? (
          <div className="relative w-20 h-16 rounded-lg overflow-hidden border border-gray-200 shrink-0">
            <img src={value.url} alt="preview" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-20 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center shrink-0 bg-gray-50">
            <span className="text-gray-300 text-2xl">🖼️</span>
          </div>
        )}
        <div className="space-y-1.5">
          <div className="flex gap-1.5">
            <input ref={inputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
            <button type="button" onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs bg-[#0B2560] text-white px-3 py-1.5 rounded-lg hover:bg-[#0d2d73] transition"
              disabled={loading}>
              {loading ? <Loader size={12} className="animate-spin" /> : <Upload size={12} />}
              {loading ? 'Uploading…' : 'Upload'}
            </button>
            <button type="button" onClick={() => setGallery(true)}
              className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition">
              <Images size={12} className="text-[#0B2560]" />
              Gallery
            </button>
          </div>
          {value?.url && (
            <button type="button" onClick={() => onChange({ url: '', publicId: '' })}
              className="text-xs text-red-500 hover:underline block">
              Remove
            </button>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      </div>
      <MediaGalleryModal
        isOpen={galleryOpen}
        onClose={() => setGallery(false)}
        onSelect={(img) => { onChange(img); setGallery(false); }}
        defaultFolder={folder}
      />
    </div>
  );
}

// ─── Generic helpers ──────────────────────────────────────
function TextField({ label, value, onChange, multiline = false }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean;
}) {
  const cls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0B2560] focus:ring-1 focus:ring-[#0B2560]";
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      {multiline
        ? <textarea rows={3} className={cls} value={value || ''} onChange={(e) => onChange(e.target.value)} />
        : <input type="text" className={cls} value={value || ''} onChange={(e) => onChange(e.target.value)} />}
    </div>
  );
}

function StringListField({ label, value, onChange }: {
  label: string; value: string[]; onChange: (v: string[]) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <div className="space-y-2">
        {(value || []).map((item, i) => (
          <div key={i} className="flex gap-2">
            <input type="text" value={item} onChange={(e) => {
              const next = [...value]; next[i] = e.target.value; onChange(next);
            }} className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#0B2560]" />
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))}
              className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
          </div>
        ))}
        <button type="button" onClick={() => onChange([...(value || []), ''])}
          className="text-xs text-[#0B2560] font-semibold flex items-center gap-1 hover:underline">
          <Plus size={12} /> Add item
        </button>
      </div>
    </div>
  );
}

// ─── Hero multi-slide editor ──────────────────────────────
const HERO_ACCENT_PRESETS = [
  { label: 'Blue',   value: 'from-[#f6faff] to-[#e8eff7]' },
  { label: 'Sky',    value: 'from-[#eef6ff] to-[#dcedfb]' },
  { label: 'Indigo', value: 'from-[#f0f4ff] to-[#e2eaf8]' },
  { label: 'Amber',  value: 'from-[#fffbeb] to-[#fef3c7]' },
  { label: 'Mint',   value: 'from-[#f0fdf4] to-[#dcfce7]' },
  { label: 'Rose',   value: 'from-[#fff1f2] to-[#ffe4e6]' },
];

function HeroSlidesEditor({ d, onChange }: { d: any; onChange: (data: any) => void }) {
  const slides: any[] = d.slides || [];
  const [openIdx, setOpenIdx] = useState<number | null>(slides.length > 0 ? 0 : null);

  const setSlide = (idx: number, path: string, value: any) => {
    const next = JSON.parse(JSON.stringify(d));
    if (!next.slides) next.slides = [];
    const keys = path.split('.');
    let cur: any = next.slides[idx];
    for (let i = 0; i < keys.length - 1; i++) {
      if (!cur[keys[i]]) cur[keys[i]] = {};
      cur = cur[keys[i]];
    }
    cur[keys[keys.length - 1]] = value;
    onChange(next);
  };

  const addSlide = () => {
    const next = JSON.parse(JSON.stringify(d));
    if (!next.slides) next.slides = [];
    next.slides.push({
      badge: '', headline: '', highlightText: '', description: '',
      ctaPrimary: { text: 'Book Consultation', href: '/book' },
      ctaSecondary: { text: 'Our Services', href: '#services' },
      image: { url: '', publicId: '' },
      trustBadges: [{ icon: '✅', text: '' }],
      accentBg: HERO_ACCENT_PRESETS[0].value,
    });
    setOpenIdx(next.slides.length - 1);
    onChange(next);
  };

  const removeSlide = (idx: number) => {
    const next = JSON.parse(JSON.stringify(d));
    next.slides.splice(idx, 1);
    setOpenIdx(next.slides.length === 0 ? null : idx > 0 ? idx - 1 : 0);
    onChange(next);
  };

  const moveSlide = (idx: number, dir: -1 | 1) => {
    const next = JSON.parse(JSON.stringify(d));
    const target = idx + dir;
    if (target < 0 || target >= next.slides.length) return;
    [next.slides[idx], next.slides[target]] = [next.slides[target], next.slides[idx]];
    setOpenIdx(target);
    onChange(next);
  };

  const importFromFlat = () => {
    const next = JSON.parse(JSON.stringify(d));
    next.slides = [{
      badge: d.badge || '',
      headline: d.headline || '',
      highlightText: d.highlightText || '',
      description: d.description || '',
      ctaPrimary: d.ctaPrimary || { text: 'Book Consultation', href: '/book' },
      ctaSecondary: d.ctaSecondary || { text: 'Our Services', href: '#services' },
      image: d.image || { url: '', publicId: '' },
      trustBadges: d.trustBadges || [],
      accentBg: HERO_ACCENT_PRESETS[0].value,
    }];
    setOpenIdx(0);
    onChange(next);
  };

  const hasFlatData = !!(d.badge || d.headline || d.image?.url);

  if (slides.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
        <p className="text-3xl mb-2">🖼️</p>
        <p className="text-sm font-semibold text-gray-500 mb-1">No banner slides configured</p>
        <p className="text-xs text-gray-400 mb-4">Add slides to build a multi-banner carousel</p>
        <div className="flex gap-2 justify-center flex-wrap">
          {hasFlatData && (
            <button type="button" onClick={importFromFlat}
              className="text-xs font-semibold text-[#0B2560] border border-[#0B2560] px-4 py-2 rounded-lg hover:bg-[#0B2560]/5 transition">
              Import existing data as Slide 1
            </button>
          )}
          <button type="button" onClick={addSlide}
            className="text-xs font-semibold bg-[#0B2560] text-white px-4 py-2 rounded-lg hover:bg-[#0d2d73] transition flex items-center gap-1.5">
            <Plus size={13} /> Add First Slide
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {slides.map((slide, idx) => (
        <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden">
          {/* Header row */}
          <div
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none transition-colors ${openIdx === idx ? 'bg-[#f0f4ff]' : 'bg-gray-50/60 hover:bg-gray-100/60'}`}
            onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
          >
            {slide.image?.url ? (
              <img src={slide.image.url} alt="" className="w-10 h-8 rounded object-cover shrink-0 border border-gray-200" />
            ) : (
              <div className="w-10 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-300 shrink-0 text-sm border border-gray-200">🖼️</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#0B2560]">Slide {idx + 1}</p>
              <p className="text-xs text-gray-400 truncate">{slide.badge || slide.headline || 'Untitled slide'}</p>
            </div>
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={() => moveSlide(idx, -1)} disabled={idx === 0} title="Move up"
                className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-200 disabled:opacity-30 transition">
                <ChevronUp size={13} />
              </button>
              <button type="button" onClick={() => moveSlide(idx, 1)} disabled={idx === slides.length - 1} title="Move down"
                className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-200 disabled:opacity-30 transition">
                <ChevronDown size={13} />
              </button>
              <button type="button" onClick={() => removeSlide(idx)} title="Delete slide"
                className="w-7 h-7 flex items-center justify-center rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition">
                <Trash2 size={13} />
              </button>
            </div>
            <div className="w-4 text-gray-400 shrink-0">
              {openIdx === idx ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </div>
          </div>

          {/* Expanded form */}
          {openIdx === idx && (
            <div className="px-4 pb-5 pt-4 space-y-4 border-t border-gray-100">
              <div className="grid sm:grid-cols-2 gap-4">
                <TextField label="Badge Text" value={slide.badge} onChange={(v) => setSlide(idx, 'badge', v)} />
                <TextField label="Highlight Text" value={slide.highlightText} onChange={(v) => setSlide(idx, 'highlightText', v)} />
              </div>
              <TextField label="Headline (use \\n for line break)" value={slide.headline} onChange={(v) => setSlide(idx, 'headline', v)} multiline />
              <TextField label="Description" value={slide.description} onChange={(v) => setSlide(idx, 'description', v)} multiline />
              <div className="grid sm:grid-cols-2 gap-4">
                <TextField label="Primary CTA Text" value={slide.ctaPrimary?.text} onChange={(v) => setSlide(idx, 'ctaPrimary.text', v)} />
                <TextField label="Primary CTA Link" value={slide.ctaPrimary?.href} onChange={(v) => setSlide(idx, 'ctaPrimary.href', v)} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <TextField label="Secondary CTA Text" value={slide.ctaSecondary?.text} onChange={(v) => setSlide(idx, 'ctaSecondary.text', v)} />
                <TextField label="Secondary CTA Link" value={slide.ctaSecondary?.href} onChange={(v) => setSlide(idx, 'ctaSecondary.href', v)} />
              </div>

              {/* Background theme */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Background Theme</label>
                <div className="flex flex-wrap gap-2">
                  {HERO_ACCENT_PRESETS.map((p) => (
                    <button key={p.value} type="button"
                      onClick={() => setSlide(idx, 'accentBg', p.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                        (slide.accentBg || HERO_ACCENT_PRESETS[0].value) === p.value
                          ? 'border-[#0B2560] bg-[#0B2560] text-white'
                          : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-400'
                      }`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trust badges */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Trust Badges</label>
                <div className="space-y-2">
                  {(slide.trustBadges || []).map((b: any, bi: number) => (
                    <div key={bi} className="flex gap-2 items-center">
                      <input type="text" placeholder="Icon" value={b.icon || ''}
                        onChange={(e) => {
                          const next = JSON.parse(JSON.stringify(d));
                          next.slides[idx].trustBadges[bi].icon = e.target.value;
                          onChange(next);
                        }}
                        className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:border-[#0B2560]" />
                      <input type="text" placeholder="Text" value={b.text || ''}
                        onChange={(e) => {
                          const next = JSON.parse(JSON.stringify(d));
                          next.slides[idx].trustBadges[bi].text = e.target.value;
                          onChange(next);
                        }}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#0B2560]" />
                      <button type="button" onClick={() => {
                        const next = JSON.parse(JSON.stringify(d));
                        next.slides[idx].trustBadges.splice(bi, 1);
                        onChange(next);
                      }} className="text-red-400 hover:text-red-600 shrink-0"><Trash2 size={13} /></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => {
                    const next = JSON.parse(JSON.stringify(d));
                    if (!next.slides[idx].trustBadges) next.slides[idx].trustBadges = [];
                    next.slides[idx].trustBadges.push({ icon: '✅', text: '' });
                    onChange(next);
                  }} className="text-xs text-[#0B2560] font-semibold flex items-center gap-1 hover:underline">
                    <Plus size={12} /> Add badge
                  </button>
                </div>
              </div>

              <ImgField
                label="Slide Image"
                value={slide.image || { url: '', publicId: '' }}
                onChange={(v) => setSlide(idx, 'image', v)}
              />
            </div>
          )}
        </div>
      ))}

      <button type="button" onClick={addSlide}
        className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-xs font-semibold text-[#0B2560] hover:border-[#0B2560]/40 hover:bg-[#f6faff] transition flex items-center justify-center gap-1.5">
        <Plus size={13} /> Add New Slide
      </button>
    </div>
  );
}

// ─── Section-specific form renderers ─────────────────────
function SectionForm({ section, onChange }: { section: Section; onChange: (data: any) => void }) {
  const d = section.data;

  const set = (path: string, value: any) => {
    const keys = path.split('.');
    const next = JSON.parse(JSON.stringify(d));
    let cur: any = next;
    for (let i = 0; i < keys.length - 1; i++) {
      if (cur[keys[i]] === undefined) cur[keys[i]] = {};
      cur = cur[keys[i]];
    }
    cur[keys[keys.length - 1]] = value;
    onChange(next);
  };

  const setArr = (key: string, idx: number, subKey: string, value: any) => {
    const next = JSON.parse(JSON.stringify(d));
    next[key][idx][subKey] = value;
    onChange(next);
  };

  const addArrItem = (key: string, template: any) => {
    const next = JSON.parse(JSON.stringify(d));
    next[key] = [...(next[key] || []), template];
    onChange(next);
  };

  const removeArrItem = (key: string, idx: number) => {
    const next = JSON.parse(JSON.stringify(d));
    next[key].splice(idx, 1);
    onChange(next);
  };

  switch (section.sectionKey) {
    case 'topbar':
      return (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <TextField label="Phone" value={d.phone} onChange={(v) => set('phone', v)} />
            <TextField label="Email" value={d.email} onChange={(v) => set('email', v)} />
          </div>
          <TextField label="Badge Text" value={d.badge} onChange={(v) => set('badge', v)} />
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Social Links</p>
            {(d.socialLinks || []).map((s: any, i: number) => (
              <div key={i} className="flex gap-2 mb-2">
                <select value={s.platform} onChange={(e) => setArr('socialLinks', i, 'platform', e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm">
                  {['facebook','instagram','youtube','twitter','whatsapp'].map(p => <option key={p}>{p}</option>)}
                </select>
                <input type="url" placeholder="URL" value={s.url}
                  onChange={(e) => setArr('socialLinks', i, 'url', e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                <button type="button" onClick={() => removeArrItem('socialLinks', i)} className="text-red-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => addArrItem('socialLinks', { platform: 'facebook', url: '#' })}
              className="text-xs text-[#0B2560] font-semibold flex items-center gap-1 hover:underline">
              <Plus size={12} /> Add social link
            </button>
          </div>
        </div>
      );

    case 'header':
      return (
        <div className="space-y-4">
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Header/Nav is managed via the existing Navbar component. Changes here are stored but apply on next Navbar update.
          </p>
          <TextField label="Logo URL" value={d.logoUrl} onChange={(v) => set('logoUrl', v)} />
          <div className="grid sm:grid-cols-2 gap-4">
            <TextField label="CTA Button Text" value={d.ctaText} onChange={(v) => set('ctaText', v)} />
            <TextField label="CTA Button Link" value={d.ctaHref} onChange={(v) => set('ctaHref', v)} />
          </div>
          <TextField label="Phone" value={d.phone} onChange={(v) => set('phone', v)} />
        </div>
      );

    case 'hero':
      return <HeroSlidesEditor d={d} onChange={onChange} />;

    case 'trust_timeline':
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-green-100 bg-green-50 p-4 flex items-start gap-3">
            <span className="text-lg shrink-0">🔴</span>
            <p className="text-xs text-green-800">
              The numbers themselves are always live — calculated from real bookings, never editable. Only the
              labels below can be changed.
            </p>
          </div>
          <TextField label="Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <TextField label="Today Label" value={d.todayLabel} onChange={(v) => set('todayLabel', v)} />
          <TextField label="This Week Label" value={d.weekLabel} onChange={(v) => set('weekLabel', v)} />
          <TextField label="This Month Label" value={d.monthLabel} onChange={(v) => set('monthLabel', v)} />
        </div>
      );

    case 'stats':
      return (
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-3">Stats (4 items)</p>
          <div className="space-y-3">
            {(d.stats || []).map((s: any, i: number) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center">
                <input type="text" placeholder="Value (e.g. 25K+)" value={s.value}
                  onChange={(e) => setArr('stats', i, 'value', e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                <input type="text" placeholder="Label" value={s.label}
                  onChange={(e) => setArr('stats', i, 'label', e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                <label className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                  <input type="checkbox" checked={!!s.showStars}
                    onChange={(e) => setArr('stats', i, 'showStars', e.target.checked)} />
                  Stars
                </label>
              </div>
            ))}
            <button type="button" onClick={() => addArrItem('stats', { value: '', label: '' })}
              className="text-xs text-[#0B2560] font-semibold flex items-center gap-1 hover:underline mt-1">
              <Plus size={12} /> Add stat
            </button>
          </div>
        </div>
      );

    case 'consultation_form':
      return (
        <div className="space-y-4">
          <TextField label="Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <TextField label="Sub-text" value={d.subtext} onChange={(v) => set('subtext', v)} multiline />
          <TextField label="CTA Button Text" value={d.ctaText} onChange={(v) => set('ctaText', v)} />
          <StringListField label="Services (dropdown options)" value={d.services} onChange={(v) => set('services', v)} />
          <StringListField label="Cities (dropdown options)" value={d.cities} onChange={(v) => set('cities', v)} />
        </div>
      );

    case 'services':
      return (
        <div className="space-y-4">
          <TextField label="Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <TextField label="Sub-headline" value={d.subheadline} onChange={(v) => set('subheadline', v)} multiline />
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-3">Service Cards</p>
            {(d.cards || []).map((c: any, i: number) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4 mb-3">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-gray-500">Card {i + 1}</span>
                  <button type="button" onClick={() => removeArrItem('cards', i)} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                </div>
                <div className="space-y-3">
                  <div className="grid sm:grid-cols-3 gap-3">
                    <input type="text" placeholder="Icon (emoji)" value={c.icon}
                      onChange={(e) => setArr('cards', i, 'icon', e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                    <input type="text" placeholder="Tag label (e.g. Dermatology)" value={c.tag || ''}
                      onChange={(e) => setArr('cards', i, 'tag', e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                    <input type="text" placeholder="Title" value={c.title}
                      onChange={(e) => setArr('cards', i, 'title', e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                  </div>
                  <textarea rows={2} placeholder="Description" value={c.description}
                    onChange={(e) => setArr('cards', i, 'description', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                  <input type="text" placeholder="Link URL" value={c.href}
                    onChange={(e) => setArr('cards', i, 'href', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                  <ImgField label="Card Image (optional — shows behind gradient overlay)" value={c.image}
                    onChange={(v) => { const next = JSON.parse(JSON.stringify(d)); next.cards[i].image = v; onChange(next); }} />
                </div>
              </div>
            ))}
            <button type="button" onClick={() => addArrItem('cards', { icon: '🩺', tag: '', title: '', description: '', href: '/services', image: { url: '', publicId: '' } })}
              className="text-xs text-[#0B2560] font-semibold flex items-center gap-1 hover:underline">
              <Plus size={12} /> Add card
            </button>
          </div>
          <div className="border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-bold text-gray-500 mb-3">Diagnosis Panel</p>
            <div className="space-y-3">
              <TextField label="Title" value={d.diagnosisPanel?.title} onChange={(v) => set('diagnosisPanel.title', v)} />
              <TextField label="Description" value={d.diagnosisPanel?.description} onChange={(v) => set('diagnosisPanel.description', v)} multiline />
              <div className="grid sm:grid-cols-2 gap-3">
                <TextField label="CTA Text" value={d.diagnosisPanel?.ctaText} onChange={(v) => set('diagnosisPanel.ctaText', v)} />
                <TextField label="CTA Link" value={d.diagnosisPanel?.ctaHref} onChange={(v) => set('diagnosisPanel.ctaHref', v)} />
              </div>
            </div>
          </div>
        </div>
      );

    case 'before_after':
      return (
        <div className="space-y-4">
          <TextField label="Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <TextField label="Sub-headline" value={d.subheadline} onChange={(v) => set('subheadline', v)} multiline />
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-3">Before / After Pairs</p>
            {(d.pairs || []).map((p: any, i: number) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4 mb-3">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-gray-500">Pair {i + 1}</span>
                  <button type="button" onClick={() => removeArrItem('pairs', i)} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                </div>
                <div className="space-y-3">
                  <input type="text" placeholder="Title" value={p.title}
                    onChange={(e) => setArr('pairs', i, 'title', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                  <textarea rows={2} placeholder="Description" value={p.description}
                    onChange={(e) => setArr('pairs', i, 'description', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                  <div>
                    <input type="text" placeholder="Category (e.g. Skin Care, Hair, Laser)" value={p.category || ''}
                      list="before-after-categories"
                      onChange={(e) => setArr('pairs', i, 'category', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                    <p className="text-[11px] text-gray-400 mt-1">
                      Controls the filter tab this result shows under on the <a href="/results" target="_blank" rel="noopener noreferrer" className="underline">/results</a> page.
                      Type a new category to create it — no code change needed.
                    </p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <ImgField label="Before Image" value={p.before}
                      onChange={(v) => { const next = JSON.parse(JSON.stringify(d)); next.pairs[i].before = v; onChange(next); }} />
                    <ImgField label="After Image" value={p.after}
                      onChange={(v) => { const next = JSON.parse(JSON.stringify(d)); next.pairs[i].after = v; onChange(next); }} />
                  </div>
                </div>
              </div>
            ))}
            <datalist id="before-after-categories">
              {Array.from(new Set((d.pairs || []).map((p: any) => p.category).filter(Boolean))).map((c: any) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <button type="button" onClick={() => addArrItem('pairs', { title: '', description: '', category: '', before: { url: '', publicId: '' }, after: { url: '', publicId: '' } })}
              className="text-xs text-[#0B2560] font-semibold flex items-center gap-1 hover:underline">
              <Plus size={12} /> Add pair
            </button>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1">Stats Row</p>
            <p className="text-[11px] text-gray-400 mb-3">
              Not shown on the homepage itself anymore (it repeated the numbers already in the Stats Bar section above it) —
              still used on the standalone <a href="/results" target="_blank" rel="noopener noreferrer" className="underline">/results</a> page.
            </p>
            <div className="space-y-3">
              {(d.stats || []).map((s: any, i: number) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center">
                  <input type="text" placeholder="Value (e.g. 98%)" value={s.value}
                    onChange={(e) => setArr('stats', i, 'value', e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                  <input type="text" placeholder="Label" value={s.label}
                    onChange={(e) => setArr('stats', i, 'label', e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                  <button type="button" onClick={() => removeArrItem('stats', i)} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                </div>
              ))}
              <button type="button" onClick={() => addArrItem('stats', { value: '', label: '' })}
                className="text-xs text-[#0B2560] font-semibold flex items-center gap-1 hover:underline mt-1">
                <Plus size={12} /> Add stat
              </button>
            </div>
          </div>
        </div>
      );

    case 'founder':
      return (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 flex items-start gap-3">
            <span className="text-lg shrink-0">💡</span>
            <p className="text-xs text-amber-800">
              This section is hidden by default. Fill in the founder's real name, photo, and quote below, then
              switch it to Visible in the section list once it's ready.
            </p>
          </div>
          <TextField label="Eyebrow Label" value={d.eyebrow} onChange={(v) => set('eyebrow', v)} />
          <TextField label="Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <TextField label="Quote / Philosophy" value={d.quote} onChange={(v) => set('quote', v)} multiline />
          <div className="grid sm:grid-cols-2 gap-3">
            <TextField label="Founder Name" value={d.name} onChange={(v) => set('name', v)} />
            <TextField label="Title" value={d.title} onChange={(v) => set('title', v)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <ImgField label="Photo" value={d.photo} onChange={(v) => set('photo', v)} folder="dr-youth-clinic/homepage/founder" />
            <ImgField label="Signature (optional)" value={d.signature} onChange={(v) => set('signature', v)} folder="dr-youth-clinic/homepage/founder" />
          </div>
          <StringListField label="Credential Badges (e.g. MBBS, MD - Dermatology)" value={d.credentials} onChange={(v) => set('credentials', v)} />
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-3">Stats (optional)</p>
            <div className="space-y-3">
              {(d.stats || []).map((s: any, i: number) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center">
                  <input type="text" placeholder="Value (e.g. 15+ Years)" value={s.value}
                    onChange={(e) => setArr('stats', i, 'value', e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                  <input type="text" placeholder="Label" value={s.label}
                    onChange={(e) => setArr('stats', i, 'label', e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                  <button type="button" onClick={() => removeArrItem('stats', i)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              ))}
              <button type="button" onClick={() => addArrItem('stats', { value: '', label: '' })}
                className="text-xs text-[#0B2560] font-semibold flex items-center gap-1 hover:underline mt-1">
                <Plus size={12} /> Add stat
              </button>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <TextField label="CTA Button Text" value={d.ctaText} onChange={(v) => set('ctaText', v)} />
            <TextField label="CTA Link" value={d.ctaHref} onChange={(v) => set('ctaHref', v)} />
          </div>
        </div>
      );

    case 'doctors':
      return (
        <div className="space-y-4">
          <TextField label="Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <TextField label="Sub-headline" value={d.subheadline} onChange={(v) => set('subheadline', v)} multiline />
          <div className="grid sm:grid-cols-2 gap-3">
            <TextField label="View All Text" value={d.viewAllText} onChange={(v) => set('viewAllText', v)} />
            <TextField label="View All Link" value={d.viewAllHref} onChange={(v) => set('viewAllHref', v)} />
          </div>
          <div className="rounded-xl border border-blue-100 bg-[#f6faff] p-4 flex items-start gap-3">
            <span className="text-lg shrink-0">👨‍⚕️</span>
            <div>
              <p className="text-xs font-bold text-[#0B2560] mb-1">Doctor profiles are managed separately</p>
              <p className="text-xs text-gray-500 mb-2">
                Individual doctor records (photo, bio, specializations, location) are now controlled from the
                dedicated Doctors page. They are automatically shown here filtered by the visitor's location.
              </p>
              <a href="/admin/doctors" className="text-xs font-semibold text-[#3B82C4] hover:underline">
                Go to Admin → Doctors →
              </a>
            </div>
          </div>
        </div>
      );

    case 'locations':
      return (
        <div className="space-y-4">
          <TextField label="Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <TextField label="Sub-headline" value={d.subheadline} onChange={(v) => set('subheadline', v)} />
          <StringListField label="Cities List" value={d.cities} onChange={(v) => set('cities', v)} />
          <TextField label="View All Text" value={d.viewAllText} onChange={(v) => set('viewAllText', v)} />
          <div className="border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-bold text-gray-500 mb-3">Featured City</p>
            <div className="space-y-3">
              <TextField label="City Name" value={d.featuredCity?.name} onChange={(v) => set('featuredCity.name', v)} />
              <TextField label="Address" value={d.featuredCity?.address} onChange={(v) => set('featuredCity.address', v)} multiline />
              <TextField label="Hours" value={d.featuredCity?.hours} onChange={(v) => set('featuredCity.hours', v)} />
              <TextField label="Phone" value={d.featuredCity?.phone} onChange={(v) => set('featuredCity.phone', v)} />
              <TextField label="Directions Link" value={d.featuredCity?.directionsHref} onChange={(v) => set('featuredCity.directionsHref', v)} />
            </div>
          </div>
        </div>
      );

    case 'video_academy':
      return (
        <div className="space-y-4">
          <TextField label="Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <TextField label="Subheadline" value={d.subheadline} onChange={(v) => set('subheadline', v)} />
          <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2">
            Videos themselves are managed in Admin → Video Academy — add, categorise, and feature videos there.
          </p>
        </div>
      );

    case 'cta_strip':
      return (
        <div className="space-y-6">
          {/* Rewards */}
          <div className="border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-bold text-gray-500 mb-3">Column 1 — Rewards</p>
            <div className="space-y-3">
              <TextField label="Title" value={d.rewards?.title} onChange={(v) => set('rewards.title', v)} />
              <TextField label="Subtitle" value={d.rewards?.subtitle} onChange={(v) => set('rewards.subtitle', v)} />
              <StringListField label="Features" value={d.rewards?.features}
                onChange={(v) => { const next = JSON.parse(JSON.stringify(d)); next.rewards.features = v; onChange(next); }} />
              <div className="grid sm:grid-cols-2 gap-3">
                <TextField label="CTA Text" value={d.rewards?.ctaText} onChange={(v) => set('rewards.ctaText', v)} />
                <TextField label="CTA Link" value={d.rewards?.ctaHref} onChange={(v) => set('rewards.ctaHref', v)} />
              </div>
            </div>
          </div>
          {/* Booking */}
          <div className="border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-bold text-gray-500 mb-3">Column 2 — Book Consultation</p>
            <div className="space-y-3">
              <TextField label="Title" value={d.booking?.title} onChange={(v) => set('booking.title', v)} />
              <TextField label="Description" value={d.booking?.description} onChange={(v) => set('booking.description', v)} multiline />
              <div className="grid sm:grid-cols-2 gap-3">
                <TextField label="Primary CTA Text" value={d.booking?.ctaPrimary?.text} onChange={(v) => set('booking.ctaPrimary.text', v)} />
                <TextField label="Primary CTA Link" value={d.booking?.ctaPrimary?.href} onChange={(v) => set('booking.ctaPrimary.href', v)} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <TextField label="Secondary CTA Text" value={d.booking?.ctaSecondary?.text} onChange={(v) => set('booking.ctaSecondary.text', v)} />
                <TextField label="Secondary CTA Link" value={d.booking?.ctaSecondary?.href} onChange={(v) => set('booking.ctaSecondary.href', v)} />
              </div>
            </div>
          </div>
          {/* Why Us */}
          <div className="border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-bold text-gray-500 mb-3">Column 3 — Why Choose Us</p>
            <div className="space-y-3">
              <TextField label="Title" value={d.whyUs?.title} onChange={(v) => set('whyUs.title', v)} />
              <StringListField label="Reasons" value={d.whyUs?.reasons}
                onChange={(v) => { const next = JSON.parse(JSON.stringify(d)); next.whyUs.reasons = v; onChange(next); }} />
            </div>
          </div>
        </div>
      );

    case 'testimonials':
      return (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700 font-medium">
            Review content (quotes, authors, ratings) is managed in{' '}
            <a href="/admin/reviews" className="underline font-bold">Admin → Reviews</a>.
            Configure display layout here.
          </div>
          <TextField label="Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <TextField label="Sub-headline" value={d.subheadline} onChange={(v) => set('subheadline', v)} />
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Layout</label>
            <select
              value={d.layout || 'slider'}
              onChange={(e) => set('layout', e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-full"
            >
              <option value="slider">Slider (one at a time with arrows)</option>
              <option value="grid">Grid (3-column card layout)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Number of Reviews to Show</label>
            <input
              type="number"
              min={1}
              max={50}
              value={d.displayCount ?? 6}
              onChange={(e) => set('displayCount', Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Filter by Source (leave blank for all)</label>
            <select
              value={d.filterSource || ''}
              onChange={(e) => set('filterSource', e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-full"
            >
              <option value="">All Sources</option>
              <option value="google">Google Reviews only</option>
              <option value="manual">Manual (Verified Patient) only</option>
              <option value="video">Video Reviews only</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Filter by City (leave blank for all)</label>
            <select
              value={d.filterLocation || ''}
              onChange={(e) => set('filterLocation', e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-full"
            >
              <option value="">All Cities</option>
              <option value="chennai">Chennai</option>
              <option value="bangalore">Bangalore</option>
              <option value="coimbatore">Coimbatore</option>
              <option value="kochi">Kochi</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Filter by Service (leave blank for all)</label>
            <input
              type="text"
              placeholder="e.g. Hair Restoration"
              value={d.filterService || ''}
              onChange={(e) => set('filterService', e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-full"
            />
          </div>
          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={d.showSourceBadges !== false}
                onChange={(e) => set('showSourceBadges', e.target.checked)}
                className="rounded"
              />
              <span className="text-gray-700 font-medium">Show source badges (Google / Manual / Video)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={!!d.showDate}
                onChange={(e) => set('showDate', e.target.checked)}
                className="rounded"
              />
              <span className="text-gray-700 font-medium">Show review date</span>
            </label>
          </div>
        </div>
      );

    case 'faq':
      return (
        <div className="space-y-4">
          <TextField label="Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <div className="grid sm:grid-cols-2 gap-3">
            <TextField label="View All Text" value={d.viewAllText} onChange={(v) => set('viewAllText', v)} />
            <TextField label="View All Link" value={d.viewAllHref} onChange={(v) => set('viewAllHref', v)} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-3">FAQs</p>
            {(d.faqs || []).map((faq: any, i: number) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4 mb-3">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-gray-500">FAQ {i + 1}</span>
                  <button type="button" onClick={() => removeArrItem('faqs', i)} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                </div>
                <div className="space-y-2">
                  <input type="text" placeholder="Question" value={faq.question}
                    onChange={(e) => setArr('faqs', i, 'question', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                  <textarea rows={3} placeholder="Answer" value={faq.answer}
                    onChange={(e) => setArr('faqs', i, 'answer', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                  <select value={faq.category || 'General'}
                    onChange={(e) => setArr('faqs', i, 'category', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white">
                    {FAQ_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400">
                    Category determines which section this FAQ appears under on the /faqs page. &ldquo;General&rdquo; also shows on the homepage FAQ block.
                  </p>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => addArrItem('faqs', { question: '', answer: '', category: 'General' })}
              className="text-xs text-[#0B2560] font-semibold flex items-center gap-1 hover:underline">
              <Plus size={12} /> Add FAQ
            </button>
          </div>

          {/* ── FAQ keyword suggestions (dynamic) ── */}
          <FAQSuggestions
            existing={d.faqs || []}
            onAdd={(q) => addArrItem('faqs', { question: q, answer: '', category: 'General' })}
          />
        </div>
      );

    case 'blog':
      return (
        <div className="space-y-4">
          <TextField label="Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <TextField label="Sub-headline" value={d.subheadline} onChange={(v) => set('subheadline', v)} />
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-3">Blog Posts (max 3 shown)</p>
            {(d.posts || []).map((post: any, i: number) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4 mb-3">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-gray-500">Post {i + 1}</span>
                  <button type="button" onClick={() => removeArrItem('posts', i)} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                </div>
                <div className="space-y-2">
                  <div className="grid sm:grid-cols-2 gap-2">
                    <input type="text" placeholder="Category" value={post.category}
                      onChange={(e) => setArr('posts', i, 'category', e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                    <input type="text" placeholder="Read time (e.g. 5 min read)" value={post.readTime}
                      onChange={(e) => setArr('posts', i, 'readTime', e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                  </div>
                  <input type="text" placeholder="Title" value={post.title}
                    onChange={(e) => setArr('posts', i, 'title', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                  <textarea rows={2} placeholder="Excerpt" value={post.excerpt}
                    onChange={(e) => setArr('posts', i, 'excerpt', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                  <div className="grid sm:grid-cols-2 gap-2">
                    <input type="text" placeholder="Date" value={post.date}
                      onChange={(e) => setArr('posts', i, 'date', e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                    <input type="url" placeholder="Post URL" value={post.href}
                      onChange={(e) => setArr('posts', i, 'href', e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                  </div>
                  <ImgField label="Featured Image" value={post.image}
                    onChange={(v) => { const next = JSON.parse(JSON.stringify(d)); next.posts[i].image = v; onChange(next); }} />
                </div>
              </div>
            ))}
            <button type="button" onClick={() => addArrItem('posts', { category: '', title: '', excerpt: '', date: '', readTime: '', href: '#', image: { url: '', publicId: '' } })}
              className="text-xs text-[#0B2560] font-semibold flex items-center gap-1 hover:underline">
              <Plus size={12} /> Add post
            </button>
          </div>
        </div>
      );

    case 'footer':
      return (
        <div className="space-y-4">
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Footer is managed via the existing Footer component. Data is stored here for reference.
          </p>
          <TextField label="Tagline" value={d.tagline} onChange={(v) => set('tagline', v)} multiline />
          <TextField label="Copyright Text" value={d.copyright} onChange={(v) => set('copyright', v)} />
          <div className="grid sm:grid-cols-2 gap-4">
            <TextField label="Column Heading — Quick Links" value={d.quickLinksHeading} onChange={(v) => set('quickLinksHeading', v)} />
            <TextField label="Column Heading — Procedures" value={d.proceduresHeading} onChange={(v) => set('proceduresHeading', v)} />
            <TextField label="Column Heading — Patient Care" value={d.patientCareHeading} onChange={(v) => set('patientCareHeading', v)} />
            <TextField label="Column Heading — Contact" value={d.contactHeading} onChange={(v) => set('contactHeading', v)} />
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <TextField label="Contact Address" value={d.contact?.address} onChange={(v) => set('contact.address', v)} multiline />
            <TextField label="Contact Phone" value={d.contact?.phone} onChange={(v) => set('contact.phone', v)} />
            <TextField label="Contact Email" value={d.contact?.email} onChange={(v) => set('contact.email', v)} />
          </div>
        </div>
      );

    default:
      return <p className="text-sm text-gray-400">No editor for this section yet.</p>;
  }
}

// ─── Main Admin Builder ───────────────────────────────────
export default function HomepageBuilderPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Section templates ("Save as Template" only — homepage sections are fixed
  // one-per-type slots, so there's no generic "Insert Template" here the way
  // Landing Pages/About have it).
  const [templateModalIdx, setTemplateModalIdx] = useState<number | null>(null);

  // Fetch sections
  useEffect(() => {
    fetch('/api/admin/homepage')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setSections(json.sections.map((s: any) => ({ ...s, id: s.sectionKey, type: s.sectionKey })));
        }
      })
      .catch(() => setError('Failed to load sections'))
      .finally(() => setLoading(false));
  }, []);

  // Toggle visibility
  const toggleVisible = (i: number) => {
    setSections((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], visible: !next[i].visible };
      return next;
    });
  };

  // Update section data
  const updateData = (i: number, data: any) => {
    setSections((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], data };
      return next;
    });
  };

  // Drag-to-reorder
  const handleReorder = (next: Section[]) => {
    setSections(next.map((s, idx) => ({ ...s, order: idx + 1 })));
  };

  const saveSectionAsTemplate = async (name: string) => {
    if (templateModalIdx === null) return;
    const section = sections[templateModalIdx];
    const res = await fetch('/api/admin/section-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        type: section.sectionKey,
        icon: SECTION_ICONS[section.sectionKey] || '📄',
        data: section.data,
        sourceSystem: 'homepage',
      }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Failed to save template');
  };

  // Save & Publish
  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = sections.map((s, idx) => ({ ...s, order: idx + 1 }));
      const res = await fetch('/api/admin/homepage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: payload }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      // Trigger ISR revalidation
      await fetch('/api/admin/homepage/revalidate', { method: 'POST' });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="animate-spin text-[#0B2560]" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-headline font-extrabold text-[#0B2560]">Homepage Builder</h1>
          <p className="text-gray-500 text-sm mt-1">Drag sections to reorder • Toggle visibility • Edit content • Save & Publish</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <div className="flex items-center gap-2 text-green-600 font-semibold text-sm">
              <CheckCircle size={16} /> Published!
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-[#0B2560] text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-[#0d2d73] transition disabled:opacity-60"
          >
            {saving ? <Loader size={16} className="animate-spin" /> : null}
            {saving ? 'Publishing…' : '💾 Save & Publish'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* SECTION CARDS */}
      <SectionList
        sections={sections}
        onReorder={handleReorder}
        renderSection={(section, i, dragControls) => (
          <SectionCard
            section={section}
            label={section.label}
            icon={SECTION_ICONS[section.sectionKey] || '📄'}
            dragControls={dragControls}
            onToggleVisible={() => toggleVisible(i)}
            onSaveAsTemplate={() => setTemplateModalIdx(i)}
          >
            <SectionForm
              section={section}
              onChange={(data) => updateData(i, data)}
            />
          </SectionCard>
        )}
      />

      <SaveTemplateModal
        isOpen={templateModalIdx !== null}
        onClose={() => setTemplateModalIdx(null)}
        onSave={saveSectionAsTemplate}
        defaultName={templateModalIdx !== null ? sections[templateModalIdx].label : ''}
      />

      {/* BOTTOM SAVE */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#0B2560] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#0d2d73] transition disabled:opacity-60"
        >
          {saving ? <Loader size={16} className="animate-spin" /> : null}
          {saving ? 'Publishing…' : '💾 Save & Publish'}
        </button>
      </div>
    </div>
  );
}
