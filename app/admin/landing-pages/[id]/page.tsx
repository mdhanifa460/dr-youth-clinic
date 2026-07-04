'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Eye, Loader, ChevronUp, ChevronDown, Trash2, Plus,
  Settings, Search, BarChart2, Webhook, Cpu, Globe, ToggleLeft, ToggleRight,
  ExternalLink, Rocket, Save, X, Check,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'tel' | 'email' | 'select' | 'textarea';
  placeholder: string;
  required: boolean;
  options: string[];
}

interface Section {
  id: string;
  type: string;
  visible: boolean;
  data: Record<string, any>;
}

interface LandingPage {
  _id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  template: string;
  seo: { title: string; description: string; keywords: string; ogImage: string };
  sections: Section[];
  form: { fields: FormField[]; submitText: string; successMessage: string; whatsappNotify: boolean };
  tracking: { gtmId: string; metaPixelId: string; googleAdsId: string; googleAdsLabel: string };
  analytics: { visitors: number; leads: number };
}

// ─── Section defaults ─────────────────────────────────────────────────────────

const SECTION_DEFAULTS: Record<string, any> = {
  hero: {
    headline: 'Transform Your Skin with Expert Care',
    subheadline: 'Book a free consultation today — limited slots available',
    badge: '🎯 Special Offer',
    ctaPrimary: { text: 'Book Free Consultation', href: '/book' },
    phone: '1800 890 9669',
    whatsapp: '',
  },
  'trust-bar': { rating: 4.9, patients: '25,000+', years: '20+', googleRating: '4.9' },
  problem: { headline: 'Are You Experiencing...', problems: ['Hair Fall', 'Thinning Hair', 'Receding Hairline'] },
  solution: {
    headline: 'Why Our Treatment Works',
    description: 'Our clinically proven protocols deliver real results.',
    image: '',
    highlights: ['FDA Approved', 'Expert Doctors', 'No Surgery Required'],
  },
  benefits: {
    headline: 'Why Choose DR Youth Clinic',
    items: [
      { icon: '✓', title: 'Natural Results', desc: 'Clinically proven treatments' },
      { icon: '✓', title: 'Expert Doctors', desc: '20+ years experience' },
      { icon: '✓', title: 'Minimal Downtime', desc: 'Back to routine same day' },
    ],
  },
  'before-after': { headline: 'Real Results', pairs: [] },
  process: {
    headline: 'Your Treatment Journey',
    steps: [
      { number: 1, title: 'Consultation', description: 'Free skin analysis' },
      { number: 2, title: 'Treatment Plan', description: 'Customised protocol' },
      { number: 3, title: 'Treatment', description: 'Expert-administered' },
      { number: 4, title: 'Results', description: 'Visible improvement' },
    ],
  },
  doctor: {
    photo: '', name: 'Dr. Name', qualification: 'MBBS, MD Dermatology',
    experience: '15 Years', bio: 'Expert dermatologist.', specialties: ['Skin', 'Hair', 'Laser'],
  },
  reviews: { headline: 'What Our Patients Say', reviews: [] },
  'offer-banner': {
    badge: '🔥 Limited Time', headline: 'Book Your Free Consultation Today',
    subtext: 'Only 10 slots remaining this week', expiry: '', emiAvailable: true, ctaText: 'Claim Your Free Slot',
  },
  faq: {
    headline: 'Frequently Asked Questions',
    items: [{ q: 'Is this treatment safe?', a: 'Yes, all treatments are performed by certified dermatologists.' }],
  },
  cta: { headline: 'Ready to Transform?', subtext: 'Book your free consultation today.', ctaPrimary: 'Book Free Consultation', phone: '1800 890 9669', whatsapp: '' },
  form: { headline: 'Book Your Free Consultation', subtext: "Fill in your details and we'll call you within 2 hours." },
};

const SECTION_LABELS: Record<string, { label: string; icon: string }> = {
  hero: { label: 'Hero Banner', icon: '🖼️' },
  'trust-bar': { label: 'Trust Bar', icon: '⭐' },
  problem: { label: 'Problem Statement', icon: '⚠️' },
  solution: { label: 'Solution', icon: '✅' },
  benefits: { label: 'Benefits Grid', icon: '🏆' },
  'before-after': { label: 'Before & After', icon: '🔄' },
  process: { label: 'Process Timeline', icon: '📋' },
  doctor: { label: 'Doctor Profile', icon: '👨‍⚕️' },
  reviews: { label: 'Patient Reviews', icon: '💬' },
  'offer-banner': { label: 'Offer Banner', icon: '🔥' },
  faq: { label: 'FAQ Accordion', icon: '❓' },
  cta: { label: 'CTA Section', icon: '📣' },
  form: { label: 'Lead Form', icon: '📝' },
};

