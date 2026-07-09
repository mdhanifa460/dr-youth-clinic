'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Eye, Loader, ChevronUp, ChevronDown, Trash2, Plus,
  Settings, Search, BarChart2, Webhook, Cpu, Globe, ToggleLeft, ToggleRight,
  ExternalLink, Rocket, Save, X, Check,
} from 'lucide-react';
import MediaGalleryModal from '@/app/admin/components/MediaGalleryModal';
import SeoAiAssistant from '@/app/admin/components/SeoAiAssistant';
import OfferBannerSection from '@/app/components/lp/sections/OfferBannerSection';

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
    backgroundImage: '',
    formHeadline: 'Book Your Free Consultation',
    formUrgencyText: 'Limited slots this week!',
    successMessage: "✓ We'll call you within 2 hours!",
    showTeamAvatars: false,
  },
  'trust-bar': { rating: 4.9, patients: '25,000+', years: '20+', googleRating: '4.9' },
  problem: { headline: 'Are You Experiencing...', problems: ['Hair Fall', 'Thinning Hair', 'Receding Hairline'] },
  solution: {
    headline: 'Why Our Treatment Works',
    description: 'Our clinically proven protocols deliver real results.',
    image: '',
    imageBadge: 'Clinically Proven',
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
  'before-after': { headline: 'Real Results', disclaimer: 'Individual results may vary. Photos are from actual DR Youth Clinic patients.', pairs: [] },
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
  'hair-timeline': {
    headline: 'What to Expect After PRP Treatment',
    milestones: [
      { period: 'Week 1', title: 'Shedding Slows', desc: 'Hair fall reduces significantly after first session' },
      { period: 'Month 1', title: 'New Growth Begins', desc: 'Fine new hair strands start appearing' },
      { period: 'Month 3', title: 'Visible Improvement', desc: 'Noticeable density and thickness increase' },
      { period: 'Month 6', title: 'Full Results', desc: 'Complete hair restoration with natural appearance' },
    ],
  },
  location: {
    headline: 'Trusted by Patients Across Chennai',
    city: 'Chennai',
    branches: ['Anna Nagar', 'T. Nagar', 'OMR', 'Velachery'],
    image: '',
  },
  'offer-banner': {
    badge: '🔥 Limited Time', headline: 'Book Your Free Consultation Today',
    subtext: 'Only 10 slots remaining this week', expiry: '', emiAvailable: true,
    emiText: 'EMI options available · Zero-cost EMI on 3 / 6 months',
    ctaText: 'Claim Your Free Slot', animationStyle: 'glow', slotsLeft: 0, totalSlots: 20,
  },
  faq: {
    headline: 'Frequently Asked Questions',
    items: [{ q: 'Is this treatment safe?', a: 'Yes, all treatments are performed by certified dermatologists.' }],
  },
  comparison: {
    headline: 'Why DR Youth Clinic?', badge: 'The Smart Choice',
    usLabel: 'DR Youth Clinic', othersLabel: 'Other Clinics',
    rows: [
      { label: 'Certified Dermatologist', us: true, others: false },
      { label: 'FDA-Approved Equipment', us: true, others: false },
      { label: 'Personalised Protocol', us: true, others: false },
      { label: 'Free Consultation', us: true, others: false },
      { label: 'Post-Treatment Support', us: true, others: false },
    ],
    ctaText: 'Book Free Consultation',
  },
  guarantee: {
    headline: 'Our Promise to You',
    subtext: 'We stand behind every treatment. Your satisfaction and safety are non-negotiable.',
    cards: [
      { icon: '🏆', title: 'Results Guarantee', desc: 'Visible improvement in your first 3 sessions or we re-treat at no cost.' },
      { icon: '🔬', title: '100% Safe & Sterile', desc: 'FDA-cleared equipment, sterile protocols, internationally trained doctors.' },
      { icon: '⭐', title: 'Expert Care Only', desc: 'Treated only by certified MD Dermatologists — never trainees.' },
    ],
    seals: ['NABH Certified', 'ISO 9001:2015', 'FDA Cleared', 'IADVL Member'],
  },
  'video-explainer': {
    headline: 'See How GFC PRP Works',
    subtitle: 'Watch our 10-second treatment overview — the process is simpler than you think.',
    badge: 'Treatment Overview',
    videoUrl: '',
    thumbnailUrl: '',
    autoplayMuted: false,
    caption: 'Actual in-clinic treatment footage',
  },
  cta: { headline: 'Ready to Transform?', subtext: 'Book your free consultation today.', ctaPrimary: 'Book Free Consultation', phone: '1800 890 9669', whatsapp: '' },
  form: {
    headline: 'Book Your Free Consultation',
    subtext: "Fill in your details and we'll call you within 2 hours.",
    urgencyPoints: ['Expert certified dermatologists only', 'Results visible from first session', 'Zero-cost EMI · flexible payment plans'],
    slotsLeft: 5,
    phone: '1800 890 9669',
  },
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
  'hair-timeline': { label: 'Hair Growth Timeline', icon: '📈' },
  location: { label: 'Branch Locations', icon: '📍' },
  'video-explainer': { label: 'Video Explainer', icon: '🎬' },
  'offer-banner': { label: 'Offer Banner', icon: '🔥' },
  faq: { label: 'FAQ Accordion', icon: '❓' },
  comparison: { label: 'Comparison Table', icon: '⚖️' },
  guarantee: { label: 'Our Guarantee', icon: '🏆' },
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
                const next = [...items]; next[i] = e.target.value; onChange(next);
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

// ─── Image Picker ─────────────────────────────────────────────────────────────

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
          <img
            src={value}
            alt=""
            className="w-full object-cover"
            style={{ height: '80px' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}
      <div className="flex gap-2 items-center">
        <span className="flex-1 text-xs text-gray-400 truncate min-w-0">
          {value || 'No image selected'}
        </span>
        <button
          type="button"
          onClick={() => openGallery(onChange)}
          className="shrink-0 flex items-center gap-1.5 bg-[#0B2560] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#1a3a7a] transition whitespace-nowrap"
        >
          📷 Gallery
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="shrink-0 text-gray-400 hover:text-red-500 transition p-0.5"
          >
            <X size={14} />
          </button>
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

// ─── Video uploader ───────────────────────────────────────────────────────────

function VideoUploader({
  label, value, onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setProgress('Uploading…');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/admin/services/upload-video', { method: 'POST', body: form });
      const json = await res.json();
      if (json.success) {
        onChange(json.data.secure_url);
        setProgress('');
      } else {
        setProgress(json.message || 'Upload failed');
      }
    } catch {
      setProgress('Network error — try again');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">{label}</label>
      {value && (
        <div className="mb-2 rounded-xl overflow-hidden border border-gray-100 bg-gray-900">
          <video src={value} className="w-full" style={{ height: '80px', objectFit: 'cover' }} muted />
        </div>
      )}
      <div className="flex gap-2 items-center">
        <span className="flex-1 text-xs text-gray-400 truncate min-w-0">
          {value || 'No video uploaded'}
        </span>
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="shrink-0 flex items-center gap-1.5 bg-[#0B2560] text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#1a3a7a] transition whitespace-nowrap disabled:opacity-50"
        >
          🎬 Upload
        </button>
        {value && (
          <button type="button" onClick={() => onChange('')} className="shrink-0 text-gray-400 hover:text-red-500 transition p-0.5">
            <X size={14} />
          </button>
        )}
      </div>
      {progress && (
        <p className={`text-xs mt-1.5 ${progress.includes('failed') || progress.includes('error') ? 'text-red-500' : 'text-[#3B82C4]'}`}>
          {progress}
        </p>
      )}
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Or paste Cloudinary/direct video URL…"
        className="w-full mt-2 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 text-gray-500 placeholder-gray-300"
      />
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}

// ─── Section inline editor ────────────────────────────────────────────────────

function SectionEditor({
  section, onChange, openGallery,
}: {
  section: Section;
  onChange: (data: Record<string, any>) => void;
  openGallery: (cb: (url: string) => void) => void;
}) {
  const d = section.data;
  const set = (key: string, val: any) => onChange({ ...d, [key]: val });

  switch (section.type) {
    case 'hero':
      return (
        <div className="space-y-4">
          <FieldInput label="Badge text" value={d.badge} onChange={(v) => set('badge', v)} placeholder="e.g. Advanced Hair Restoration" />
          <FieldInput label="Headline (plain part)" value={d.headline} onChange={(v) => set('headline', v)} placeholder="Main headline text" />
          <FieldInput label="Headline Accent (gold)" value={d.headlineAccent} onChange={(v) => set('headlineAccent', v)} placeholder="e.g. PRP Treatment" />
          <FieldInput label="Description" value={d.description || d.subheadline} onChange={(v) => set('description', v)} type="textarea" placeholder="Supporting paragraph" />
          <StringArrayEditor label="Feature Checkmarks" items={d.features || []} onChange={(v) => set('features', v)} />
          <div className="grid grid-cols-3 gap-3">
            <FieldInput label="Patient Count" value={d.patientCount} onChange={(v) => set('patientCount', v)} placeholder="25,000+" />
            <FieldInput label="Rating" value={d.rating} onChange={(v) => set('rating', v)} placeholder="4.9" />
            <FieldInput label="Years Experience" value={d.yearsExperience} onChange={(v) => set('yearsExperience', v)} placeholder="20+" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => set('showInlineForm', !d.showInlineForm)}
              className="rounded-full transition-colors shrink-0"
              style={{ width: '40px', height: '22px', background: d.showInlineForm !== false ? '#0B2560' : '#d1d5db' }}
            >
              <div
                className="bg-white rounded-full shadow transition-transform"
                style={{ width: '18px', height: '18px', margin: '2px', transform: d.showInlineForm !== false ? 'translateX(18px)' : 'translateX(0)' }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-600">Show inline booking form</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => set('showTeamAvatars', !d.showTeamAvatars)}
              className="rounded-full transition-colors shrink-0"
              style={{ width: '40px', height: '22px', background: d.showTeamAvatars ? '#0B2560' : '#d1d5db' }}
            >
              <div
                className="bg-white rounded-full shadow transition-transform"
                style={{ width: '18px', height: '18px', margin: '2px', transform: d.showTeamAvatars ? 'translateX(18px)' : 'translateX(0)' }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-600">Show decorative team avatar row</span>
          </label>
          <StringArrayEditor label="Concern Dropdown Options" items={d.concern_options || []} onChange={(v) => set('concern_options', v)} />
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="Form Headline" value={d.formHeadline} onChange={(v) => set('formHeadline', v)} placeholder="Book Your Free Consultation" />
            <FieldInput label="Form Urgency Text" value={d.formUrgencyText} onChange={(v) => set('formUrgencyText', v)} placeholder="Limited slots this week!" />
          </div>
          <FieldInput label="Form Success Message" value={d.successMessage} onChange={(v) => set('successMessage', v)} placeholder="We'll call you within 2 hours!" />
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="CTA Button Text" value={d.ctaPrimary?.text} onChange={(v) => set('ctaPrimary', { ...d.ctaPrimary, text: v })} />
            <FieldInput label="CTA Link" value={d.ctaPrimary?.href} onChange={(v) => set('ctaPrimary', { ...d.ctaPrimary, href: v })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="Phone Number" value={d.phone} onChange={(v) => set('phone', v)} />
            <FieldInput label="WhatsApp Number" value={d.whatsapp} onChange={(v) => set('whatsapp', v)} placeholder="91XXXXXXXXXX" />
          </div>
          <ImagePicker
            label="Background Image"
            value={d.backgroundImage || ''}
            onChange={(v) => set('backgroundImage', v)}
            openGallery={openGallery}
          />
        </div>
      );

    case 'trust-bar': {
      const stats = d.stats || [];
      const ICON_OPTIONS = ['users', 'clock', 'activity', 'star', 'stethoscope'];
      return (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Stats</label>
              <button type="button" onClick={() => set('stats', [...stats, { icon: 'star', value: '', label: '' }])}
                className="text-[10px] text-[#0B2560] font-bold flex items-center gap-0.5 hover:underline">
                <Plus size={10} /> Add
              </button>
            </div>
            <div className="space-y-3">
              {stats.map((stat: any, i: number) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">Stat {i + 1}</span>
                    <button type="button" onClick={() => set('stats', stats.filter((_: any, idx: number) => idx !== i))}
                      className="text-gray-300 hover:text-red-500"><X size={13} /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <select value={stat.icon || 'star'}
                      onChange={(e) => { const n=[...stats]; n[i]={...n[i],icon:e.target.value}; set('stats',n); }}
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none">
                      {ICON_OPTIONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                    </select>
                    <input value={stat.value || ''} onChange={(e) => { const n=[...stats]; n[i]={...n[i],value:e.target.value}; set('stats',n); }}
                      placeholder="Value" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none" />
                    <input value={stat.label || ''} onChange={(e) => { const n=[...stats]; n[i]={...n[i],label:e.target.value}; set('stats',n); }}
                      placeholder="Label" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-[#3B82C4] bg-[#3B82C4]/10 rounded-xl px-3 py-2 font-semibold">
            Icons: users, clock, activity, star, stethoscope
          </p>
        </div>
      );
    }

    case 'problem':
      return (
        <div className="space-y-4">
          <FieldInput label="Section Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <FieldInput label="Subtitle" value={d.subtitle} onChange={(v) => set('subtitle', v)} />
          <StringArrayEditor label="Problem Items" items={d.problems || []} onChange={(v) => set('problems', v)} />
        </div>
      );

    case 'solution':
      return (
        <div className="space-y-4">
          <FieldInput label="Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <FieldInput label="Description" value={d.description} onChange={(v) => set('description', v)} type="textarea" />
          <ImagePicker
            label="Treatment Image"
            value={d.image || ''}
            onChange={(v) => set('image', v)}
            openGallery={openGallery}
          />
          <FieldInput label="Image Badge Overlay" value={d.imageBadge} onChange={(v) => set('imageBadge', v)} placeholder="Clinically Proven" />
          <StringArrayEditor label="Highlights" items={d.highlights || []} onChange={(v) => set('highlights', v)} />
        </div>
      );

    case 'benefits': {
      const items = d.items || [];
      return (
        <div className="space-y-4">
          <FieldInput label="Section Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <FieldInput label="Subtitle" value={d.subtitle} onChange={(v) => set('subtitle', v)} />
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Benefit Items</label>
              <button type="button" onClick={() => set('items', [...items, { icon: '✓', title: '', desc: '' }])}
                className="text-[10px] text-[#0B2560] font-bold flex items-center gap-0.5 hover:underline">
                <Plus size={10} /> Add
              </button>
            </div>
            <div className="space-y-3">
              {items.map((item: any, i: number) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">Item {i + 1}</span>
                    <button type="button" onClick={() => set('items', items.filter((_: any, idx: number) => idx !== i))}
                      className="text-gray-300 hover:text-red-500"><X size={13} /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input value={item.icon || ''} onChange={(e) => { const n=[...items]; n[i]={...n[i],icon:e.target.value}; set('items',n); }}
                      placeholder="Icon" className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
                    <input value={item.title || ''} onChange={(e) => { const n=[...items]; n[i]={...n[i],title:e.target.value}; set('items',n); }}
                      placeholder="Title" className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none col-span-2" />
                  </div>
                  <input value={item.desc || ''} onChange={(e) => { const n=[...items]; n[i]={...n[i],desc:e.target.value}; set('items',n); }}
                    placeholder="Short description" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    case 'before-after': {
      const pairs = d.pairs || [];
      return (
        <div className="space-y-4">
          <FieldInput label="Section Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <FieldInput label="Disclaimer" value={d.disclaimer} onChange={(v) => set('disclaimer', v)} type="textarea" placeholder="Individual results may vary..." />
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Before / After Pairs</label>
              <button type="button"
                onClick={() => set('pairs', [...pairs, { label: '', before: { url: '' }, after: { url: '' } }])}
                className="text-[10px] text-[#0B2560] font-bold flex items-center gap-0.5 hover:underline">
                <Plus size={10} /> Add Pair
              </button>
            </div>
            <div className="space-y-4">
              {pairs.map((pair: any, i: number) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">Pair {i + 1}</span>
                    <button type="button" onClick={() => set('pairs', pairs.filter((_: any, idx: number) => idx !== i))}
                      className="text-gray-300 hover:text-red-500"><X size={13} /></button>
                  </div>
                  <FieldInput label="Treatment Label" value={pair.label || ''}
                    onChange={(v) => { const n=[...pairs]; n[i]={...n[i],label:v}; set('pairs',n); }} />
                  <ImagePicker
                    label="Before Image"
                    value={pair.before?.url || ''}
                    onChange={(v) => { const n=[...pairs]; n[i]={...n[i],before:{url:v}}; set('pairs',n); }}
                    openGallery={openGallery}
                  />
                  <ImagePicker
                    label="After Image"
                    value={pair.after?.url || ''}
                    onChange={(v) => { const n=[...pairs]; n[i]={...n[i],after:{url:v}}; set('pairs',n); }}
                    openGallery={openGallery}
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
          <FieldInput label="Subtitle" value={d.subtitle} onChange={(v) => set('subtitle', v)} />
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Steps</label>
              <button type="button" onClick={() => set('steps', [...steps, { number: steps.length + 1, title: '', description: '' }])}
                className="text-[10px] text-[#0B2560] font-bold flex items-center gap-0.5 hover:underline">
                <Plus size={10} /> Add
              </button>
            </div>
            <div className="space-y-3">
              {steps.map((step: any, i: number) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">Step {step.number}</span>
                    <button type="button" onClick={() => set('steps', steps.filter((_: any, idx: number) => idx !== i))}
                      className="text-gray-300 hover:text-red-500"><X size={13} /></button>
                  </div>
                  <input value={step.title || ''} onChange={(e) => { const n=[...steps]; n[i]={...n[i],title:e.target.value}; set('steps',n); }}
                    placeholder="Step title" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
                  <input value={step.description || ''} onChange={(e) => { const n=[...steps]; n[i]={...n[i],description:e.target.value}; set('steps',n); }}
                    placeholder="Step description" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
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
          <ImagePicker
            label="Doctor Photo"
            value={d.photo || ''}
            onChange={(v) => set('photo', v)}
            openGallery={openGallery}
          />
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="Doctor Name" value={d.name} onChange={(v) => set('name', v)} />
            <FieldInput label="Qualification" value={d.qualification} onChange={(v) => set('qualification', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="Experience (e.g. 15 Years)" value={d.experience} onChange={(v) => set('experience', v)} />
            <FieldInput label="Location / Branch" value={d.location} onChange={(v) => set('location', v)} placeholder="e.g. Anna Nagar" />
          </div>
          <FieldInput label="Bio" value={d.bio} onChange={(v) => set('bio', v)} type="textarea" />
          <StringArrayEditor label="Specialties" items={d.specialties || []} onChange={(v) => set('specialties', v)} />
          <StringArrayEditor label="Achievements (shown as bullet list)" items={d.achievements || []} onChange={(v) => set('achievements', v)} />
          <FieldInput label="Testimonial Quote" value={d.quote} onChange={(v) => set('quote', v)} type="textarea" />
          <FieldInput label="Book Button Text" value={d.ctaText} onChange={(v) => set('ctaText', v)} placeholder="e.g. Book Appointment with Dr. Rao" />
        </div>
      );

    case 'reviews': {
      const reviews = d.reviews || [];
      return (
        <div className="space-y-4">
          <FieldInput label="Section Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <FieldInput label="Subtitle" value={d.subtitle} onChange={(v) => set('subtitle', v)} />
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Reviews</label>
              <button type="button" onClick={() => set('reviews', [...reviews, { name: '', rating: 5, text: '', treatment: '' }])}
                className="text-[10px] text-[#0B2560] font-bold flex items-center gap-0.5 hover:underline">
                <Plus size={10} /> Add
              </button>
            </div>
            <div className="space-y-3">
              {reviews.map((rev: any, i: number) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">Review {i + 1}</span>
                    <button type="button" onClick={() => set('reviews', reviews.filter((_: any, idx: number) => idx !== i))}
                      className="text-gray-300 hover:text-red-500"><X size={13} /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={rev.name || ''} onChange={(e) => { const n=[...reviews]; n[i]={...n[i],name:e.target.value}; set('reviews',n); }}
                      placeholder="Patient name" className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
                    <input type="number" min={1} max={5} value={rev.rating || 5}
                      onChange={(e) => { const n=[...reviews]; n[i]={...n[i],rating:Number(e.target.value)}; set('reviews',n); }}
                      placeholder="Rating" className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
                  </div>
                  <input value={rev.treatment || ''} onChange={(e) => { const n=[...reviews]; n[i]={...n[i],treatment:e.target.value}; set('reviews',n); }}
                    placeholder="Treatment name" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
                  <textarea value={rev.text || ''} onChange={(e) => { const n=[...reviews]; n[i]={...n[i],text:e.target.value}; set('reviews',n); }}
                    placeholder="Review text" rows={2} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none resize-none" />
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

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
              Animation Style
            </label>
            <select
              value={d.animationStyle || 'minimal'}
              onChange={(e) => set('animationStyle', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20"
            >
              <option value="minimal">Minimal (clean, no animation)</option>
              <option value="glow">Glow (navy + gold shimmer CTA)</option>
              <option value="urgent">Urgent (red pulsing, shake countdown)</option>
              <option value="festive">Festive (rainbow border, sparkles)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FieldInput
              label="Slots Remaining (0 = hidden)"
              value={d.slotsLeft ?? 0}
              onChange={(v) => set('slotsLeft', Number(v))}
              type="number"
            />
            <FieldInput
              label="Total Slots (progress bar denominator)"
              value={d.totalSlots ?? 20}
              onChange={(v) => set('totalSlots', Number(v))}
              type="number"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => set('emiAvailable', !d.emiAvailable)}
              className="rounded-full transition-colors shrink-0"
              style={{ width: '40px', height: '22px', background: d.emiAvailable ? '#0B2560' : '#d1d5db' }}
            >
              <div
                className="bg-white rounded-full shadow transition-transform"
                style={{ width: '18px', height: '18px', margin: '2px', transform: d.emiAvailable ? 'translateX(18px)' : 'translateX(0)' }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-600">EMI Available</span>
          </label>
          {d.emiAvailable && (
            <FieldInput label="EMI Text" value={d.emiText} onChange={(v) => set('emiText', v)} placeholder="EMI options available · Zero-cost EMI on 3 / 6 months" />
          )}
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
              <button type="button" onClick={() => set('items', [...faqs, { q: '', a: '' }])}
                className="text-[10px] text-[#0B2560] font-bold flex items-center gap-0.5 hover:underline">
                <Plus size={10} /> Add
              </button>
            </div>
            <div className="space-y-3">
              {faqs.map((faq: any, i: number) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">Q{i + 1}</span>
                    <button type="button" onClick={() => set('items', faqs.filter((_: any, idx: number) => idx !== i))}
                      className="text-gray-300 hover:text-red-500"><X size={13} /></button>
                  </div>
                  <input value={faq.q || ''} onChange={(e) => { const n=[...faqs]; n[i]={...n[i],q:e.target.value}; set('items',n); }}
                    placeholder="Question" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
                  <textarea value={faq.a || ''} onChange={(e) => { const n=[...faqs]; n[i]={...n[i],a:e.target.value}; set('items',n); }}
                    placeholder="Answer" rows={2} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none resize-none" />
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
          <FieldInput label="Subtext" value={d.subtext} onChange={(v) => set('subtext', v)} type="textarea" />
          <FieldInput label="CTA Button Text" value={d.ctaPrimary} onChange={(v) => set('ctaPrimary', v)} />
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="Phone" value={d.phone} onChange={(v) => set('phone', v)} />
            <FieldInput label="WhatsApp" value={d.whatsapp} onChange={(v) => set('whatsapp', v)} placeholder="91XXXXXXXXXX" />
          </div>
          <StringArrayEditor label="Trust Badges" items={d.badges || []} onChange={(v) => set('badges', v)} />
        </div>
      );

    case 'form':
      return (
        <div className="space-y-4">
          <FieldInput label="Form Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <FieldInput label="Form Subtext" value={d.subtext} onChange={(v) => set('subtext', v)} type="textarea" />
          <StringArrayEditor label="Urgency Points (left panel)" items={d.urgencyPoints || []} onChange={(v) => set('urgencyPoints', v)} />
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="Slots Left (0 = hidden)" value={d.slotsLeft ?? ''} onChange={(v) => set('slotsLeft', v ? Number(v) : 0)} type="number" />
            <FieldInput label="Phone (left panel)" value={d.phone} onChange={(v) => set('phone', v)} />
          </div>
          <p className="text-xs text-[#3B82C4] bg-[#3B82C4]/10 rounded-xl px-3 py-2 font-semibold">
            Form fields are configured in the &quot;Form&quot; tab in the sidebar.
          </p>
        </div>
      );

    case 'comparison': {
      const rows = d.rows || [];
      return (
        <div className="space-y-4">
          <FieldInput label="Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="Badge Text" value={d.badge} onChange={(v) => set('badge', v)} />
            <FieldInput label="CTA Text" value={d.ctaText} onChange={(v) => set('ctaText', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldInput label="Your Label" value={d.usLabel} onChange={(v) => set('usLabel', v)} />
            <FieldInput label="Others Label" value={d.othersLabel} onChange={(v) => set('othersLabel', v)} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Comparison Rows</label>
              <button type="button" onClick={() => set('rows', [...rows, { label: '', us: true, others: false }])}
                className="text-[10px] text-[#0B2560] font-bold flex items-center gap-0.5 hover:underline">
                <Plus size={10} /> Add Row
              </button>
            </div>
            <div className="space-y-2">
              {rows.map((row: any, i: number) => (
                <div key={i} className="flex gap-2 items-center bg-gray-50 rounded-xl px-3 py-2">
                  <input value={row.label || ''} onChange={(e) => { const n=[...rows]; n[i]={...n[i],label:e.target.value}; set('rows',n); }}
                    placeholder="Feature label" className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none" />
                  <label className="flex items-center gap-1 text-[10px] font-semibold text-green-700">
                    <input type="checkbox" checked={row.us !== false} onChange={(e) => { const n=[...rows]; n[i]={...n[i],us:e.target.checked}; set('rows',n); }} className="rounded" />Us
                  </label>
                  <label className="flex items-center gap-1 text-[10px] font-semibold text-gray-500">
                    <input type="checkbox" checked={!!row.others} onChange={(e) => { const n=[...rows]; n[i]={...n[i],others:e.target.checked}; set('rows',n); }} className="rounded" />Others
                  </label>
                  <button type="button" onClick={() => set('rows', rows.filter((_: any, idx: number) => idx !== i))} className="text-gray-300 hover:text-red-500"><X size={12} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    case 'guarantee': {
      const cards = d.cards || [];
      return (
        <div className="space-y-4">
          <FieldInput label="Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <FieldInput label="Subtext" value={d.subtext} onChange={(v) => set('subtext', v)} type="textarea" />
          <StringArrayEditor label="Trust Seals" items={d.seals || []} onChange={(v) => set('seals', v)} />
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Guarantee Cards</label>
              <button type="button" onClick={() => set('cards', [...cards, { icon: '✓', title: '', desc: '' }])}
                className="text-[10px] text-[#0B2560] font-bold flex items-center gap-0.5 hover:underline">
                <Plus size={10} /> Add
              </button>
            </div>
            <div className="space-y-3">
              {cards.map((card: any, i: number) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-500">Card {i + 1}</span>
                    <button type="button" onClick={() => set('cards', cards.filter((_: any, idx: number) => idx !== i))} className="text-gray-300 hover:text-red-500"><X size={12} /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input value={card.icon || ''} onChange={(e) => { const n=[...cards]; n[i]={...n[i],icon:e.target.value}; set('cards',n); }}
                      placeholder="Emoji" className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
                    <input value={card.title || ''} onChange={(e) => { const n=[...cards]; n[i]={...n[i],title:e.target.value}; set('cards',n); }}
                      placeholder="Title" className="col-span-2 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
                  </div>
                  <textarea value={card.desc || ''} onChange={(e) => { const n=[...cards]; n[i]={...n[i],desc:e.target.value}; set('cards',n); }}
                    placeholder="Description" rows={2} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none resize-none" />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    case 'hair-timeline': {
      const milestones = d.milestones || [];
      return (
        <div className="space-y-4">
          <FieldInput label="Section Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <FieldInput label="Subtitle" value={d.subtitle} onChange={(v) => set('subtitle', v)} placeholder="Your hair growth journey, week by week." />
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Milestones</label>
              <button type="button" onClick={() => set('milestones', [...milestones, { period: '', title: '', desc: '' }])}
                className="text-[10px] text-[#0B2560] font-bold flex items-center gap-0.5 hover:underline">
                <Plus size={10} /> Add
              </button>
            </div>
            <div className="space-y-3">
              {milestones.map((m: any, i: number) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">Milestone {i + 1}</span>
                    <button type="button" onClick={() => set('milestones', milestones.filter((_: any, idx: number) => idx !== i))}
                      className="text-gray-300 hover:text-red-500"><X size={13} /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input value={m.period || ''} onChange={(e) => { const n=[...milestones]; n[i]={...n[i],period:e.target.value}; set('milestones',n); }}
                      placeholder="Period" className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
                    <input value={m.title || ''} onChange={(e) => { const n=[...milestones]; n[i]={...n[i],title:e.target.value}; set('milestones',n); }}
                      placeholder="Title" className="col-span-2 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
                  </div>
                  <input value={m.desc || ''} onChange={(e) => { const n=[...milestones]; n[i]={...n[i],desc:e.target.value}; set('milestones',n); }}
                    placeholder="Description" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    case 'location':
      return (
        <div className="space-y-4">
          <FieldInput label="Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <FieldInput label="Subtitle" value={d.subtitle} onChange={(v) => set('subtitle', v)} />
          <FieldInput label="City" value={d.city} onChange={(v) => set('city', v)} placeholder="e.g. Chennai" />
          <StringArrayEditor label="Branches" items={d.branches || []} onChange={(v) => set('branches', v)} />
          <ImagePicker
            label="Clinic Interior Image"
            value={d.image || ''}
            onChange={(v) => set('image', v)}
            openGallery={openGallery}
          />
        </div>
      );

    case 'video-explainer':
      return (
        <div className="space-y-4">
          <FieldInput label="Badge" value={d.badge} onChange={(v) => set('badge', v)} placeholder="Treatment Overview" />
          <FieldInput label="Headline" value={d.headline} onChange={(v) => set('headline', v)} />
          <FieldInput label="Subtitle" value={d.subtitle} onChange={(v) => set('subtitle', v)} type="textarea" placeholder="Supporting text below the headline" />
          <VideoUploader
            label="Video File"
            value={d.videoUrl || ''}
            onChange={(v) => set('videoUrl', v)}
          />
          <ImagePicker
            label="Thumbnail Image (shown before play)"
            value={d.thumbnailUrl || ''}
            onChange={(v) => set('thumbnailUrl', v)}
            openGallery={openGallery}
          />
          <FieldInput label="Caption (below video)" value={d.caption} onChange={(v) => set('caption', v)} placeholder="e.g. Actual in-clinic treatment footage" />
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => set('autoplayMuted', !d.autoplayMuted)}
              className="rounded-full transition-colors shrink-0"
              style={{ width: '40px', height: '22px', background: d.autoplayMuted ? '#0B2560' : '#d1d5db' }}
            >
              <div
                className="bg-white rounded-full shadow transition-transform"
                style={{ width: '18px', height: '18px', margin: '2px', transform: d.autoplayMuted ? 'translateX(18px)' : 'translateX(0)' }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-600">Autoplay muted loop (ambient mode)</span>
          </label>
          <p className="text-xs text-[#3B82C4] bg-[#3B82C4]/10 rounded-xl px-3 py-2 font-semibold">
            Default: thumbnail + click-to-play with sound. Ambient mode: loops silently, no click needed.
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
  section, index, total, onToggleVisible, onMoveUp, onMoveDown, onDelete, onDuplicate, onDataChange, openGallery,
}: {
  section: Section;
  index: number;
  total: number;
  onToggleVisible: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onDataChange: (data: Record<string, any>) => void;
  openGallery: (cb: (url: string) => void) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showBannerPreview, setShowBannerPreview] = useState(false);
  const meta = SECTION_LABELS[section.type] || { label: section.type, icon: '📄' };

  return (
    <>
      <div className={`bg-white rounded-xl border shadow-sm transition-all ${expanded ? 'border-[#3B82C4]/40 shadow-md' : 'border-gray-100'}`}>
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="text-xl shrink-0">{meta.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#0B2560] truncate">{meta.label}</p>
            <p className="text-[10px] text-gray-400">{section.type}</p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button onClick={onToggleVisible} title={section.visible ? 'Hide' : 'Show'}
              className={`p-1.5 rounded-lg transition ${section.visible ? 'text-green-600 hover:bg-green-50' : 'text-gray-300 hover:bg-gray-100'}`}>
              {section.visible ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
            </button>
            <button onClick={onMoveUp} disabled={index === 0}
              className="p-1.5 text-gray-400 hover:text-[#0B2560] hover:bg-gray-100 rounded-lg transition disabled:opacity-30">
              <ChevronUp size={14} />
            </button>
            <button onClick={onMoveDown} disabled={index === total - 1}
              className="p-1.5 text-gray-400 hover:text-[#0B2560] hover:bg-gray-100 rounded-lg transition disabled:opacity-30">
              <ChevronDown size={14} />
            </button>
            <button onClick={onDuplicate} title="Duplicate section"
              className="p-1.5 text-gray-400 hover:text-[#3B82C4] hover:bg-[#3B82C4]/10 rounded-lg transition text-xs">
              ⧉
            </button>
            <button onClick={() => setExpanded((e) => !e)}
              className={`p-1.5 rounded-lg transition text-xs font-semibold px-2.5 ${expanded ? 'bg-[#0B2560] text-white' : 'text-[#0B2560] hover:bg-[#0B2560]/10'}`}>
              {expanded ? 'Close' : 'Edit'}
            </button>
            <button onClick={onDelete}
              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {expanded && (
          <div className="border-t border-gray-100 px-4 py-4">
            <SectionEditor section={section} onChange={onDataChange} openGallery={openGallery} />

            {section.type === 'offer-banner' && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowBannerPreview(true)}
                  className="w-full flex items-center justify-center gap-2 bg-[#0B2560]/5 hover:bg-[#0B2560]/10 text-[#0B2560] font-bold text-sm py-3 rounded-xl border border-[#0B2560]/15 transition"
                >
                  <Eye size={15} />
                  Preview Animation
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Offer banner preview modal */}
      {showBannerPreview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 overflow-auto p-4 flex items-start justify-center"
          onClick={() => setShowBannerPreview(false)}
        >
          <div
            className="w-full max-w-3xl mt-8 mb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end mb-3">
              <button
                onClick={() => setShowBannerPreview(false)}
                className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white font-bold px-4 py-2 rounded-xl text-sm backdrop-blur-sm transition"
              >
                <X size={14} />
                Close Preview
              </button>
            </div>
            <OfferBannerSection data={section.data} />
          </div>
        </div>
      )}
    </>
  );
}

// ─── Add section picker ───────────────────────────────────────────────────────

function AddSectionPicker({ onAdd }: { onAdd: (type: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-[#0B2560]/40 text-gray-400 hover:text-[#0B2560] font-semibold text-sm py-3.5 rounded-xl transition">
        <Plus size={16} /> Add Section
      </button>
      {open && (
        <div className="mt-3 bg-white rounded-2xl border border-gray-100 shadow-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(SECTION_LABELS).map(([type, meta]) => (
            <button key={type} onClick={() => { onAdd(type); setOpen(false); }}
              className="flex items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-gray-700 hover:bg-[#f6faff] hover:text-[#0B2560] rounded-xl transition">
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
    onChange([...fields, { id: `field-${Date.now()}`, label: '', type: 'text', placeholder: '', required: false, options: [] }]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Form Fields</p>
        <button onClick={addField} className="text-[10px] text-[#0B2560] font-bold flex items-center gap-0.5 hover:underline">
          <Plus size={10} /> Add Field
        </button>
      </div>
      {fields.length === 0 && (
        <p className="text-xs text-gray-400 italic">No fields yet. Default fields (name, phone, email) will be used.</p>
      )}
      <div className="space-y-3">
        {fields.map((field, i) => (
          <div key={field.id} className="bg-gray-50 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">Field {i + 1}</span>
              <button onClick={() => onChange(fields.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-red-500"><X size={13} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={field.label} onChange={(e) => { const n=[...fields]; n[i]={...n[i],label:e.target.value}; onChange(n); }}
                placeholder="Label" className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none col-span-2" />
              <select value={field.type} onChange={(e) => { const n=[...fields]; n[i]={...n[i],type:e.target.value as FormField['type']}; onChange(n); }}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none">
                {FIELD_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
              <input value={field.placeholder} onChange={(e) => { const n=[...fields]; n[i]={...n[i],placeholder:e.target.value}; onChange(n); }}
                placeholder="Placeholder" className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none" />
            </div>
            {field.type === 'select' && (
              <StringArrayEditor label="Options" items={field.options || []}
                onChange={(opts) => { const n=[...fields]; n[i]={...n[i],options:opts}; onChange(n); }} />
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={field.required} onChange={(e) => { const n=[...fields]; n[i]={...n[i],required:e.target.checked}; onChange(n); }} className="rounded" />
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

  const AI_ACTIONS = [
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, context }),
      });
      const data = await res.json();
      setResults((r) => ({ ...r, [type]: data.success ? data.result : `Error: ${data.message}` }));
    } catch {
      setResults((r) => ({ ...r, [type]: 'Generation failed. Check API key.' }));
    } finally { setLoading(null); }
  };

  const copy = (type: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Context / Treatment</label>
        <input value={context} onChange={(e) => setContext(e.target.value)}
          placeholder="e.g. Hair PRP Treatment for hair loss"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
      </div>
      <div className="space-y-3">
        {AI_ACTIONS.map((action) => (
          <div key={action.type} className="bg-gray-50 rounded-xl overflow-hidden">
            <button onClick={() => generate(action.type)} disabled={!!loading}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-[#0B2560] hover:bg-[#f6faff] transition disabled:opacity-60">
              <span>{action.icon}</span> {action.label}
              {loading === action.type && <Loader size={13} className="animate-spin ml-auto text-[#3B82C4]" />}
            </button>
            {results[action.type] && (
              <div className="border-t border-gray-100 px-3 py-2">
                <div className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">{results[action.type]}</div>
                <button onClick={() => copy(action.type, results[action.type])}
                  className="flex items-center gap-1 text-[10px] font-bold text-[#3B82C4] mt-2 hover:underline">
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

  // Gallery state
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

  useEffect(() => {
    fetch(`/api/admin/landing-pages/${id}`)
      .then((r) => r.json())
      .then((data) => { if (data.success) setLp(data.data); })
      .finally(() => setLoading(false));
  }, [id]);

  const scheduleSave = useCallback((updated: LandingPage) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus('saving');
    saveTimer.current = setTimeout(async () => {
      try {
        // Never let auto-save touch `status` — only togglePublish does that.
        // Prevents a race where stale React state reverts a published LP to draft.
        const { status: _omit, ...safePayload } = updated;
        const res = await fetch(`/api/admin/landing-pages/${id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(safePayload),
        });
        const data = await res.json();
        if (data.success) { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000); }
        else { setSaveStatus('error'); }
      } catch { setSaveStatus('error'); }
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
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...lp, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) setLp(data.data);
    } finally { setSaving(false); }
  };

  const addSection = (type: string) => {
    updateLp((prev) => ({
      ...prev,
      sections: [...prev.sections, { id: `${type}-${Date.now()}`, type, visible: true, data: SECTION_DEFAULTS[type] || {} }],
    }));
  };

  const deleteSection = (idx: number) => {
    if (!confirm('Remove this section?')) return;
    updateLp((prev) => ({ ...prev, sections: prev.sections.filter((_, i) => i !== idx) }));
  };

  const duplicateSection = (idx: number) => {
    updateLp((prev) => {
      const sections = [...prev.sections];
      const src = sections[idx];
      const copy = { ...src, id: `${src.type}-${Date.now()}`, data: { ...src.data } };
      sections.splice(idx + 1, 0, copy);
      return { ...prev, sections };
    });
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
    { key: 'seo',     label: 'SEO',     icon: <Search size={14} /> },
    { key: 'form',    label: 'Form',    icon: <Webhook size={14} /> },
    { key: 'tracking',label: 'Tracking',icon: <BarChart2 size={14} /> },
    { key: 'ai',      label: 'AI',      icon: <Cpu size={14} /> },
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
          <span className={`text-[10px] font-semibold ${saveStatus === 'saving' ? 'text-[#3B82C4]' : saveStatus === 'saved' ? 'text-green-600' : saveStatus === 'error' ? 'text-red-500' : 'text-transparent'}`}>
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'error' ? 'Save failed' : '.'}
          </span>

          <a href={`/lp/${lp.slug}${lp.status !== 'published' ? '?preview=1' : ''}`} target="_blank" rel="noopener noreferrer">
            <button className="flex items-center gap-1.5 text-xs font-semibold text-[#3B82C4] hover:underline">
              <ExternalLink size={13} /> {lp.status === 'published' ? 'View Live' : 'Preview'}
            </button>
          </a>

          <button onClick={togglePublish} disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition shadow-sm disabled:opacity-60 ${
              lp.status === 'published'
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-[#0B2560] text-white hover:bg-[#1a3a7a] shadow-[#0B2560]/20'
            }`}>
            <Rocket size={14} />
            {saving ? '...' : lp.status === 'published' ? 'Published' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-hidden">
          <div className="flex border-b border-gray-100 shrink-0">
            {TABS.map((tab) => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold transition ${
                  activeTab === tab.key ? 'text-[#0B2560] border-b-2 border-[#0B2560]' : 'text-gray-400 hover:text-gray-600'
                }`}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {activeTab === 'details' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Title</label>
                  <input value={lp.title} onChange={(e) => updateLp((p) => ({ ...p, title: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Slug</label>
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#0B2560]/20 text-sm">
                    <span className="px-2 py-2.5 text-gray-400 bg-gray-50 border-r border-gray-200 font-mono text-[10px]">/lp/</span>
                    <input value={lp.slug}
                      onChange={(e) => updateLp((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                      className="flex-1 px-3 py-2.5 focus:outline-none font-mono text-xs" />
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
                        {lp.analytics?.visitors ? `${((lp.analytics.leads / lp.analytics.visitors) * 100).toFixed(1)}%` : '—'}
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
                {(['title', 'description', 'keywords'] as const).map((key) => (
                  <div key={key}>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block capitalize">
                      {key}
                    </label>
                    {key === 'description' ? (
                      <textarea value={lp.seo?.[key] ?? ''} onChange={(e) => updateLp((p) => ({ ...p, seo: { ...p.seo, [key]: e.target.value } }))}
                        rows={3} placeholder="Meta description (max 155 chars)"
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 resize-none" />
                    ) : (
                      <input value={lp.seo?.[key] ?? ''} onChange={(e) => updateLp((p) => ({ ...p, seo: { ...p.seo, [key]: e.target.value } }))}
                        placeholder={key === 'title' ? 'SEO title (max 60 chars)' : 'keyword1, keyword2'}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
                    )}
                  </div>
                ))}
                <SeoAiAssistant
                  lpId={id}
                  pageTitle={lp.seo?.title || lp.title}
                  template={lp.template}
                  description={lp.seo?.description ?? ''}
                  keywords={lp.seo?.keywords ?? ''}
                  onApplyDescription={(v) => updateLp((p) => ({ ...p, seo: { ...p.seo, description: v } }))}
                  onKeywordsChange={(v) => updateLp((p) => ({ ...p, seo: { ...p.seo, keywords: v } }))}
                />
                <ImagePicker
                  label="OG Image (shown when shared on social/WhatsApp)"
                  value={lp.seo?.ogImage ?? ''}
                  onChange={(v) => updateLp((p) => ({ ...p, seo: { ...p.seo, ogImage: v } }))}
                  openGallery={openGallery}
                />
              </div>
            )}

            {activeTab === 'form' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Submit Button Text</label>
                  <input value={lp.form?.submitText ?? ''} onChange={(e) => updateLp((p) => ({ ...p, form: { ...p.form, submitText: e.target.value } }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Success Message</label>
                  <textarea value={lp.form?.successMessage ?? ''} onChange={(e) => updateLp((p) => ({ ...p, form: { ...p.form, successMessage: e.target.value } }))}
                    rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 resize-none" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <div onClick={() => updateLp((p) => ({ ...p, form: { ...p.form, whatsappNotify: !p.form.whatsappNotify } }))}
                    className="rounded-full transition-colors"
                    style={{ width: '40px', height: '22px', background: lp.form?.whatsappNotify ? '#25D366' : '#d1d5db' }}>
                    <div className="bg-white rounded-full shadow transition-transform"
                      style={{ width: '18px', height: '18px', margin: '2px', transform: lp.form?.whatsappNotify ? 'translateX(18px)' : 'translateX(0)' }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-600">WhatsApp Notification</span>
                </label>
                <div className="border-t border-gray-100 pt-3">
                  <FormFieldsEditor fields={lp.form?.fields ?? []} onChange={(fields) => updateLp((p) => ({ ...p, form: { ...p.form, fields } }))} />
                </div>
              </div>
            )}

            {activeTab === 'tracking' && (
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tracking Pixels</p>
                {[
                  { key: 'gtmId',         label: 'Google Tag Manager ID',          placeholder: 'GTM-XXXXXXX' },
                  { key: 'metaPixelId',   label: 'Meta Pixel ID',                  placeholder: '123456789012345' },
                  { key: 'googleAdsId',   label: 'Google Ads ID',                  placeholder: 'AW-XXXXXXXXXX' },
                  { key: 'googleAdsLabel',label: 'Google Ads Conversion Label',    placeholder: 'xxxx' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">{label}</label>
                    <input value={(lp.tracking as any)?.[key] ?? ''} onChange={(e) => updateLp((p) => ({ ...p, tracking: { ...p.tracking, [key]: e.target.value } }))}
                      placeholder={placeholder} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 font-mono" />
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'ai' && <AiTab lpId={id} />}
          </div>
        </div>

        {/* Main sections list */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="max-w-2xl mx-auto space-y-3">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                Sections ({lp.sections.length})
              </p>
              <p className="text-xs text-gray-400">{lp.sections.filter((s) => s.visible).length} visible</p>
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
                onDuplicate={() => duplicateSection(idx)}
                onDataChange={(data) => updateSectionData(idx, data)}
                openGallery={openGallery}
              />
            ))}

            <AddSectionPicker onAdd={addSection} />
          </div>
        </div>
      </div>

      {/* Gallery modal (shared, one instance) */}
      <MediaGalleryModal
        isOpen={galleryOpen}
        onClose={() => { setGalleryOpen(false); galleryCallbackRef.current = null; }}
        onSelect={handleGallerySelect}
      />
    </div>
  );
}
