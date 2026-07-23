'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Save, Loader2, Plus, Trash2, ChevronUp, ChevronDown, Copy,
  Image as ImageIcon, Video as VideoIcon, Palette, ExternalLink, CheckCircle, AlertCircle,
} from 'lucide-react';
import ImageUpload from '@/app/admin/components/ImageUpload';
import VideoUpload from '@/app/admin/components/VideoUpload';
import SeoAiAssistant from '@/app/admin/components/SeoAiAssistant';

const BRANCHES = ['all', 'chennai', 'bangalore', 'coimbatore', 'kochi'];
const ELEMENT_TYPES = [
  'title', 'subtitle', 'description', 'quote', 'doctor_card', 'service_card',
  'offer_card', 'result_card', 'cta_button', 'whatsapp_button', 'call_button',
  'website_link', 'location_card', 'countdown',
];
const ELEMENT_LABELS: Record<string, string> = {
  title: 'Title', subtitle: 'Subtitle', description: 'Description', quote: 'Quote',
  doctor_card: 'Doctor Card', service_card: 'Service Card', offer_card: 'Offer Card', result_card: 'Result Card',
  cta_button: 'CTA Button', whatsapp_button: 'WhatsApp Button', call_button: 'Call Button',
  website_link: 'Website Link', location_card: 'Location Card', countdown: 'Countdown',
};

function uid() { return Math.random().toString(36).slice(2, 10); }

function emptySlide(): any {
  return {
    id: uid(), order: 0,
    background: { type: 'color', color: '#0B2560' },
    overlay: true, elements: [], duration: 5, transition: 'slide', muted: true,
  };
}

