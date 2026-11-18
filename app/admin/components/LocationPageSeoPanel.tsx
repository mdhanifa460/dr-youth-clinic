'use client';

import { useState, type ReactNode } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import { LOCATION_TITLE_MAX, LOCATION_DESC_MAX, defaultLocationSeo } from '@/app/lib/locationSeo';
import MetaSuggestions from './MetaSuggestions';

export interface LocationSeoForm {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  ogImage: { publicId: string; url: string };
  noindex: boolean;
}

export const EMPTY_LOCATION_SEO: LocationSeoForm = {
  metaTitle: '', metaDescription: '', keywords: [], ogImage: { publicId: '', url: '' }, noindex: false,
};

// Admin → Locations → SEO for one city page. Empty fields keep the built-in
// template (shown as the placeholder and in the preview), so nothing changes
// on the live page until an admin actually writes something.
export default function LocationPageSeoPanel({
  city, cityLabel, specialties, about = '', value, onChange, imageField,
}: {
  city: string;
  cityLabel: string;
  specialties: string[];
  /** The clinic description from Clinic Info — gives the AI ideas real local detail. */
  about?: string;
  value: LocationSeoForm;
  onChange: (next: LocationSeoForm) => void;
  imageField: ReactNode;
}) {
  const fallback = defaultLocationSeo(cityLabel, specialties);
  const [kwText, setKwText] = useState(value.keywords.join(', '));
  const set = (patch: Partial<LocationSeoForm>) => onChange({ ...value, ...patch });

  const shownTitle = value.metaTitle || fallback.title;
  const previewTitle = /DR Youth Clinic/i.test(shownTitle) || (shownTitle + ' | DR Youth Clinic').length > 60
    ? shownTitle : `${shownTitle} | DR Youth Clinic`;
  const shownDesc = value.metaDescription || fallback.description;
  const titleLen = value.metaTitle.length;
  const descLen = value.metaDescription.length;
  const customised = !!(value.metaTitle || value.metaDescription || value.keywords.length || value.ogImage.url || value.noindex);

  return (
    <section>
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <h2 className="text-base font-bold text-[#0B2560]">SEO — {cityLabel} page</h2>
          <p className="text-xs text-gray-400 mt-0.5 max-w-xl">
            Search title, description and share image for <code className="bg-gray-100 px-1 rounded">/{city}</code>. Leave a field empty
            to keep the default (shown greyed). Saved with “Save Changes”.
          </p>
        </div>
        {customised && (
          <button type="button" onClick={() => { onChange(EMPTY_LOCATION_SEO); setKwText(''); }}
            className="flex items-center gap-1 text-[11px] font-bold text-gray-400 hover:text-red-500 shrink-0">
            <RotateCcw size={11} /> Reset to default
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5 mt-3">
        {/* Google preview */}
        <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">Google preview</p>
          <p className="text-xs text-[#202124]">dryouthclinics.com › {city}</p>
          <p className="text-[#1a0dab] text-lg leading-snug truncate">{previewTitle}</p>
          <p className="text-sm text-[#4d5156] line-clamp-2">{shownDesc}</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Meta title{' '}
            <span className={`font-normal ${titleLen > 0 && titleLen < 30 ? 'text-amber-600' : 'text-gray-400'}`}>{titleLen}/{LOCATION_TITLE_MAX}</span>
          </label>
          <input value={value.metaTitle} maxLength={LOCATION_TITLE_MAX} placeholder={fallback.title}
            onChange={(e) => set({ metaTitle: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0B2560]" />
          <p className="text-[11px] text-gray-400 mt-1">Aim for 30–60 characters and include “{cityLabel}”. “| DR Youth Clinic” is added automatically when it fits.</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Meta description{' '}
            <span className={`font-normal ${descLen > 0 && descLen < 70 ? 'text-amber-600' : 'text-gray-400'}`}>{descLen}/{LOCATION_DESC_MAX}</span>
          </label>
          <textarea value={value.metaDescription} maxLength={LOCATION_DESC_MAX} rows={3} placeholder={fallback.description}
            onChange={(e) => set({ metaDescription: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-[#0B2560]" />
          <p className="text-[11px] text-gray-400 mt-1">70–160 characters. Shorter than 70 is ignored and the default is used instead.</p>
        </div>

        <MetaSuggestions
          pageType="location"
          serviceName=""
          category=""
          location={city}
          specialties={specialties}
          about={about}
          onApply={(t, d) => set({ metaTitle: t.slice(0, LOCATION_TITLE_MAX), metaDescription: d.slice(0, LOCATION_DESC_MAX) })}
        />

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Keywords <span className="font-normal text-gray-400">(comma separated, up to 15)</span></label>
          <input value={kwText} placeholder={`skin clinic in ${cityLabel.toLowerCase()}, hair treatment ${cityLabel.toLowerCase()}`}
            onChange={(e) => {
              setKwText(e.target.value);
              set({ keywords: e.target.value.split(',').map((k) => k.trim()).filter(Boolean).slice(0, 15) });
            }}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0B2560]" />
          <p className="text-[11px] text-gray-400 mt-1">Google ignores the keywords tag for ranking; useful for internal tracking and some other engines.</p>
        </div>

        <div className="max-w-sm">
          {imageField}
          <p className="text-[11px] text-gray-400 mt-1">Shown when the page is shared (WhatsApp, Facebook, X). 1200×630 works best. Falls back to the clinic hero photo.</p>
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-gray-100 p-3.5 cursor-pointer">
          <input type="checkbox" checked={value.noindex} onChange={(e) => set({ noindex: e.target.checked })} className="mt-0.5" />
          <span>
            <span className="block text-sm font-semibold text-gray-800">Hide this city page from Google (noindex)</span>
            <span className="block text-[11px] text-gray-500">Also removes it from the sitemap. Only for a branch that is closing or not open yet.</span>
          </span>
        </label>
        {value.noindex && (
          <p className="flex items-start gap-2 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2.5">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            /{city} will drop out of Google search after it is next crawled. This is the main page for {cityLabel} searches — leave it off unless that is intended.
          </p>
        )}
      </div>
    </section>
  );
}
