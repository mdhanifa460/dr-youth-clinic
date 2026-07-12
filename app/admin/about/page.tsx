'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Trash2, Loader, CheckCircle, X, ExternalLink, LayoutTemplate,
} from 'lucide-react';
import MediaGalleryModal from '@/app/admin/components/MediaGalleryModal';
import SectionList from '@/app/admin/components/builder/SectionList';
import SectionCard from '@/app/admin/components/builder/SectionCard';
import SaveTemplateModal from '@/app/admin/components/builder/SaveTemplateModal';
import TemplatePicker from '@/app/admin/components/builder/TemplatePicker';
import {
  type AboutSection, SECTION_LABELS, SECTION_DEFAULTS, makeDefaultAboutSections,
} from '@/app/lib/aboutPageDefaults';

// ─── Shared form controls ─────────────────────────────────────────────────────

function FieldInput({
  label, value, onChange, type = 'text', placeholder = '',
}: {
  label: string; value: any; onChange: (v: any) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">{label}</label>
      {type === 'textarea' ? (
        <textarea
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 resize-none"
        />
      ) : (
        <input
          type={type}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20"
        />
      )}
    </div>
  );
}

function StringArrayEditor({
  label, items, onChange,
}: {
  label: string; items: string[]; onChange: (items: string[]) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</label>
        <button type="button" onClick={() => onChange([...items, ''])}
          className="text-[10px] text-[#0B2560] font-bold flex items-center gap-0.5 hover:underline">
          <Plus size={10} /> Add
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              value={item}
              onChange={(e) => { const next = [...items]; next[i] = e.target.value; onChange(next); }}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20"
            />
            <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="text-gray-300 hover:text-red-500 shrink-0">
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Generic editor for arrays of small objects (icon/title/desc/year style rows)
function ObjectArrayEditor({
  label, items, onChange, fields, defaultItem,
}: {
  label: string;
  items: Record<string, any>[];
  onChange: (items: Record<string, any>[]) => void;
  fields: { key: string; placeholder: string; type?: 'text' | 'textarea'; width?: 'full' | 'sm' }[];
  defaultItem: Record<string, any>;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</label>
        <button type="button" onClick={() => onChange([...items, { ...defaultItem }])}
          className="text-[10px] text-[#0B2560] font-bold flex items-center gap-0.5 hover:underline">
          <Plus size={10} /> Add
        </button>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Item {i + 1}</span>
              <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                className="text-gray-300 hover:text-red-500"><X size={13} /></button>
            </div>
            <div className="flex flex-wrap gap-2">
              {fields.map((f) => (
                f.type === 'textarea' ? (
                  <textarea key={f.key} value={item[f.key] || ''} rows={2}
                    onChange={(e) => { const n = [...items]; n[i] = { ...n[i], [f.key]: e.target.value }; onChange(n); }}
                    placeholder={f.placeholder}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none resize-none" />
                ) : (
                  <input key={f.key} value={item[f.key] || ''}
                    onChange={(e) => { const n = [...items]; n[i] = { ...n[i], [f.key]: e.target.value }; onChange(n); }}
                    placeholder={f.placeholder}
                    className={`border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none ${f.width === 'sm' ? 'w-20' : 'flex-1'}`} />
                )
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImagePicker({
  label, value, onChange, openGallery,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  openGallery: (cb: (url: string) => void) => void;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">{label}</label>
      {value && (
        <div className="mb-2 rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
          <img src={value} alt="" className="w-full object-cover" style={{ height: '80px' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
      )}
      <div className="flex gap-2 items-center">
        <span className="flex-1 text-xs text-gray-400 truncate min-w-0">{value || 'No image selected'}</span>
        <button type="button" onClick={() => openGallery(onChange)}
          className="shrink-0 flex items-center gap-1.5 bg-[#0B2560] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#1a3a7a] transition whitespace-nowrap">
          📷 Gallery
        </button>
        {value && (
          <button type="button" onClick={() => onChange('')}
            className="shrink-0 text-gray-400 hover:text-red-500 transition p-0.5"><X size={14} /></button>
        )}
      </div>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Or paste URL directly..."
        className="w-full mt-2 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 text-gray-500 placeholder-gray-300"
      />
    </div>
  );
}

function GalleryImagesEditor({
  items, onChange, openGallery,
}: {
  items: { url: string; caption?: string }[];
  onChange: (items: { url: string; caption?: string }[]) => void;
  openGallery: (cb: (url: string) => void) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Images</label>
        <button type="button" onClick={() => onChange([...items, { url: '', caption: '' }])}
          className="text-[10px] text-[#0B2560] font-bold flex items-center gap-0.5 hover:underline">
          <Plus size={10} /> Add Image
        </button>
      </div>
      <div className="space-y-3">
        {items.map((img, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Image {i + 1}</span>
              <button type="button" onClick={() => onChange(items.filter((_, idx) => idx !== i))}
                className="text-gray-300 hover:text-red-500"><X size={13} /></button>
            </div>
            <ImagePicker
              label=""
              value={img.url || ''}
              onChange={(v) => { const n = [...items]; n[i] = { ...n[i], url: v }; onChange(n); }}
              openGallery={openGallery}
            />
            <input value={img.caption || ''}
              onChange={(e) => { const n = [...items]; n[i] = { ...n[i], caption: e.target.value }; onChange(n); }}
              placeholder="Caption (optional)"
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Per-section-type editor ──────────────────────────────────────────────────

function SectionEditor({
  section, onChange, openGallery,
}: {
  section: AboutSection;
  onChange: (data: Record<string, any>) => void;
  openGallery: (cb: (url: string) => void) => void;
}) {
  const d = section.data;
  const set = (key: string, val: any) => onChange({ ...d, [key]: val });

  switch (section.type) {
    case 'hero':
      return (
        <div className="space-y-4">
          <FieldInput label="Badge text" value={d.badge} onChange={(v) => set('badge', v)} />
          <FieldInput label="Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <FieldInput label="Highlight phrase within headline (shown in gold)" value={d.headlineAccent} onChange={(v) => set('headlineAccent', v)} />
          <FieldInput label="Subheading" value={d.subheading} onChange={(v) => set('subheading', v)} />
          <FieldInput label="Body" value={d.body} onChange={(v) => set('body', v)} type="textarea" />
          <ImagePicker label="Background Image (optional)" value={d.backgroundImage || ''} onChange={(v) => set('backgroundImage', v)} openGallery={openGallery} />
          <ObjectArrayEditor
            label="Stats"
            items={d.stats || []}
            onChange={(v) => set('stats', v)}
            fields={[{ key: 'value', placeholder: 'Value (e.g. 15+)', width: 'sm' }, { key: 'label', placeholder: 'Label (e.g. Years Experience)' }]}
            defaultItem={{ value: '', label: '' }}
          />
        </div>
      );

    case 'story':
      return (
        <div className="space-y-4">
          <FieldInput label="Eyebrow" value={d.eyebrow} onChange={(v) => set('eyebrow', v)} />
          <FieldInput label="Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <FieldInput label="Body" value={d.body} onChange={(v) => set('body', v)} type="textarea" />
          <ImagePicker label="Image" value={d.image || ''} onChange={(v) => set('image', v)} openGallery={openGallery} />
        </div>
      );

    case 'timeline':
      return (
        <div className="space-y-4">
          <FieldInput label="Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <ObjectArrayEditor
            label="Milestones"
            items={d.milestones || []}
            onChange={(v) => set('milestones', v)}
            fields={[{ key: 'year', placeholder: 'Year', width: 'sm' }, { key: 'title', placeholder: 'Title' }, { key: 'desc', placeholder: 'Description', type: 'textarea' }]}
            defaultItem={{ year: '', title: '', desc: '' }}
          />
        </div>
      );

    case 'values':
      return (
        <div className="space-y-4">
          <FieldInput label="Mission Quote" value={d.missionQuote} onChange={(v) => set('missionQuote', v)} type="textarea" />
          <FieldInput label="Mission Body" value={d.missionBody} onChange={(v) => set('missionBody', v)} type="textarea" />
          <ObjectArrayEditor
            label="Values"
            items={d.values || []}
            onChange={(v) => set('values', v)}
            fields={[{ key: 'icon', placeholder: '🔍', width: 'sm' }, { key: 'title', placeholder: 'Title' }, { key: 'desc', placeholder: 'Description', type: 'textarea' }]}
            defaultItem={{ icon: '✓', title: '', desc: '' }}
          />
        </div>
      );

    case 'leadership':
      return (
        <div className="space-y-4">
          <p className="text-xs text-[#3B82C4] bg-[#3B82C4]/10 rounded-xl px-3 py-2 font-semibold">
            Shown as a full-width, premium photo feature — ideal for your CEO or founder.
          </p>
          <FieldInput label="Eyebrow" value={d.eyebrow} onChange={(v) => set('eyebrow', v)} />
          <ImagePicker label="Photo" value={d.photo || ''} onChange={(v) => set('photo', v)} openGallery={openGallery} />
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="Name" value={d.name} onChange={(v) => set('name', v)} placeholder="e.g. Dr. Arjun Rao" />
            <FieldInput label="Title" value={d.title} onChange={(v) => set('title', v)} placeholder="e.g. Founder & CEO" />
          </div>
          <FieldInput label="Quote" value={d.quote} onChange={(v) => set('quote', v)} type="textarea" />
          <FieldInput label="Bio" value={d.bio} onChange={(v) => set('bio', v)} type="textarea" />
        </div>
      );

    case 'experts':
      return (
        <div className="space-y-4">
          <p className="text-xs text-[#3B82C4] bg-[#3B82C4]/10 rounded-xl px-3 py-2 font-semibold">
            Doctor profiles shown here come live from Admin → Doctors — add or edit doctors there.
          </p>
          <FieldInput label="Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <FieldInput label="Subheading" value={d.subheading} onChange={(v) => set('subheading', v)} type="textarea" />
        </div>
      );

    case 'technology':
      return (
        <div className="space-y-4">
          <FieldInput label="Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <FieldInput label="Subheading" value={d.subheading} onChange={(v) => set('subheading', v)} type="textarea" />
          <ObjectArrayEditor
            label="Technology / Treatments"
            items={d.items || []}
            onChange={(v) => set('items', v)}
            fields={[{ key: 'icon', placeholder: '✨', width: 'sm' }, { key: 'title', placeholder: 'Title' }, { key: 'desc', placeholder: 'Description', type: 'textarea' }]}
            defaultItem={{ icon: '✨', title: '', desc: '' }}
          />
        </div>
      );

    case 'journey':
      return (
        <div className="space-y-4">
          <FieldInput label="Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <ObjectArrayEditor
            label="Steps"
            items={d.steps || []}
            onChange={(v) => set('steps', v)}
            fields={[{ key: 'icon', placeholder: '📅', width: 'sm' }, { key: 'title', placeholder: 'Title' }, { key: 'desc', placeholder: 'Description', type: 'textarea' }]}
            defaultItem={{ icon: '•', title: '', desc: '' }}
          />
        </div>
      );

    case 'gallery':
      return (
        <div className="space-y-4">
          <FieldInput label="Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <FieldInput label="Subheading" value={d.subheading} onChange={(v) => set('subheading', v)} type="textarea" />
          <GalleryImagesEditor items={d.images || []} onChange={(v) => set('images', v)} openGallery={openGallery} />
        </div>
      );

    case 'awards':
      return (
        <div className="space-y-4">
          <FieldInput label="Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <ObjectArrayEditor
            label="Awards"
            items={d.awards || []}
            onChange={(v) => set('awards', v)}
            fields={[{ key: 'year', placeholder: 'Year', width: 'sm' }, { key: 'icon', placeholder: '🏅', width: 'sm' }, { key: 'title', placeholder: 'Title' }, { key: 'desc', placeholder: 'Description' }]}
            defaultItem={{ year: '', icon: '🏅', title: '', desc: '' }}
          />
        </div>
      );

    case 'comparison':
      return (
        <div className="space-y-4">
          <FieldInput label="Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <StringArrayEditor label="What sets us apart (shown as a checklist)" items={d.items || []} onChange={(v) => set('items', v)} />
          <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
            Keep these factual and about your own clinic — avoid naming or comparing against specific competitors.
          </p>
        </div>
      );

    case 'community':
      return (
        <div className="space-y-4">
          <FieldInput label="Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <ObjectArrayEditor
            label="Initiatives"
            items={d.items || []}
            onChange={(v) => set('items', v)}
            fields={[{ key: 'icon', placeholder: '🎗️', width: 'sm' }, { key: 'title', placeholder: 'Title' }, { key: 'desc', placeholder: 'Description', type: 'textarea' }]}
            defaultItem={{ icon: '🎗️', title: '', desc: '' }}
          />
        </div>
      );

    case 'reviews':
      return (
        <p className="text-xs text-[#3B82C4] bg-[#3B82C4]/10 rounded-xl px-3 py-2 font-semibold">
          Shows the same patient testimonials configured in Admin → Homepage → Testimonials — nothing to edit here.
        </p>
      );

    case 'faq':
      return (
        <div className="space-y-4">
          <FieldInput label="Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <FieldInput label="Subheading" value={d.subheading} onChange={(v) => set('subheading', v)} type="textarea" />
          <p className="text-xs text-[#3B82C4] bg-[#3B82C4]/10 rounded-xl px-3 py-2 font-semibold">
            Questions themselves come from Admin → Homepage → FAQ (General category) — edit them there.
          </p>
        </div>
      );

    case 'cta':
      return (
        <div className="space-y-4">
          <FieldInput label="Headline (blank = use site-wide consultation CTA)" value={d.headline} onChange={(v) => set('headline', v)} />
          <FieldInput label="Subtext" value={d.subtext} onChange={(v) => set('subtext', v)} type="textarea" />
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="Button Text (blank = use site-wide CTA)" value={d.ctaText} onChange={(v) => set('ctaText', v)} />
            <FieldInput label="Button Link" value={d.ctaHref} onChange={(v) => set('ctaHref', v)} placeholder="/book" />
          </div>
        </div>
      );

    default:
      return <p className="text-xs text-gray-400">No editable fields for this section.</p>;
  }
}

// ─── Section field panel ──────────────────────────────────────────────────────
// The field-level editor shown inside the shared SectionCard's expanded body —
// reorder/visibility/duplicate/delete/save-as-template chrome now lives in the
// shared builder SectionCard used by Landing Pages, Homepage, and About.

function SectionFieldPanel({
  section, onDataChange, openGallery,
}: {
  section: AboutSection;
  onDataChange: (data: Record<string, any>) => void;
  openGallery: (cb: (url: string) => void) => void;
}) {
  return <SectionEditor section={section} onChange={onDataChange} openGallery={openGallery} />;
}

function AddSectionPicker({ existingTypes, onAdd }: { existingTypes: string[]; onAdd: (type: string) => void }) {
  const [open, setOpen] = useState(false);
  const available = Object.keys(SECTION_LABELS);
  return (
    <div>
      <button onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-[#0B2560]/40 text-gray-400 hover:text-[#0B2560] font-semibold text-sm py-3.5 rounded-xl transition">
        <Plus size={16} /> Add Section
      </button>
      {open && (
        <div className="mt-3 bg-white rounded-2xl border border-gray-100 shadow-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {available.map((type) => (
            <button key={type} onClick={() => { onAdd(type); setOpen(false); }}
              className="flex items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-gray-700 hover:bg-[#f6faff] hover:text-[#0B2560] rounded-xl transition">
              <span>{SECTION_LABELS[type].icon}</span>
              <span className="truncate">{SECTION_LABELS[type].label}</span>
              {existingTypes.includes(type) && <span className="ml-auto text-[9px] text-gray-300">added</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AboutPageBuilder() {
  const [sections, setSections] = useState<AboutSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const [galleryOpen, setGalleryOpen] = useState(false);
  const galleryCallbackRef = useRef<((url: string) => void) | null>(null);

  // Section templates
  const [templateModalIdx, setTemplateModalIdx] = useState<number | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const openGallery = useCallback((cb: (url: string) => void) => {
    galleryCallbackRef.current = cb;
    setGalleryOpen(true);
  }, []);
  const handleGallerySelect = useCallback(({ url }: { url: string; publicId: string }) => {
    galleryCallbackRef.current?.(url);
    galleryCallbackRef.current = null;
    setGalleryOpen(false);
  }, []);

  useEffect(() => {
    fetch('/api/admin/about')
      .then((r) => r.json())
      .then((res) => {
        const data = res?.data || {};
        setSections(Array.isArray(data.sections) && data.sections.length ? data.sections : makeDefaultAboutSections());
        setLoading(false);
      })
      .catch(() => { setSections(makeDefaultAboutSections()); setLoading(false); });
  }, []);

  function updateSectionData(idx: number, data: Record<string, any>) {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, data } : s)));
  }
  function toggleVisible(idx: number) {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, visible: !s.visible } : s)));
  }
  function deleteSection(idx: number) {
    setSections((prev) => prev.filter((_, i) => i !== idx));
  }
  function duplicateSection(idx: number) {
    setSections((prev) => {
      const next = [...prev];
      const src = next[idx];
      const copy = { ...src, id: `${src.type}-${Date.now()}`, data: { ...src.data } };
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }
  function addSection(type: string) {
    setSections((prev) => [
      ...prev,
      { id: `${type}-${Date.now()}`, type, visible: true, data: JSON.parse(JSON.stringify(SECTION_DEFAULTS[type] ?? {})) },
    ]);
  }
  function insertTemplate(template: { type: string; icon: string; data: Record<string, any> }) {
    setSections((prev) => [
      ...prev,
      { id: `${template.type}-${Date.now()}`, type: template.type, visible: true, data: { ...template.data } },
    ]);
  }
  async function saveSectionAsTemplate(name: string) {
    if (templateModalIdx === null) return;
    const section = sections[templateModalIdx];
    const meta = SECTION_LABELS[section.type] || { label: section.type, icon: '📄' };
    const res = await fetch('/api/admin/section-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type: section.type, icon: meta.icon, data: section.data, sourceSystem: 'about' }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Failed to save template');
  }

  async function save() {
    setSaving(true);
    setSaveStatus('idle');
    try {
      const res = await fetch('/api/admin/about', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections }),
      });
      const json = await res.json();
      setSaveStatus(json.success ? 'saved' : 'error');
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch {
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f6faff]">
        <Loader size={24} className="animate-spin text-gray-300" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6faff]">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#0B2560] transition mb-6">
          <ArrowLeft size={14} /> Admin
        </Link>

        <div className="flex items-center justify-between mb-2 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-[#0B2560]">About Page Builder</h1>
            <p className="text-gray-400 text-sm mt-0.5">Add, reorder, hide or edit any section — nothing on this page is hardcoded.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a href="/about" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B2560] hover:underline">
              <ExternalLink size={14} /> View Live
            </a>
            <button onClick={save} disabled={saving}
              className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0d2d72] transition disabled:opacity-50 shadow-sm">
              {saving ? <Loader size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              Save
            </button>
          </div>
        </div>

        {saveStatus === 'saved' && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl mb-6">
            <CheckCircle size={14} /> Saved — live in a few minutes
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mb-6">
            Save failed — please try again
          </div>
        )}

        <div className="space-y-3 mt-6">
          <SectionList
            sections={sections}
            onReorder={setSections}
            renderSection={(section, idx, dragControls) => {
              const meta = SECTION_LABELS[section.type] || { label: section.type, icon: '📄' };
              return (
                <SectionCard
                  section={section}
                  label={meta.label}
                  icon={meta.icon}
                  dragControls={dragControls}
                  onToggleVisible={() => toggleVisible(idx)}
                  onDuplicate={() => duplicateSection(idx)}
                  onDelete={() => deleteSection(idx)}
                  onSaveAsTemplate={() => setTemplateModalIdx(idx)}
                >
                  <SectionFieldPanel
                    section={section}
                    onDataChange={(data) => updateSectionData(idx, data)}
                    openGallery={openGallery}
                  />
                </SectionCard>
              );
            }}
          />

          <AddSectionPicker existingTypes={sections.map((s) => s.type)} onAdd={addSection} />

          <div>
            <button
              type="button"
              onClick={() => setShowTemplates((s) => !s)}
              className="w-full flex items-center justify-center gap-2 text-xs font-bold text-gray-400 hover:text-[#0B2560] py-2 transition"
            >
              <LayoutTemplate size={13} /> {showTemplates ? 'Hide' : 'Show'} Saved Templates
            </button>
            {showTemplates && (
              <div className="mt-2 p-4 bg-white rounded-2xl border border-gray-100">
                <TemplatePicker sourceSystem="about" onInsert={insertTemplate} />
              </div>
            )}
          </div>
        </div>
      </div>

      <SaveTemplateModal
        isOpen={templateModalIdx !== null}
        onClose={() => setTemplateModalIdx(null)}
        onSave={saveSectionAsTemplate}
        defaultName={templateModalIdx !== null ? (SECTION_LABELS[sections[templateModalIdx].type]?.label || '') : ''}
      />

      <MediaGalleryModal
        isOpen={galleryOpen}
        onClose={() => { setGalleryOpen(false); galleryCallbackRef.current = null; }}
        onSelect={handleGallerySelect}
      />
    </div>
  );
}