function ElementEditor({ el, onChange, doctors, services, offers, results }: any) {
  const set = (key: string, val: any) => onChange({ ...el, data: { ...el.data, [key]: val } });

  switch (el.type) {
    case 'title': case 'subtitle': case 'description': case 'quote':
      return <textarea value={el.data.text || ''} onChange={e => set('text', e.target.value)} rows={el.type === 'description' ? 3 : 2}
        placeholder={`${ELEMENT_LABELS[el.type]} text`} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />;
    case 'doctor_card':
      return <select value={el.data.doctorId || ''} onChange={e => set('doctorId', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
        <option value="">— Select doctor —</option>
        {doctors.map((d: any) => <option key={d._id} value={d._id}>{d.name}</option>)}
      </select>;
    case 'service_card':
      return <select value={el.data.serviceId || ''} onChange={e => set('serviceId', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
        <option value="">— Select service —</option>
        {services.map((s: any) => <option key={s._id} value={s._id}>{s.name}</option>)}
      </select>;
    case 'offer_card':
      return <select value={el.data.offerId || ''} onChange={e => set('offerId', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
        <option value="">— Select offer —</option>
        {offers.map((o: any) => <option key={o._id} value={o._id}>{o.title}</option>)}
      </select>;
    case 'result_card':
      return <select value={el.data.resultId || ''} onChange={e => set('resultId', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
        <option value="">— Select result —</option>
        {results.map((r: any) => <option key={r._id} value={r._id}>{r.title}</option>)}
      </select>;
    case 'cta_button':
      return <div className="grid grid-cols-2 gap-2">
        <input value={el.data.label || ''} onChange={e => set('label', e.target.value)} placeholder="Label" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input value={el.data.href || ''} onChange={e => set('href', e.target.value)} placeholder="/book" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      </div>;
    case 'website_link':
      return <div className="grid grid-cols-2 gap-2">
        <input value={el.data.label || ''} onChange={e => set('label', e.target.value)} placeholder="Label" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input value={el.data.url || ''} onChange={e => set('url', e.target.value)} placeholder="https://…" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      </div>;
    case 'whatsapp_button':
      return <input value={el.data.label || 'Chat on WhatsApp'} onChange={e => set('label', e.target.value)} placeholder="Label" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />;
    case 'call_button':
      return <input value={el.data.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="+91…" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />;
    case 'location_card':
      return <select value={el.data.branch || ''} onChange={e => set('branch', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
        <option value="">— Select branch —</option>
        {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
      </select>;
    case 'countdown':
      return <div className="grid grid-cols-2 gap-2">
        <input type="datetime-local" value={el.data.targetDate || ''} onChange={e => set('targetDate', e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
        <input value={el.data.label || ''} onChange={e => set('label', e.target.value)} placeholder="Label" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
      </div>;
    default:
      return null;
  }
}

export default function StoryBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [story, setStory] = useState<any>(null);
  const [types, setTypes] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'details' | 'slides' | 'seo'>('slides');

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/stories/${id}`);
    const data = await res.json();
    if (data.success) setStory({ ...data.data, storyType: data.data.storyType?._id || data.data.storyType });
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch('/api/admin/story-types').then(r => r.json()).then(d => d.success && setTypes(d.data));
    fetch('/api/admin/doctors').then(r => r.json()).then(d => d.success && setDoctors(d.data));
    fetch('/api/admin/services').then(r => r.json()).then(d => d.success && setServices(d.data));
    fetch('/api/admin/offers').then(r => r.json()).then(d => d.success && setOffers(d.data));
    fetch('/api/admin/results').then(r => r.json()).then(d => d.success && setResults(d.data));
  }, []);

  const set = (key: string, val: any) => setStory((s: any) => ({ ...s, [key]: val }));

  const save = async () => {
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/admin/stories/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(story) });
      const data = await res.json();
      if (data.success) { setSaved(true); setTimeout(() => setSaved(false), 2500); load(); }
      else setError(data.message || 'Save failed');
    } catch { setError('Network error'); }
    finally { setSaving(false); }
  };

  if (!story) return <div className="p-10 text-center text-gray-400 text-sm">Loading…</div>;

  const slides: any[] = story.slides || [];
  const slide = slides[activeSlide];

  const setSlides = (next: any[]) => set('slides', next.map((s, i) => ({ ...s, order: i })));
  const updateSlide = (idx: number, patch: any) => setSlides(slides.map((s, i) => i === idx ? { ...s, ...patch } : s));
  const addSlide = () => { setSlides([...slides, emptySlide()]); setActiveSlide(slides.length); };
  const removeSlide = (idx: number) => { setSlides(slides.filter((_, i) => i !== idx)); setActiveSlide(0); };
  const duplicateSlide = (idx: number) => {
    const copy = { ...slides[idx], id: uid() };
    const next = [...slides]; next.splice(idx + 1, 0, copy); setSlides(next);
  };
  const moveSlide = (idx: number, dir: -1 | 1) => {
    const next = [...slides];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setSlides(next); setActiveSlide(target);
  };

  const addElement = (type: string) => {
    const els = [...(slide.elements || []), { id: uid(), type, visible: true, data: {} }];
    updateSlide(activeSlide, { elements: els });
  };
  const updateElement = (elIdx: number, patch: any) => {
    const els = slide.elements.map((e: any, i: number) => i === elIdx ? patch : e);
    updateSlide(activeSlide, { elements: els });
  };
  const removeElement = (elIdx: number) => {
    updateSlide(activeSlide, { elements: slide.elements.filter((_: any, i: number) => i !== elIdx) });
  };

  return (
    <div className="-m-6 flex flex-col h-screen bg-white overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/admin/stories" className="text-gray-400 hover:text-[#0B2560]"><ArrowLeft size={16} /></Link>
          <input value={story.title} onChange={e => set('title', e.target.value)}
            className="font-bold text-[#0B2560] text-sm border-none focus:outline-none focus:bg-gray-50 rounded px-1 min-w-0" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saved && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle size={13} /> Saved</span>}
          {error && <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={13} /> {error}</span>}
          {story.status === 'published' && story.slug && (
            <a href={`/web-stories/${story.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#3B82C4] font-semibold flex items-center gap-1"><ExternalLink size={12} /> View</a>
          )}
          <select value={story.status} onChange={e => set('status', e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-semibold">
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <button onClick={save} disabled={saving} className="flex items-center gap-1.5 bg-[#0B2560] text-white px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 px-6 py-2 border-b border-gray-100 shrink-0">
        {(['slides', 'details', 'seo'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition ${tab === t ? 'bg-[#0B2560] text-white' : 'bg-gray-100 text-gray-500'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'details' && (
        <div className="flex-1 overflow-y-auto p-6 max-w-2xl space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Slug</label>
            <input value={story.slug || ''} onChange={e => set('slug', e.target.value)}
              placeholder="Clear this field and Save to regenerate from the title"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
            {story.slug && <p className="text-[11px] text-gray-400 mt-1">/web-stories/{story.slug}</p>}
          </div>
          <textarea value={story.description} onChange={e => set('description', e.target.value)} placeholder="Description" rows={3}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none" />
          <div className="grid sm:grid-cols-2 gap-4">
            <select value={story.storyType} onChange={e => set('storyType', e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
              {types.map(t => <option key={t._id} value={t._id}>{t.icon} {t.name}</option>)}
            </select>
            <input value={(story.tags || []).join(', ')} onChange={e => set('tags', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))}
              placeholder="Tags (comma separated)" className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Cover Image</p>
            {story.coverImage?.url && <img src={story.coverImage.url} className="w-32 rounded-xl mb-2 aspect-[9/16] object-cover" />}
            <ImageUpload onUpload={v => set('coverImage', v)} folder="dr-youth-clinic/web-stories" label="Upload Cover" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {BRANCHES.map(b => (
              <label key={b} className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                <input type="checkbox" checked={(story.branch || []).includes(b)}
                  onChange={e => set('branch', e.target.checked ? [...(story.branch || []), b] : (story.branch || []).filter((x: string) => x !== b))} />
                {b}
              </label>
            ))}
          </div>
          <div className="flex gap-4">
            {['featured', 'editorsPick', 'doctorPick'].map(k => (
              <label key={k} className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                <input type="checkbox" checked={!!story[k]} onChange={e => set(k, e.target.checked)} /> {k}
              </label>
            ))}
          </div>
          {story.status === 'scheduled' && (
            <input type="datetime-local" value={story.scheduledFor || ''} onChange={e => set('scheduledFor', e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          )}
        </div>
      )}

      {tab === 'seo' && (
        <div className="flex-1 overflow-y-auto p-6 max-w-2xl space-y-4">
          <SeoAiAssistant
            lpId={story._id}
            endpoint={`/api/admin/stories/${story._id}/seo-keywords`}
            pageTitle={story.title}
            template={types.find((t: any) => t._id === story.storyType)?.name || ''}
            description={story.description}
            keywords={(story.seoKeywords || []).join(', ')}
            onApplyDescription={(v: string) => set('seoDescription', v)}
            onKeywordsChange={(v: string) => set('seoKeywords', v.split(',').map((s: string) => s.trim()).filter(Boolean))}
          />
          <input value={story.seoTitle} onChange={e => set('seoTitle', e.target.value)} placeholder="SEO Title" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
          <textarea value={story.seoDescription} onChange={e => set('seoDescription', e.target.value)} placeholder="SEO Description" rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none" />
          <input value={(story.seoKeywords || []).join(', ')} onChange={e => set('seoKeywords', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))}
            placeholder="Keywords (comma separated)" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm" />
        </div>
      )}

      {tab === 'slides' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Slide list */}
          <div className="w-48 shrink-0 border-r border-gray-100 overflow-y-auto p-3 space-y-2">
            {slides.map((s, i) => (
              <div key={s.id} className={`rounded-xl border p-2 cursor-pointer ${i === activeSlide ? 'border-[#0B2560] bg-[#f6faff]' : 'border-gray-100'}`} onClick={() => setActiveSlide(i)}>
                <div className="aspect-[9/16] rounded-lg mb-1.5 flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ background: s.background?.type === 'color' ? s.background.color : s.background?.image?.url ? `url(${s.background.image.url}) center/cover` : '#0B2560' }}>
                  {i + 1}
                </div>
                <div className="flex items-center justify-between">
                  <button onClick={e => { e.stopPropagation(); moveSlide(i, -1); }} disabled={i === 0}><ChevronUp size={12} className="text-gray-400" /></button>
                  <button onClick={e => { e.stopPropagation(); duplicateSlide(i); }}><Copy size={11} className="text-gray-400" /></button>
                  <button onClick={e => { e.stopPropagation(); removeSlide(i); }}><Trash2 size={11} className="text-red-400" /></button>
                  <button onClick={e => { e.stopPropagation(); moveSlide(i, 1); }} disabled={i === slides.length - 1}><ChevronDown size={12} className="text-gray-400" /></button>
                </div>
              </div>
            ))}
            <button onClick={addSlide} className="w-full flex items-center justify-center gap-1 text-xs font-bold text-[#0B2560] border border-dashed border-gray-300 rounded-xl py-3 hover:bg-gray-50">
              <Plus size={13} /> Add Slide
            </button>
          </div>

          {/* Slide editor */}
          {slide ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Background */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Background</p>
                <div className="flex gap-1.5 mb-3">
                  {['color', 'gradient', 'image', 'video'].map(t => (
                    <button key={t} onClick={() => updateSlide(activeSlide, { background: { ...slide.background, type: t } })}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full capitalize ${slide.background.type === t ? 'bg-[#0B2560] text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {t}
                    </button>
                  ))}
                </div>
                {slide.background.type === 'color' && (
                  <input type="color" value={slide.background.color || '#0B2560'} onChange={e => updateSlide(activeSlide, { background: { ...slide.background, color: e.target.value } })} className="w-20 h-10 rounded-lg" />
                )}
                {slide.background.type === 'gradient' && (
                  <div className="flex gap-3">
                    <input type="color" value={slide.background.gradientFrom || '#0B2560'} onChange={e => updateSlide(activeSlide, { background: { ...slide.background, gradientFrom: e.target.value } })} className="w-20 h-10 rounded-lg" />
                    <input type="color" value={slide.background.gradientTo || '#1a4a8a'} onChange={e => updateSlide(activeSlide, { background: { ...slide.background, gradientTo: e.target.value } })} className="w-20 h-10 rounded-lg" />
                  </div>
                )}
                {slide.background.type === 'image' && (
                  <div className="max-w-xs">
                    {slide.background.image?.url && <img src={slide.background.image.url} className="w-full aspect-[9/16] object-cover rounded-xl mb-2" />}
                    <ImageUpload onUpload={v => updateSlide(activeSlide, { background: { ...slide.background, image: v } })} folder="dr-youth-clinic/web-stories" label="Upload Background Image" />
                  </div>
                )}
                {slide.background.type === 'video' && (
                  <div className="max-w-xs">
                    <VideoUpload onUpload={v => updateSlide(activeSlide, { background: { ...slide.background, video: v } })} label="Upload Background Video" />
                  </div>
                )}
              </div>

              <div className="flex gap-4 items-center">
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                  <input type="checkbox" checked={slide.overlay} onChange={e => updateSlide(activeSlide, { overlay: e.target.checked })} /> Dark overlay
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                  <input type="checkbox" checked={slide.muted} onChange={e => updateSlide(activeSlide, { muted: e.target.checked })} /> Muted
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">Duration</span>
                  <input type="number" min={2} max={30} value={slide.duration} onChange={e => updateSlide(activeSlide, { duration: Number(e.target.value) })} className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-xs" />
                  <span className="text-xs text-gray-400">sec</span>
                </div>
                <select value={slide.transition} onChange={e => updateSlide(activeSlide, { transition: e.target.value })} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs">
                  <option value="slide">Slide</option>
                  <option value="fade">Fade</option>
                  <option value="none">None</option>
                </select>
              </div>

              {/* Elements */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-gray-500 uppercase">Elements</p>
                  <select onChange={e => { if (e.target.value) { addElement(e.target.value); e.target.value = ''; } }} className="border border-gray-200 rounded-lg px-2 py-1 text-xs">
                    <option value="">+ Add element</option>
                    {ELEMENT_TYPES.map(t => <option key={t} value={t}>{ELEMENT_LABELS[t]}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  {(slide.elements || []).map((el: any, i: number) => (
                    <div key={el.id} className="border border-gray-100 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-[#0B2560] uppercase">{ELEMENT_LABELS[el.type]}</span>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 text-[10px] text-gray-400">
                            <input type="checkbox" checked={el.visible} onChange={e => updateElement(i, { ...el, visible: e.target.checked })} /> visible
                          </label>
                          <button onClick={() => removeElement(i)}><Trash2 size={12} className="text-red-400" /></button>
                        </div>
                      </div>
                      <ElementEditor el={el} onChange={(patch: any) => updateElement(i, patch)} doctors={doctors} services={services} offers={offers} results={results} />
                    </div>
                  ))}
                  {(slide.elements || []).length === 0 && <p className="text-xs text-gray-400 py-4 text-center">No elements yet — add a title, image, or CTA above.</p>}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Add a slide to get started</div>
          )}
        </div>
      )}
    </div>
  );
}
