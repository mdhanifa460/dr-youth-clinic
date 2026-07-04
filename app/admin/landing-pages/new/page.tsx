'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Rocket, Loader } from 'lucide-react';

const TEMPLATES = [
  { value: 'hair-prp', label: 'Hair PRP Therapy', emoji: '💉' },
  { value: 'hydra-facial', label: 'Hydra Facial', emoji: '✨' },
  { value: 'acne', label: 'Acne Treatment', emoji: '🌿' },
  { value: 'botox', label: 'Botox / Anti-Aging', emoji: '💆' },
  { value: 'laser', label: 'Laser Treatment', emoji: '🔬' },
  { value: 'festival', label: 'Festival Campaign', emoji: '🎉' },
  { value: 'branch-opening', label: 'Branch Opening', emoji: '🏥' },
  { value: 'doctor-campaign', label: 'Doctor Campaign', emoji: '👨‍⚕️' },
];

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
  problem: {
    headline: 'Are You Experiencing...',
    problems: ['Hair Fall', 'Thinning Hair', 'Receding Hairline'],
  },
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
    photo: '',
    name: 'Dr. Name',
    qualification: 'MBBS, MD Dermatology',
    experience: '15 Years',
    bio: 'Expert dermatologist.',
    specialties: ['Skin', 'Hair', 'Laser'],
  },
  reviews: { headline: 'What Our Patients Say', reviews: [] },
  'offer-banner': {
    badge: '🔥 Limited Time',
    headline: 'Book Your Free Consultation Today',
    subtext: 'Only 10 slots remaining this week',
    expiry: '',
    emiAvailable: true,
    ctaText: 'Claim Your Free Slot',
  },
  faq: {
    headline: 'Frequently Asked Questions',
    items: [{ q: 'Is this treatment safe?', a: 'Yes, all treatments are performed by certified dermatologists.' }],
  },
  cta: {
    headline: 'Ready to Transform?',
    subtext: 'Book your free consultation today.',
    ctaPrimary: 'Book Free Consultation',
    phone: '1800 890 9669',
    whatsapp: '',
  },
  form: {
    headline: 'Book Your Free Consultation',
    subtext: "Fill in your details and we'll call you within 2 hours.",
  },
};

const TEMPLATE_PRESETS: Record<string, string[]> = {
  'hair-prp': ['hero', 'trust-bar', 'problem', 'solution', 'benefits', 'process', 'doctor', 'reviews', 'offer-banner', 'faq', 'form'],
  'hydra-facial': ['hero', 'trust-bar', 'benefits', 'before-after', 'reviews', 'offer-banner', 'form'],
  'acne': ['hero', 'trust-bar', 'problem', 'solution', 'process', 'before-after', 'reviews', 'faq', 'form'],
  'botox': ['hero', 'trust-bar', 'solution', 'doctor', 'reviews', 'offer-banner', 'faq', 'form'],
  'laser': ['hero', 'trust-bar', 'problem', 'solution', 'benefits', 'before-after', 'reviews', 'form'],
  'festival': ['hero', 'offer-banner', 'benefits', 'reviews', 'cta', 'form'],
  'branch-opening': ['hero', 'trust-bar', 'benefits', 'doctor', 'reviews', 'offer-banner', 'form'],
  'doctor-campaign': ['hero', 'trust-bar', 'doctor', 'solution', 'reviews', 'cta', 'form'],
};

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function NewLandingPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    template: 'hair-prp',
    slug: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);

  const set = (key: string, val: string) => {
    setForm((f) => {
      const next = { ...f, [key]: val };
      if (key === 'title' && !slugEdited) {
        next.slug = toSlug(val);
      }
      return next;
    });
  };

  const handleSlugChange = (val: string) => {
    setSlugEdited(true);
    setForm((f) => ({ ...f, slug: toSlug(val) }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return setError('Title is required');
    if (!form.slug.trim()) return setError('Slug is required');

    setSaving(true);
    setError('');

    // Build sections from template preset
    const sectionTypes = TEMPLATE_PRESETS[form.template] || TEMPLATE_PRESETS['hair-prp'];
    const sections = sectionTypes.map((type, idx) => ({
      id: `${type}-${Date.now()}-${idx}`,
      type,
      visible: true,
      data: SECTION_DEFAULTS[type] || {},
    }));

    try {
      const res = await fetch('/api/admin/landing-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          slug: form.slug.trim(),
          template: form.template,
          sections,
          seo: { title: `${form.title.trim()} | DR Youth Clinic`, description: '', keywords: '', ogImage: '' },
        }),
      });

      const data = await res.json();
      if (data.success) {
        router.push(`/admin/landing-pages/${data.data._id}`);
      } else {
        setError(data.message || 'Failed to create landing page');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/landing-pages">
          <button className="p-2 text-gray-400 hover:text-[#0B2560] hover:bg-gray-100 rounded-xl transition">
            <ArrowLeft size={20} />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Rocket size={22} className="text-[#3B82C4]" />
            New Landing Page
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Create a landing page for your campaign
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
        <form onSubmit={submit} className="space-y-6">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
              Page Title *
            </label>
            <input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Hair PRP Summer Campaign"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B2560]/20 focus:border-[#0B2560] transition"
            />
          </div>

          {/* Template */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
              Template
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => set('template', t.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-semibold transition ${
                    form.template === t.value
                      ? 'border-[#0B2560] bg-[#0B2560]/5 text-[#0B2560]'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">{t.emoji}</span>
                  {t.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 mt-2">
              Template pre-fills sections for you — you can add, remove, and reorder later.
            </p>
          </div>

          {/* Slug */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">
              URL Slug *
            </label>
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#0B2560]/20 focus-within:border-[#0B2560] transition">
              <span className="px-3 py-3 text-xs text-gray-400 bg-gray-50 border-r border-gray-200 font-mono whitespace-nowrap">
                /lp/
              </span>
              <input
                value={form.slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="hair-prp-summer-2026"
                className="flex-1 px-3 py-3 text-sm text-gray-800 focus:outline-none font-mono"
              />
            </div>
            {form.slug && (
              <p className="text-[10px] text-[#3B82C4] font-semibold mt-1">
                Live URL: {typeof window !== 'undefined' ? window.location.origin : ''}/lp/{form.slug}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-[#0B2560] text-white font-bold px-6 py-3.5 rounded-xl hover:bg-[#1a3a7a] transition shadow-lg shadow-[#0B2560]/20 disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader size={17} className="animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Rocket size={17} />
                Create &amp; Open Builder
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
