'use client';

import type { ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import type { CleanLocationHero } from '@/app/lib/locationHero';

export const EMPTY_LOCATION_HERO: CleanLocationHero = {
  style: 'classic', badge: '', title: '', highlight: '', primaryCtaLabel: '', primaryCtaHref: '',
  showCallButton: true, trustLine: '', offerText: '', offerHref: '',
  bgImage: { publicId: '', url: '' }, overlay: 'medium', bannerPlacement: 'replace',
};

const input = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0B2560]';

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// Admin → Locations → the title card at the top of one city page. Empty
// fields keep today's wording (shown as placeholders); app/lib/locationHero.ts
// resolves them on the public page.
export default function LocationHeroPanel({
  city, cityLabel, value, onChange, imageField,
}: {
  city: string;
  cityLabel: string;
  value: CleanLocationHero;
  onChange: (next: CleanLocationHero) => void;
  imageField: ReactNode;
}) {
  const set = (patch: Partial<CleanLocationHero>) => onChange({ ...value, ...patch });
  const isImage = value.style === 'image';
  const title = value.title || 'Advanced Skin & Aesthetic Care';
  const highlight = value.highlight || `in ${cityLabel}`;

  return (
    <section>
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <h2 className="text-base font-bold text-[#0B2560]">Title card — top of /{city}</h2>
          <p className="text-xs text-gray-400 mt-0.5 max-w-xl">
            The heading block with the address, hours and map card beside it. The description under the heading is
            the clinic description in Clinic Info below. Saved with “Save Changes”.
          </p>
        </div>
        <button type="button" onClick={() => onChange(EMPTY_LOCATION_HERO)}
          className="flex items-center gap-1 text-[11px] font-bold text-gray-400 hover:text-red-500 shrink-0">
          <RotateCcw size={11} /> Reset to default
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5 mt-3">
        {/* Live mini preview */}
        <div className={`relative rounded-xl overflow-hidden p-5 ${isImage ? 'bg-[#0B2560]' : 'bg-[#f6faff]'}`}>
          {isImage && value.bgImage.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.bgImage.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          {isImage && (
            <div className={`absolute inset-0 ${value.overlay === 'light' ? 'bg-black/30' : value.overlay === 'strong' ? 'bg-black/65' : 'bg-black/45'}`} />
          )}
          <div className="relative space-y-2 max-w-[60%]">
            {value.offerText && <span className="inline-block rounded-lg bg-[#A25607] px-2.5 py-1 text-[11px] font-bold text-white">{value.offerText}</span>}
            <p className={`text-[11px] font-semibold ${isImage ? 'text-white/90' : 'text-[#0B2560]'}`}>{value.badge || `DR Youth Clinic — ${cityLabel}`}</p>
            <p className={`text-lg font-extrabold leading-tight ${isImage ? 'text-white' : 'text-[#0B2560]'}`}>
              {title} <span className={isImage ? 'text-[#f3d6b0]' : 'text-[#A25607]'}>{highlight}</span>
            </p>
            <span className={`inline-block rounded-lg px-3 py-1.5 text-[11px] font-bold ${isImage ? 'bg-white text-[#0B2560]' : 'bg-[#0B2560] text-white'}`}>
              {value.primaryCtaLabel || 'Book Consultation'}
            </span>
          </div>
          <div className="absolute right-4 top-4 bottom-4 w-[30%] rounded-lg bg-white/95 shadow-sm flex items-center justify-center text-[10px] text-gray-400">
            Address · hours · map
          </div>
        </div>

        <Field label="Style">
          <div className="grid grid-cols-2 gap-3">
            {([
              ['classic', 'Classic', 'Light background, as today'],
              ['image', 'Full background image', 'Your photo behind the heading, with a dark fade for readable text'],
            ] as const).map(([key, label, desc]) => (
              <button key={key} type="button" onClick={() => set({ style: key })}
                className={`text-left rounded-xl border p-3 transition ${value.style === key ? 'border-[#0B2560] bg-[#f6faff]' : 'border-gray-200 hover:border-[#0B2560]/40'}`}>
                <span className="block text-sm font-bold text-[#0B2560]">{label}</span>
                <span className="block text-[11px] text-gray-500">{desc}</span>
              </button>
            ))}
          </div>
        </Field>

        {isImage && (
          <div className="grid sm:grid-cols-2 gap-4 rounded-xl bg-gray-50/60 p-4">
            <div>
              {imageField}
              {!value.bgImage.url && <p className="text-[11px] text-amber-600 mt-1">Until an image is added the Classic style is shown.</p>}
            </div>
            <Field label="Darkness of the fade" hint="Stronger keeps white text readable on bright photos.">
              <select value={value.overlay} onChange={(e) => set({ overlay: e.target.value as CleanLocationHero['overlay'] })} className={input}>
                <option value="light">Light</option>
                <option value="medium">Medium</option>
                <option value="strong">Strong</option>
              </select>
            </Field>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Heading" hint="Up to 80 characters.">
            <input value={value.title} maxLength={80} placeholder="Advanced Skin & Aesthetic Care" onChange={(e) => set({ title: e.target.value })} className={input} />
          </Field>
          <Field label="Highlighted line" hint={`Keep “${cityLabel}” in it — this is the page's main heading for Google.`}>
            <input value={value.highlight} maxLength={60} placeholder={`in ${cityLabel}`} onChange={(e) => set({ highlight: e.target.value })} className={input} />
          </Field>
          <Field label="Small label above the heading">
            <input value={value.badge} maxLength={60} placeholder={`DR Youth Clinic — ${cityLabel}`} onChange={(e) => set({ badge: e.target.value })} className={input} />
          </Field>
          <Field label="Trust line under the buttons">
            <input value={value.trustLine} maxLength={60} placeholder="9+ Years Experience" onChange={(e) => set({ trustLine: e.target.value })} className={input} />
          </Field>
          <Field label="Main button text">
            <input value={value.primaryCtaLabel} maxLength={30} placeholder="Book Consultation" onChange={(e) => set({ primaryCtaLabel: e.target.value })} className={input} />
          </Field>
          <Field label="Main button link" hint="A site path like /offers, or a full https:// link.">
            <input value={value.primaryCtaHref} placeholder={`/book?location=${city}`} onChange={(e) => set({ primaryCtaHref: e.target.value })} className={input} />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={value.showCallButton} onChange={(e) => set({ showCallButton: e.target.checked })} />
          Show the “Call Clinic” button
        </label>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 grid sm:grid-cols-2 gap-4">
          <Field label="Offer ribbon (optional)" hint="A short line above the heading, e.g. “Flat 20% off laser hair removal this month”. Empty = hidden.">
            <input value={value.offerText} maxLength={90} onChange={(e) => set({ offerText: e.target.value })} className={input} />
          </Field>
          <Field label="Offer link" hint="Where the ribbon goes, e.g. /offers. Empty = not clickable.">
            <input value={value.offerHref} placeholder="/offers" onChange={(e) => set({ offerHref: e.target.value })} className={input} />
          </Field>
        </div>

        <Field label="When this city has an active banner">
          <div className="grid sm:grid-cols-2 gap-3">
            {([
              ['above', 'Banner above the title card', 'Recommended. Keeps the heading, address, hours and map at the top for patients and Google.'],
              ['replace', 'Banner replaces the title card', 'The banner is the whole top section; the address card and this heading are hidden while it runs.'],
            ] as const).map(([key, label, desc]) => (
              <button key={key} type="button" onClick={() => set({ bannerPlacement: key })}
                className={`text-left rounded-xl border p-3 transition ${value.bannerPlacement === key ? 'border-[#0B2560] bg-[#f6faff]' : 'border-gray-200 hover:border-[#0B2560]/40'}`}>
                <span className="block text-sm font-bold text-[#0B2560]">{label}</span>
                <span className="block text-[11px] text-gray-500">{desc}</span>
              </button>
            ))}
          </div>
        </Field>
      </div>
    </section>
  );
}
