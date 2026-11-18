'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader, Plus, Eye, Pencil, Power, X, Globe2, MapPin } from 'lucide-react';
import { BANNER_TEMPLATES, type BannerTemplateType } from '@/app/lib/banners/types';

// Admin → Locations: the banners that appear at the top of one city page,
// and a way to create a new one already targeted at that city. Banners are
// ordinary Banner documents (same editor, same 9 templates, same schedule and
// smart rules as Admin → Banners); this panel only filters and pre-targets.

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  draft: 'bg-gray-100 text-gray-500',
  disabled: 'bg-red-50 text-red-500',
};

function scheduleState(b: any): { label: string; tone: string } | null {
  const now = Date.now();
  if (b.startDate && new Date(b.startDate).getTime() > now) {
    return { label: `Starts ${new Date(b.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`, tone: 'bg-amber-50 text-amber-700' };
  }
  if (b.endDate) {
    const end = new Date(b.endDate);
    end.setUTCHours(23, 59, 59, 999);
    if (end.getTime() < now) return { label: 'Ended', tone: 'bg-gray-100 text-gray-500' };
    return { label: `Until ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`, tone: 'bg-blue-50 text-blue-700' };
  }
  return null;
}

/** Banners that show on this city page: location-page banners targeted at it or at every city. */
export function bannersForCity(all: any[], city: string): any[] {
  return all
    .filter((b) => b.showOnLocationPage && (!b.targetLocations?.length || b.targetLocations.includes(city)))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (b.priority ?? 0) - (a.priority ?? 0));
}

export default function LocationBannersPanel({ city, cityLabel }: { city: string; cityLabel: string }) {
  const router = useRouter();
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/banners');
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'You may not have access to Banners.');
      setBanners(bannersForCity(json.data, city));
    } catch (e: any) {
      setBanners([]);
      setError(e.message || 'Could not load banners');
    }
    setLoading(false);
  }, [city]);

  useEffect(() => { load(); }, [load]);

  const editHref = (id: string) => `/admin/banners/${id}?from=locations&city=${city}`;

  const create = async (type: BannerTemplateType) => {
    setCreating(true);
    setError('');
    try {
      const def = BANNER_TEMPLATES.find((t) => t.type === type)!;
      const res = await fetch('/api/admin/banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...def.defaultData,
          title: `${cityLabel} — ${def.label}`,
          templateType: type,
          // Starts as a draft on this city's page only; the admin activates
          // it from the editor once the content is ready.
          status: 'draft',
          showOnHomepage: false,
          showOnLocationPage: true,
          showOnServicePage: false,
          showOnCategoryPage: false,
          showOnLandingPage: false,
          targetLocations: [city],
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Could not create the banner');
      router.push(editHref(json.data._id));
    } catch (e: any) {
      setError(e.message || 'Could not create the banner');
      setCreating(false);
    }
  };

  const toggle = async (b: any) => {
    const next = b.status === 'active' ? 'disabled' : 'active';
    setError('');
    try {
      const res = await fetch(`/api/admin/banners/${b._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.message || 'Could not change the banner status');
      setBanners((prev) => prev.map((x) => (x._id === b._id ? { ...x, status: next } : x)));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const slides = banners.filter((b) => b.templateType !== 'spotlight');
  const spotlights = banners.filter((b) => b.templateType === 'spotlight');

  const row = (b: any) => {
    const tpl = BANNER_TEMPLATES.find((t) => t.type === b.templateType);
    const sched = scheduleState(b);
    const cityOnly = (b.targetLocations?.length ?? 0) > 0;
    return (
      <div key={b._id} className="flex items-center gap-3 px-4 py-3">
        <span className="text-xl shrink-0">{tpl?.icon || '🎯'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm text-gray-800 truncate">{b.title}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${STATUS_STYLE[b.status] || STATUS_STYLE.draft}`}>{b.status}</span>
            {sched && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sched.tone}`}>{sched.label}</span>}
          </div>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>{tpl?.label || b.templateType}</span>
            <span>·</span>
            {cityOnly ? (
              <span className="flex items-center gap-1"><MapPin size={10} />{b.targetLocations.length === 1 ? `${cityLabel} only` : `${b.targetLocations.length} cities`}</span>
            ) : (
              <span className="flex items-center gap-1 text-amber-600"><Globe2 size={10} />All cities</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Link href={`/admin/banners/${b._id}/preview`} target="_blank" title="Preview" className="p-2 text-gray-400 hover:text-[#0B2560] hover:bg-gray-50 rounded-lg"><Eye size={15} /></Link>
          <Link href={editHref(b._id)} title="Edit" className="p-2 text-gray-400 hover:text-[#0B2560] hover:bg-gray-50 rounded-lg"><Pencil size={15} /></Link>
          <button type="button" onClick={() => toggle(b)} title={b.status === 'active' ? 'Disable' : 'Enable'}
            className={`p-2 rounded-lg ${b.status === 'active' ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'}`}>
            <Power size={15} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <section>
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <h2 className="text-base font-bold text-[#0B2560]">Top Banners — {cityLabel}</h2>
          <p className="text-xs text-gray-400 mt-0.5 max-w-xl">
            Shown at the very top of <code className="bg-gray-100 px-1 rounded">/{city}</code>, above or instead of the title card
            (see “When this city has an active banner” above). Several rotate as a carousel, in the order set in
            Admin → Banners. A Campaign Spotlight shows above them. Disabling an “All cities” banner turns it off everywhere.
          </p>
        </div>
        <button type="button" onClick={() => setPickerOpen(true)}
          className="flex items-center gap-1.5 bg-[#0B2560] text-white px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-[#0d2d73] shrink-0">
          <Plus size={14} /> New banner for {cityLabel}
        </button>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 my-3">{error}</p>}

      <div className="bg-white rounded-2xl border border-gray-100 mt-3 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-20"><Loader size={20} className="animate-spin text-[#0B2560]/30" /></div>
        ) : banners.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No banners on this city page yet — the default hero is showing.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {spotlights.length > 0 && (
              <>
                <p className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">Campaign spotlight (above the banner)</p>
                {spotlights.map(row)}
              </>
            )}
            {slides.length > 0 && (
              <>
                <p className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">Banner slides (top of page)</p>
                {slides.map(row)}
              </>
            )}
          </div>
        )}
      </div>

      {pickerOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => !creating && setPickerOpen(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-[#0B2560] text-lg">Choose a banner style</h3>
              <button type="button" onClick={() => setPickerOpen(false)} disabled={creating} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <p className="text-xs text-gray-400 mb-4">Created as a draft for {cityLabel} only. You can add more cities, a schedule or smart rules in the editor.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {BANNER_TEMPLATES.map((t) => (
                <button key={t.type} type="button" disabled={creating} onClick={() => create(t.type)}
                  className="flex flex-col items-start gap-1 p-4 border border-gray-100 rounded-xl hover:border-[#0B2560]/40 hover:bg-[#f6faff] transition text-left disabled:opacity-50">
                  <span className="text-2xl">{t.icon}</span>
                  <span className="font-bold text-sm text-[#0B2560]">{t.label}</span>
                  <span className="text-xs text-gray-400">{t.description}</span>
                </button>
              ))}
            </div>
            {creating && <p className="text-center text-sm text-gray-400 mt-4"><Loader className="animate-spin inline mr-2" size={14} />Creating…</p>}
          </div>
        </div>
      )}
    </section>
  );
}