// ─── Field-level editors ──────────────────────────────────────────────────────

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
        <button
          type="button"
          onClick={() => onChange([...items, ''])}
          className="text-[10px] text-[#0B2560] font-bold flex items-center gap-0.5 hover:underline"
        >
          <Plus size={10} /> Add
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              value={item}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                onChange(next);
              }}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20"
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="text-gray-300 hover:text-red-500 shrink-0"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section inline editor ────────────────────────────────────────────────────

function SectionEditor({ section, onChange }: { section: Section; onChange: (data: Record<string, any>) => void }) {
  const d = section.data;
  const set = (key: string, val: any) => onChange({ ...d, [key]: val });

  switch (section.type) {
    case 'hero':
      return (
        <div className="space-y-4">
          <FieldInput label="Headline" value={d.headline} onChange={(v) => set('headline', v)} placeholder="Main headline" />
          <FieldInput label="Sub-headline" value={d.subheadline} onChange={(v) => set('subheadline', v)} type="textarea" placeholder="Supporting text" />
          <FieldInput label="Badge text" value={d.badge} onChange={(v) => set('badge', v)} placeholder="e.g. 🎯 Special Offer" />
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="CTA Button Text" value={d.ctaPrimary?.text} onChange={(v) => set('ctaPrimary', { ...d.ctaPrimary, text: v })} />
            <FieldInput label="CTA Link" value={d.ctaPrimary?.href} onChange={(v) => set('ctaPrimary', { ...d.ctaPrimary, href: v })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="Phone Number" value={d.phone} onChange={(v) => set('phone', v)} />
            <FieldInput label="WhatsApp Number" value={d.whatsapp} onChange={(v) => set('whatsapp', v)} placeholder="91XXXXXXXXXX" />
          </div>
          <FieldInput label="Background Image URL" value={d.backgroundImage} onChange={(v) => set('backgroundImage', v)} placeholder="https://..." />
        </div>
      );

    case 'trust-bar':
      return (
        <div className="grid grid-cols-2 gap-4">
          <FieldInput label="Rating (e.g. 4.9)" value={d.rating} onChange={(v) => set('rating', v)} type="number" />
          <FieldInput label="Patients (e.g. 25,000+)" value={d.patients} onChange={(v) => set('patients', v)} />
          <FieldInput label="Years (e.g. 20+)" value={d.years} onChange={(v) => set('years', v)} />
          <FieldInput label="Google Rating" value={d.googleRating} onChange={(v) => set('googleRating', v)} />
        </div>
      );

    case 'problem':
      return (
        <div className="space-y-4">
          <FieldInput label="Section Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <StringArrayEditor
            label="Problem Items"
            items={d.problems || []}
            onChange={(v) => set('problems', v)}
          />
        </div>
      );

    case 'solution':
      return (
        <div className="space-y-4">
          <FieldInput label="Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <FieldInput label="Description" value={d.description} onChange={(v) => set('description', v)} type="textarea" />
          <FieldInput label="Image URL" value={d.image} onChange={(v) => set('image', v)} placeholder="https://..." />
          <StringArrayEditor
            label="Highlights"
            items={d.highlights || []}
            onChange={(v) => set('highlights', v)}
          />
        </div>
      );

    case 'benefits': {
      const items = d.items || [];
      return (
        <div className="space-y-4">
          <FieldInput label="Section Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Benefit Items</label>
              <button
                type="button"
                onClick={() => set('items', [...items, { icon: '✓', title: '', desc: '' }])}
                className="text-[10px] text-[#0B2560] font-bold flex items-center gap-0.5 hover:underline"
              >
                <Plus size={10} /> Add
              </button>
            </div>
            <div className="space-y-3">
              {items.map((item: any, i: number) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">Item {i + 1}</span>
                    <button
                      type="button"
                      onClick={() => set('items', items.filter((_: any, idx: number) => idx !== i))}
                      className="text-gray-300 hover:text-red-500"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      value={item.icon || ''}
                      onChange={(e) => {
                        const next = [...items];
                        next[i] = { ...next[i], icon: e.target.value };
                        set('items', next);
                      }}
                      placeholder="Icon/emoji"
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
                    />
                    <input
                      value={item.title || ''}
                      onChange={(e) => {
                        const next = [...items];
                        next[i] = { ...next[i], title: e.target.value };
                        set('items', next);
                      }}
                      placeholder="Title"
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none col-span-2"
                    />
                  </div>
                  <input
                    value={item.desc || ''}
                    onChange={(e) => {
                      const next = [...items];
                      next[i] = { ...next[i], desc: e.target.value };
                      set('items', next);
                    }}
                    placeholder="Short description"
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    case 'process': {
      const steps = d.steps || [];
      return (
        <div className="space-y-4">
          <FieldInput label="Section Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Steps</label>
              <button
                type="button"
                onClick={() => set('steps', [...steps, { number: steps.length + 1, title: '', description: '' }])}
                className="text-[10px] text-[#0B2560] font-bold flex items-center gap-0.5 hover:underline"
              >
                <Plus size={10} /> Add
              </button>
            </div>
            <div className="space-y-3">
              {steps.map((step: any, i: number) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">Step {step.number}</span>
                    <button
                      type="button"
                      onClick={() => set('steps', steps.filter((_: any, idx: number) => idx !== i))}
                      className="text-gray-300 hover:text-red-500"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <input
                    value={step.title || ''}
                    onChange={(e) => {
                      const next = [...steps];
                      next[i] = { ...next[i], title: e.target.value };
                      set('steps', next);
                    }}
                    placeholder="Step title"
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
                  />
                  <input
                    value={step.description || ''}
                    onChange={(e) => {
                      const next = [...steps];
                      next[i] = { ...next[i], description: e.target.value };
                      set('steps', next);
                    }}
                    placeholder="Step description"
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    case 'doctor':
      return (
        <div className="space-y-4">
          <FieldInput label="Doctor Photo URL" value={d.photo} onChange={(v) => set('photo', v)} placeholder="https://..." />
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="Doctor Name" value={d.name} onChange={(v) => set('name', v)} />
            <FieldInput label="Qualification" value={d.qualification} onChange={(v) => set('qualification', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="Experience (e.g. 15 Years)" value={d.experience} onChange={(v) => set('experience', v)} />
          </div>
          <FieldInput label="Bio" value={d.bio} onChange={(v) => set('bio', v)} type="textarea" />
          <StringArrayEditor
            label="Specialties"
            items={d.specialties || []}
            onChange={(v) => set('specialties', v)}
          />
        </div>
      );

    case 'reviews': {
      const reviews = d.reviews || [];
      return (
        <div className="space-y-4">
          <FieldInput label="Section Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Reviews</label>
              <button
                type="button"
                onClick={() => set('reviews', [...reviews, { name: '', rating: 5, text: '', treatment: '' }])}
                className="text-[10px] text-[#0B2560] font-bold flex items-center gap-0.5 hover:underline"
              >
                <Plus size={10} /> Add
              </button>
            </div>
            <div className="space-y-3">
              {reviews.map((rev: any, i: number) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">Review {i + 1}</span>
                    <button
                      type="button"
                      onClick={() => set('reviews', reviews.filter((_: any, idx: number) => idx !== i))}
                      className="text-gray-300 hover:text-red-500"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={rev.name || ''}
                      onChange={(e) => {
                        const next = [...reviews]; next[i] = { ...next[i], name: e.target.value }; set('reviews', next);
                      }}
                      placeholder="Patient name"
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
                    />
                    <input
                      type="number" min={1} max={5}
                      value={rev.rating || 5}
                      onChange={(e) => {
                        const next = [...reviews]; next[i] = { ...next[i], rating: Number(e.target.value) }; set('reviews', next);
                      }}
                      placeholder="Rating (1-5)"
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
                    />
                  </div>
                  <input
                    value={rev.treatment || ''}
                    onChange={(e) => {
                      const next = [...reviews]; next[i] = { ...next[i], treatment: e.target.value }; set('reviews', next);
                    }}
                    placeholder="Treatment name"
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
                  />
                  <textarea
                    value={rev.text || ''}
                    onChange={(e) => {
                      const next = [...reviews]; next[i] = { ...next[i], text: e.target.value }; set('reviews', next);
                    }}
                    placeholder="Review text"
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none resize-none"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    case 'offer-banner':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="Badge" value={d.badge} onChange={(v) => set('badge', v)} placeholder="🔥 Limited Time" />
            <FieldInput label="CTA Text" value={d.ctaText} onChange={(v) => set('ctaText', v)} />
          </div>
          <FieldInput label="Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <FieldInput label="Subtext" value={d.subtext} onChange={(v) => set('subtext', v)} />
          <FieldInput label="Expiry Date" value={d.expiry} onChange={(v) => set('expiry', v)} type="date" />
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => set('emiAvailable', !d.emiAvailable)}
              className={`w-10 rounded-full transition-colors`}
              style={{ height: '22px', background: d.emiAvailable ? '#0B2560' : '#d1d5db' }}
            >
              <div
                className="bg-white rounded-full shadow transition-transform"
                style={{ width: '18px', height: '18px', margin: '2px', transform: d.emiAvailable ? 'translateX(18px)' : 'translateX(0)' }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-600">EMI Available</span>
          </label>
        </div>
      );

    case 'faq': {
      const faqs = d.items || [];
      return (
        <div className="space-y-4">
          <FieldInput label="Section Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">FAQ Items</label>
              <button
                type="button"
                onClick={() => set('items', [...faqs, { q: '', a: '' }])}
                className="text-[10px] text-[#0B2560] font-bold flex items-center gap-0.5 hover:underline"
              >
                <Plus size={10} /> Add
              </button>
            </div>
            <div className="space-y-3">
              {faqs.map((faq: any, i: number) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">Q{i + 1}</span>
                    <button
                      type="button"
                      onClick={() => set('items', faqs.filter((_: any, idx: number) => idx !== i))}
                      className="text-gray-300 hover:text-red-500"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <input
                    value={faq.q || ''}
                    onChange={(e) => {
                      const next = [...faqs]; next[i] = { ...next[i], q: e.target.value }; set('items', next);
                    }}
                    placeholder="Question"
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
                  />
                  <textarea
                    value={faq.a || ''}
                    onChange={(e) => {
                      const next = [...faqs]; next[i] = { ...next[i], a: e.target.value }; set('items', next);
                    }}
                    placeholder="Answer"
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none resize-none"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    case 'cta':
      return (
        <div className="space-y-4">
          <FieldInput label="Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <FieldInput label="Subtext" value={d.subtext} onChange={(v) => set('subtext', v)} />
          <FieldInput label="CTA Button Text" value={d.ctaPrimary} onChange={(v) => set('ctaPrimary', v)} />
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="Phone" value={d.phone} onChange={(v) => set('phone', v)} />
            <FieldInput label="WhatsApp" value={d.whatsapp} onChange={(v) => set('whatsapp', v)} placeholder="91XXXXXXXXXX" />
          </div>
        </div>
      );

    case 'form':
      return (
        <div className="space-y-4">
          <FieldInput label="Form Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <FieldInput label="Form Subtext" value={d.subtext} onChange={(v) => set('subtext', v)} type="textarea" />
          <p className="text-xs text-[#3B82C4] bg-[#3B82C4]/10 rounded-xl px-3 py-2 font-semibold">
            Form fields are configured in the &quot;Form&quot; tab in the sidebar.
          </p>
        </div>
      );

    default:
      return (
        <p className="text-xs text-gray-400 italic">No editor available for section type: {section.type}</p>
      );
  }
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  section, index, total, onToggleVisible, onMoveUp, onMoveDown, onDelete, onDataChange,
}: {
  section: Section;
  index: number;
  total: number;
  onToggleVisible: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onDataChange: (data: Record<string, any>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = SECTION_LABELS[section.type] || { label: section.type, icon: '📄' };

  return (
    <div className={`bg-white rounded-xl border shadow-sm transition-all ${expanded ? 'border-[#3B82C4]/40 shadow-md' : 'border-gray-100'}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-xl shrink-0">{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#0B2560] truncate">{meta.label}</p>
          <p className="text-[10px] text-gray-400">{section.type}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Visible toggle */}
          <button
            onClick={onToggleVisible}
            title={section.visible ? 'Hide section' : 'Show section'}
            className={`p-1.5 rounded-lg transition ${section.visible ? 'text-green-600 hover:bg-green-50' : 'text-gray-300 hover:bg-gray-100'}`}
          >
            {section.visible ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
          </button>

          {/* Move up */}
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-1.5 text-gray-400 hover:text-[#0B2560] hover:bg-gray-100 rounded-lg transition disabled:opacity-30"
          >
            <ChevronUp size={14} />
          </button>

          {/* Move down */}
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="p-1.5 text-gray-400 hover:text-[#0B2560] hover:bg-gray-100 rounded-lg transition disabled:opacity-30"
          >
            <ChevronDown size={14} />
          </button>

          {/* Edit */}
          <button
            onClick={() => setExpanded((e) => !e)}
            className={`p-1.5 rounded-lg transition text-xs font-semibold px-2.5 ${expanded ? 'bg-[#0B2560] text-white' : 'text-[#0B2560] hover:bg-[#0B2560]/10'}`}
          >
            {expanded ? 'Close' : 'Edit'}
          </button>

          {/* Delete */}
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4">
          <SectionEditor section={section} onChange={onDataChange} />
        </div>
      )}
    </div>
  );
}

// ─── Add section picker ───────────────────────────────────────────────────────

function AddSectionPicker({ onAdd }: { onAdd: (type: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-[#0B2560]/40 text-gray-400 hover:text-[#0B2560] font-semibold text-sm py-3.5 rounded-xl transition"
      >
        <Plus size={16} />
        Add Section
      </button>

      {open && (
        <div className="mt-3 bg-white rounded-2xl border border-gray-100 shadow-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(SECTION_LABELS).map(([type, meta]) => (
            <button
              key={type}
              onClick={() => { onAdd(type); setOpen(false); }}
              className="flex items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-gray-700 hover:bg-[#f6faff] hover:text-[#0B2560] rounded-xl transition"
            >
              <span>{meta.icon}</span>
              <span className="truncate">{meta.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Form fields tab ──────────────────────────────────────────────────────────

function FormFieldsEditor({ fields, onChange }: { fields: FormField[]; onChange: (fields: FormField[]) => void }) {
  const FIELD_TYPES = ['text', 'tel', 'email', 'select', 'textarea'] as const;

  const addField = () => {
    onChange([
      ...fields,
      {
        id: `field-${Date.now()}`,
        label: '',
        type: 'text',
        placeholder: '',
        required: false,
        options: [],
      },
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Form Fields</p>
        <button
          onClick={addField}
          className="text-[10px] text-[#0B2560] font-bold flex items-center gap-0.5 hover:underline"
        >
          <Plus size={10} /> Add Field
        </button>
      </div>

      {fields.length === 0 && (
        <p className="text-xs text-gray-400 italic">
          No fields yet. Default fields (name, phone, email) will be used.
        </p>
      )}

      <div className="space-y-3">
        {fields.map((field, i) => (
          <div key={field.id} className="bg-gray-50 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Field {i + 1}</span>
              <button
                onClick={() => onChange(fields.filter((_, idx) => idx !== i))}
                className="text-gray-300 hover:text-red-500"
              >
                <X size={13} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={field.label}
                onChange={(e) => {
                  const next = [...fields];
                  next[i] = { ...next[i], label: e.target.value };
                  onChange(next);
                }}
                placeholder="Label"
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none col-span-2"
              />
              <select
                value={field.type}
                onChange={(e) => {
                  const next = [...fields];
                  next[i] = { ...next[i], type: e.target.value as FormField['type'] };
                  onChange(next);
                }}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
              >
                {FIELD_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
              <input
                value={field.placeholder}
                onChange={(e) => {
                  const next = [...fields];
                  next[i] = { ...next[i], placeholder: e.target.value };
                  onChange(next);
                }}
                placeholder="Placeholder"
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
              />
            </div>
            {field.type === 'select' && (
              <StringArrayEditor
                label="Options"
                items={field.options || []}
                onChange={(opts) => {
                  const next = [...fields];
                  next[i] = { ...next[i], options: opts };
                  onChange(next);
                }}
              />
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => {
                  const next = [...fields];
                  next[i] = { ...next[i], required: e.target.checked };
                  onChange(next);
                }}
                className="rounded"
              />
              <span className="text-xs font-semibold text-gray-500">Required</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AI tab ───────────────────────────────────────────────────────────────────

function AiTab({ lpId }: { lpId: string }) {
  const [context, setContext] = useState('Hair PRP Treatment');
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const AI_ACTIONS: { type: string; label: string; icon: string }[] = [
    { type: 'headline', label: 'Generate Headlines', icon: '✍️' },
    { type: 'cta', label: 'Generate CTAs', icon: '📣' },
    { type: 'benefits', label: 'Generate Benefits', icon: '🏆' },
    { type: 'problem', label: 'Generate Problems', icon: '⚠️' },
    { type: 'faq', label: 'Generate FAQs', icon: '❓' },
    { type: 'seo', label: 'Generate SEO Meta', icon: '🔍' },
  ];

  const generate = async (type: string) => {
    setLoading(type);
    try {
      const res = await fetch(`/api/admin/landing-pages/${lpId}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, context }),
      });
      const data = await res.json();
      if (data.success) {
        setResults((r) => ({ ...r, [type]: data.result }));
      } else {
        setResults((r) => ({ ...r, [type]: `Error: ${data.message}` }));
      }
    } catch {
      setResults((r) => ({ ...r, [type]: 'Generation failed. Check API key.' }));
    } finally {
      setLoading(null);
    }
  };

  const copy = (type: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
          Context / Treatment
        </label>
        <input
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="e.g. Hair PRP Treatment for hair loss"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20"
        />
      </div>

      <div className="space-y-3">
        {AI_ACTIONS.map((action) => (
          <div key={action.type} className="bg-gray-50 rounded-xl overflow-hidden">
            <button
              onClick={() => generate(action.type)}
              disabled={!!loading}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-[#0B2560] hover:bg-[#f6faff] transition disabled:opacity-60"
            >
              <span>{action.icon}</span>
              {action.label}
              {loading === action.type && (
                <Loader size={13} className="animate-spin ml-auto text-[#3B82C4]" />
              )}
            </button>
            {results[action.type] && (
              <div className="border-t border-gray-100 px-3 py-2">
                <div className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                  {results[action.type]}
                </div>
                <button
                  onClick={() => copy(action.type, results[action.type])}
                  className="flex items-center gap-1 text-[10px] font-bold text-[#3B82C4] mt-2 hover:underline"
                >
                  {copied === action.type ? <><Check size={10} /> Copied!</> : 'Copy result'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main builder ─────────────────────────────────────────────────────────────

type SideTab = 'details' | 'seo' | 'form' | 'tracking' | 'ai';

export default function LandingPageBuilder() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [lp, setLp] = useState<LandingPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<SideTab>('details');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`/api/admin/landing-pages/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setLp(data.data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const scheduleSave = useCallback((updated: LandingPage) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus('saving');
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/landing-pages/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        });
        const data = await res.json();
        if (data.success) {
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        } else {
          setSaveStatus('error');
        }
      } catch {
        setSaveStatus('error');
      }
    }, 800);
  }, [id]);

  const updateLp = useCallback((updater: (prev: LandingPage) => LandingPage) => {
    setLp((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      scheduleSave(next);
      return next;
    });
  }, [scheduleSave]);

  const togglePublish = async () => {
    if (!lp) return;
    const newStatus = lp.status === 'published' ? 'draft' : 'published';
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/landing-pages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...lp, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) setLp(data.data);
    } finally {
      setSaving(false);
    }
  };

  const addSection = (type: string) => {
    updateLp((prev) => ({
      ...prev,
      sections: [
        ...prev.sections,
        { id: `${type}-${Date.now()}`, type, visible: true, data: SECTION_DEFAULTS[type] || {} },
      ],
    }));
  };

  const deleteSection = (idx: number) => {
    if (!confirm('Remove this section?')) return;
    updateLp((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== idx),
    }));
  };

  const moveSection = (idx: number, dir: -1 | 1) => {
    updateLp((prev) => {
      const sections = [...prev.sections];
      const target = idx + dir;
      if (target < 0 || target >= sections.length) return prev;
      [sections[idx], sections[target]] = [sections[target], sections[idx]];
      return { ...prev, sections };
    });
  };

  const toggleVisible = (idx: number) => {
    updateLp((prev) => {
      const sections = [...prev.sections];
      sections[idx] = { ...sections[idx], visible: !sections[idx].visible };
      return { ...prev, sections };
    });
  };

  const updateSectionData = (idx: number, data: Record<string, any>) => {
    updateLp((prev) => {
      const sections = [...prev.sections];
      sections[idx] = { ...sections[idx], data };
      return { ...prev, sections };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 text-[#3B82C4] animate-spin" />
      </div>
    );
  }

  if (!lp) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 text-lg font-semibold">Landing page not found</p>
        <Link href="/admin/landing-pages">
          <button className="mt-4 text-[#0B2560] font-semibold underline text-sm">Back to list</button>
        </Link>
      </div>
    );
  }

  const TABS: { key: SideTab; label: string; icon: React.ReactNode }[] = [
    { key: 'details', label: 'Details', icon: <Settings size={14} /> },
    { key: 'seo', label: 'SEO', icon: <Search size={14} /> },
    { key: 'form', label: 'Form', icon: <Webhook size={14} /> },
    { key: 'tracking', label: 'Tracking', icon: <BarChart2 size={14} /> },
    { key: 'ai', label: 'AI', icon: <Cpu size={14} /> },
  ];

  return (
    <div className="-m-6 flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/admin/landing-pages">
            <button className="p-1.5 text-gray-400 hover:text-[#0B2560] hover:bg-gray-100 rounded-lg transition">
              <ArrowLeft size={18} />
            </button>
          </Link>
          <div>
            <h1 className="text-sm font-bold text-[#0B2560] leading-none">{lp.title}</h1>
            <p className="text-[10px] text-gray-400 mt-0.5">/lp/{lp.slug}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Save status */}
          <span className={`text-[10px] font-semibold ${saveStatus === 'saving' ? 'text-[#3B82C4]' : saveStatus === 'saved' ? 'text-green-600' : saveStatus === 'error' ? 'text-red-500' : 'text-transparent'}`}>
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'error' ? 'Save failed' : '.'}
          </span>

          {lp.status === 'published' && (
            <a href={`/lp/${lp.slug}`} target="_blank" rel="noopener noreferrer">
              <button className="flex items-center gap-1.5 text-xs font-semibold text-[#3B82C4] hover:underline">
                <ExternalLink size={13} />
                Preview
              </button>
            </a>
          )}

          <button
            onClick={togglePublish}
            disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition shadow-sm disabled:opacity-60 ${
              lp.status === 'published'
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-[#0B2560] text-white hover:bg-[#1a3a7a] shadow-[#0B2560]/20'
            }`}
          >
            <Rocket size={14} />
            {saving ? '...' : lp.status === 'published' ? 'Published' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-gray-100 shrink-0">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold transition ${
                  activeTab === tab.key
                    ? 'text-[#0B2560] border-b-2 border-[#0B2560]'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {activeTab === 'details' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Title</label>
                  <input
                    value={lp.title}
                    onChange={(e) => updateLp((p) => ({ ...p, title: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Slug</label>
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#0B2560]/20 text-sm">
                    <span className="px-2 py-2.5 text-gray-400 bg-gray-50 border-r border-gray-200 font-mono text-[10px]">/lp/</span>
                    <input
                      value={lp.slug}
                      onChange={(e) => updateLp((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                      className="flex-1 px-3 py-2.5 focus:outline-none font-mono text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Status</label>
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold ${lp.status === 'published' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                    <div className={`w-2 h-2 rounded-full ${lp.status === 'published' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    {lp.status === 'published' ? 'Published' : 'Draft'}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Analytics</label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-gray-50 rounded-xl p-2 text-center">
                      <p className="text-base font-extrabold text-[#0B2560]">{lp.analytics?.visitors ?? 0}</p>
                      <p className="text-[9px] text-gray-400 uppercase tracking-wider">Visitors</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2 text-center">
                      <p className="text-base font-extrabold text-[#0B2560]">{lp.analytics?.leads ?? 0}</p>
                      <p className="text-[9px] text-gray-400 uppercase tracking-wider">Leads</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2 text-center">
                      <p className="text-base font-extrabold text-[#3B82C4]">
                        {lp.analytics?.visitors
                          ? `${((lp.analytics.leads / lp.analytics.visitors) * 100).toFixed(1)}%`
                          : '—'}
                      </p>
                      <p className="text-[9px] text-gray-400 uppercase tracking-wider">Conv.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'seo' && (
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">SEO Settings</p>
                {(['title', 'description', 'keywords', 'ogImage'] as const).map((key) => (
                  <div key={key}>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block capitalize">
                      {key === 'ogImage' ? 'OG Image URL' : key}
                    </label>
                    {key === 'description' ? (
                      <textarea
                        value={lp.seo?.[key] ?? ''}
                        onChange={(e) => updateLp((p) => ({ ...p, seo: { ...p.seo, [key]: e.target.value } }))}
                        rows={3}
                        placeholder={key === 'description' ? 'Meta description (max 155 chars)' : ''}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 resize-none"
                      />
                    ) : (
                      <input
                        value={lp.seo?.[key] ?? ''}
                        onChange={(e) => updateLp((p) => ({ ...p, seo: { ...p.seo, [key]: e.target.value } }))}
                        placeholder={key === 'title' ? 'SEO title (max 60 chars)' : key === 'keywords' ? 'keyword1, keyword2' : 'https://...'}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'form' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Submit Button Text</label>
                  <input
                    value={lp.form?.submitText ?? ''}
                    onChange={(e) => updateLp((p) => ({ ...p, form: { ...p.form, submitText: e.target.value } }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Success Message</label>
                  <textarea
                    value={lp.form?.successMessage ?? ''}
                    onChange={(e) => updateLp((p) => ({ ...p, form: { ...p.form, successMessage: e.target.value } }))}
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 resize-none"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => updateLp((p) => ({ ...p, form: { ...p.form, whatsappNotify: !p.form.whatsappNotify } }))}
                    className="rounded-full transition-colors"
                    style={{ width: '40px', height: '22px', background: lp.form?.whatsappNotify ? '#25D366' : '#d1d5db' }}
                  >
                    <div
                      className="bg-white rounded-full shadow transition-transform"
                      style={{ width: '18px', height: '18px', margin: '2px', transform: lp.form?.whatsappNotify ? 'translateX(18px)' : 'translateX(0)' }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-600">WhatsApp Notification</span>
                </label>

                <div className="border-t border-gray-100 pt-3">
                  <FormFieldsEditor
                    fields={lp.form?.fields ?? []}
                    onChange={(fields) => updateLp((p) => ({ ...p, form: { ...p.form, fields } }))}
                  />
                </div>
              </div>
            )}

            {activeTab === 'tracking' && (
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tracking Pixels</p>
                {[
                  { key: 'gtmId', label: 'Google Tag Manager ID', placeholder: 'GTM-XXXXXXX' },
                  { key: 'metaPixelId', label: 'Meta Pixel ID', placeholder: '123456789012345' },
                  { key: 'googleAdsId', label: 'Google Ads ID', placeholder: 'AW-XXXXXXXXXX' },
                  { key: 'googleAdsLabel', label: 'Google Ads Conversion Label', placeholder: 'xxxx' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">{label}</label>
                    <input
                      value={(lp.tracking as any)?.[key] ?? ''}
                      onChange={(e) => updateLp((p) => ({ ...p, tracking: { ...p.tracking, [key]: e.target.value } }))}
                      placeholder={placeholder}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 font-mono"
                    />
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'ai' && <AiTab lpId={id} />}
          </div>
        </div>

        {/* Main — sections list */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="max-w-2xl mx-auto space-y-3">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                Sections ({lp.sections.length})
              </p>
              <p className="text-xs text-gray-400">
                {lp.sections.filter((s) => s.visible).length} visible
              </p>
            </div>

            {lp.sections.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-3">📄</p>
                <p className="font-semibold text-sm">No sections yet</p>
                <p className="text-xs mt-1">Add sections below to build your landing page</p>
              </div>
            )}

            {lp.sections.map((section, idx) => (
              <SectionCard
                key={section.id}
                section={section}
                index={idx}
                total={lp.sections.length}
                onToggleVisible={() => toggleVisible(idx)}
                onMoveUp={() => moveSection(idx, -1)}
                onMoveDown={() => moveSection(idx, 1)}
                onDelete={() => deleteSection(idx)}
                onDataChange={(data) => updateSectionData(idx, data)}
              />
            ))}

            <AddSectionPicker onAdd={addSection} />
          </div>
        </div>
      </div>
    </div>
  );
}
