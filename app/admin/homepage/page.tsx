'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff, GripVertical, Plus, Trash2, Upload, CheckCircle, Loader } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────
interface Section {
  _id?: string;
  sectionKey: string;
  label: string;
  order: number;
  visible: boolean;
  data: Record<string, any>;
}

// ─── Tiny image upload widget ─────────────────────────────
function ImgField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: { url: string; publicId: string };
  onChange: (v: { url: string; publicId: string }) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setError('');
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'dr-youth-clinic/homepage');
      const res = await fetch('/api/admin/services/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      onChange({ url: json.data.secure_url, publicId: json.data.public_id });
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <div className="flex items-center gap-3">
        {value?.url ? (
          <div className="relative w-20 h-16 rounded-lg overflow-hidden border border-gray-200 shrink-0">
            {/* Plain img — admin previews don't need optimization and must work with any origin URL */}
            <img src={value.url} alt="preview" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-20 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center shrink-0 bg-gray-50">
            <span className="text-gray-300 text-2xl">🖼️</span>
          </div>
        )}
        <div>
          <input ref={inputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
          <button type="button" onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1.5 text-xs bg-[#0B2560] text-white px-3 py-1.5 rounded-lg hover:bg-[#0d2d73] transition"
            disabled={loading}>
            {loading ? <Loader size={12} className="animate-spin" /> : <Upload size={12} />}
            {loading ? 'Uploading…' : 'Upload'}
          </button>
          {value?.url && (
            <button type="button" onClick={() => onChange({ url: '', publicId: '' })}
              className="mt-1 text-xs text-red-500 hover:underline block">
              Remove
            </button>
          )}
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
      </div>
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
      return (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <TextField label="Badge Text" value={d.badge} onChange={(v) => set('badge', v)} />
            <TextField label="Highlight Text" value={d.highlightText} onChange={(v) => set('highlightText', v)} />
          </div>
          <TextField label="Headline (use \\n for line break)" value={d.headline} onChange={(v) => set('headline', v)} multiline />
          <TextField label="Description" value={d.description} onChange={(v) => set('description', v)} multiline />
          <div className="grid sm:grid-cols-2 gap-4">
            <TextField label="Primary CTA Text" value={d.ctaPrimary?.text} onChange={(v) => set('ctaPrimary.text', v)} />
            <TextField label="Primary CTA Link" value={d.ctaPrimary?.href} onChange={(v) => set('ctaPrimary.href', v)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <TextField label="Secondary CTA Text" value={d.ctaSecondary?.text} onChange={(v) => set('ctaSecondary.text', v)} />
            <TextField label="Secondary CTA Link" value={d.ctaSecondary?.href} onChange={(v) => set('ctaSecondary.href', v)} />
          </div>
          <ImgField label="Hero Image" value={d.image} onChange={(v) => set('image', v)} />
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
                  <div className="grid sm:grid-cols-2 gap-3">
                    <ImgField label="Before Image" value={p.before}
                      onChange={(v) => { const next = JSON.parse(JSON.stringify(d)); next.pairs[i].before = v; onChange(next); }} />
                    <ImgField label="After Image" value={p.after}
                      onChange={(v) => { const next = JSON.parse(JSON.stringify(d)); next.pairs[i].after = v; onChange(next); }} />
                  </div>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => addArrItem('pairs', { title: '', description: '', before: { url: '', publicId: '' }, after: { url: '', publicId: '' } })}
              className="text-xs text-[#0B2560] font-semibold flex items-center gap-1 hover:underline">
              <Plus size={12} /> Add pair
            </button>
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
                </div>
              </div>
            ))}
            <button type="button" onClick={() => addArrItem('faqs', { question: '', answer: '' })}
              className="text-xs text-[#0B2560] font-semibold flex items-center gap-1 hover:underline">
              <Plus size={12} /> Add FAQ
            </button>
          </div>
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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Fetch sections
  useEffect(() => {
    fetch('/api/admin/homepage')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setSections(json.sections);
      })
      .catch(() => setError('Failed to load sections'))
      .finally(() => setLoading(false));
  }, []);

  // Toggle expand
  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

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
  const handleDragStart = (i: number) => setDragIdx(i);
  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    setDragOverIdx(i);
  };
  const handleDrop = (i: number) => {
    if (dragIdx === null || dragIdx === i) { setDragIdx(null); setDragOverIdx(null); return; }
    setSections((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(i, 0, moved);
      return next.map((s, idx) => ({ ...s, order: idx + 1 }));
    });
    setDragIdx(null);
    setDragOverIdx(null);
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
      <div className="space-y-3">
        {sections.map((section, i) => {
          const isExpanded = expanded.has(section.sectionKey);
          const isDragTarget = dragOverIdx === i;

          return (
            <div
              key={section.sectionKey}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={() => handleDrop(i)}
              onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
              className={`bg-white rounded-2xl border transition ${
                isDragTarget ? 'border-[#0B2560] shadow-lg scale-[1.01]' : 'border-gray-200 shadow-sm'
              } ${dragIdx === i ? 'opacity-50' : 'opacity-100'}`}
            >
              {/* CARD HEADER */}
              <div className="flex items-center gap-3 px-5 py-4">
                {/* DRAG HANDLE */}
                <div className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 shrink-0">
                  <GripVertical size={18} />
                </div>

                {/* ORDER BADGE */}
                <span className="w-6 h-6 rounded-full bg-[#f6faff] border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                  {i + 1}
                </span>

                {/* LABEL */}
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${section.visible ? 'text-[#0B2560]' : 'text-gray-400'}`}>
                    {section.label}
                  </p>
                  <p className="text-xs text-gray-400">{section.sectionKey}</p>
                </div>

                {/* ACTIONS */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* VISIBILITY TOGGLE */}
                  <button
                    type="button"
                    onClick={() => toggleVisible(i)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                      section.visible
                        ? 'bg-[#0B2560]/10 text-[#0B2560] hover:bg-[#0B2560]/20'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    }`}
                    title={section.visible ? 'Hide section' : 'Show section'}
                  >
                    {section.visible ? <Eye size={15} /> : <EyeOff size={15} />}
                  </button>

                  {/* EXPAND / COLLAPSE */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(section.sectionKey)}
                    className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition"
                  >
                    {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                </div>
              </div>

              {/* EXPANDED FORM */}
              {isExpanded && (
                <div className="px-5 pb-6 border-t border-gray-100 pt-5">
                  <SectionForm
                    section={section}
                    onChange={(data) => updateData(i, data)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

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
