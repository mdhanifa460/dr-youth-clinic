'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ChevronLeft, ChevronRight, X, Volume2, VolumeX, Pause, Play, Share2,
  Calendar, MessageCircle, Stethoscope, Sparkles, Tag, Camera, MapPin, Phone, ExternalLink,
} from 'lucide-react';

function useCountdown(target?: string) {
  const [left, setLeft] = useState('');
  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) { setLeft('Ended'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setLeft(`${d}d ${h}h ${m}m`);
    };
    tick();
    const iv = setInterval(tick, 60000);
    return () => clearInterval(iv);
  }, [target]);
  return left;
}

function ElementView({ el, entities, siteConfig }: any) {
  if (!el.visible) return null;
  const d = el.data || {};

  switch (el.type) {
    case 'title':
      return <h1 className="text-2xl md:text-3xl font-headline font-extrabold text-white leading-tight drop-shadow-lg">{d.text}</h1>;
    case 'subtitle':
      return <p className="text-base md:text-lg font-bold text-[#F5A623] drop-shadow">{d.text}</p>;
    case 'description':
      return <p className="text-sm text-white/90 leading-relaxed drop-shadow">{d.text}</p>;
    case 'quote':
      return <p className="text-base italic text-white/95 border-l-2 border-[#F5A623] pl-3 drop-shadow">"{d.text}"</p>;
    case 'doctor_card': {
      const doc = entities.doctors?.find((x: any) => x._id === d.doctorId);
      if (!doc) return null;
      return (
        <Link href={`/doctors/${doc._id}`} className="flex items-center gap-3 bg-white/95 backdrop-blur rounded-2xl p-3 shadow-lg">
          <div className="w-11 h-11 rounded-xl bg-[#0B2560]/10 flex items-center justify-center shrink-0 overflow-hidden">
            {doc.photo?.url ? <img src={doc.photo.url} className="w-full h-full object-cover" /> : <Stethoscope size={16} className="text-[#0B2560]" />}
          </div>
          <div className="min-w-0"><p className="text-xs font-bold text-[#0B2560] truncate">{doc.name}</p><p className="text-[10px] text-gray-400 truncate">{doc.title}</p></div>
        </Link>
      );
    }
    case 'service_card': {
      const svc = entities.services?.find((x: any) => x._id === d.serviceId);
      if (!svc) return null;
      return (
        <div className="flex items-center gap-3 bg-white/95 backdrop-blur rounded-2xl p-3 shadow-lg">
          <div className="w-9 h-9 rounded-xl bg-[#f6faff] flex items-center justify-center shrink-0"><Sparkles size={14} className="text-[#0B2560]" /></div>
          <p className="text-xs font-bold text-[#0B2560] truncate">{svc.name}</p>
        </div>
      );
    }
    case 'offer_card': {
      const offer = entities.offers?.find((x: any) => x._id === d.offerId);
      if (!offer) return null;
      return (
        <Link href="/offers" className="flex items-center gap-3 bg-white/95 backdrop-blur rounded-2xl p-3 shadow-lg">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0"><Tag size={14} className="text-[#F5A623]" /></div>
          <p className="text-xs font-bold text-[#0B2560] truncate">{offer.title}</p>
        </Link>
      );
    }
    case 'result_card': {
      const result = entities.results?.find((x: any) => x._id === d.resultId);
      if (!result) return null;
      return (
        <Link href={result.slug ? `/results/${result.slug}` : '/results'} className="flex items-center gap-3 bg-white/95 backdrop-blur rounded-2xl p-3 shadow-lg">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0"><Camera size={14} className="text-[#3B82C4]" /></div>
          <p className="text-xs font-bold text-[#0B2560] truncate">{result.title}</p>
        </Link>
      );
    }
    case 'cta_button':
      return <Link href={d.href || '/book'} className="block text-center bg-[#F5A623] text-[#0B2560] font-bold text-sm py-3 rounded-2xl shadow-lg">{d.label || 'Book Now'}</Link>;
    case 'website_link':
      return <a href={d.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 text-center bg-white/90 text-[#0B2560] font-bold text-sm py-3 rounded-2xl shadow-lg">{d.label || 'Learn More'} <ExternalLink size={13} /></a>;
    case 'whatsapp_button': {
      const wa = siteConfig?.publicWhatsApp ? `https://wa.me/${siteConfig.publicWhatsApp.replace(/\D/g, '')}` : null;
      if (!wa) return null;
      return <a href={wa} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-green-500 text-white font-bold text-sm py-3 rounded-2xl shadow-lg"><MessageCircle size={15} /> {d.label || 'Chat on WhatsApp'}</a>;
    }
    case 'call_button':
      return d.phone ? <a href={`tel:${d.phone}`} className="flex items-center justify-center gap-2 bg-white/90 text-[#0B2560] font-bold text-sm py-3 rounded-2xl shadow-lg"><Phone size={14} /> Call Us</a> : null;
    case 'location_card':
      return d.branch ? <div className="flex items-center gap-2 bg-white/90 rounded-2xl p-3 shadow-lg"><MapPin size={14} className="text-[#F5A623]" /><span className="text-xs font-bold text-[#0B2560] capitalize">{d.branch} Clinic</span></div> : null;
    case 'countdown':
      return <CountdownEl target={d.targetDate} label={d.label} />;
    default:
      return null;
  }
}

function CountdownEl({ target, label }: { target?: string; label?: string }) {
  const left = useCountdown(target);
  if (!target) return null;
  return (
    <div className="bg-white/90 rounded-2xl px-4 py-2.5 text-center shadow-lg">
      {label && <p className="text-[10px] text-gray-400 font-semibold uppercase">{label}</p>}
      <p className="text-sm font-extrabold text-[#0B2560]">{left}</p>
    </div>
  );
}

function SlideBackground({ slide }: { slide: any }) {
  const bg = slide.background || {};
  if (bg.type === 'image' && bg.image?.url) {
    return <Image src={bg.image.url} alt="" fill sizes="480px" className="object-cover" priority />;
  }
  if (bg.type === 'video' && bg.video?.url) {
    return <video src={bg.video.url} autoPlay loop muted={slide.muted} playsInline className="w-full h-full object-cover" />;
  }
  if (bg.type === 'gradient') {
    return <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${bg.gradientFrom || '#0B2560'}, ${bg.gradientTo || '#1a4a8a'})` }} />;
  }
  return <div className="w-full h-full" style={{ background: bg.color || '#0B2560' }} />;
}

export default function StoryViewer({ story, related, entities, siteConfig }: any) {
  const slides = story.slides || [];
  const [idx, setIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(slides[0]?.muted ?? true);
  const rafRef = useRef<number>();
  const startRef = useRef<number>(0);
  const touchStartX = useRef<number | null>(null);
  const viewFired = useRef(false);

  const slide = slides[idx];

  const next = useCallback(() => setIdx(i => Math.min(slides.length - 1, i + 1)), [slides.length]);
  const prev = useCallback(() => setIdx(i => Math.max(0, i - 1)), []);

  useEffect(() => {
    if (!viewFired.current) {
      viewFired.current = true;
      fetch(`/api/stories/${story.slug}/view`, { method: 'POST' }).catch(() => {});
    }
  }, [story.slug]);

  useEffect(() => {
    setProgress(0);
    startRef.current = performance.now();
    if (paused || !slide) return;
    const duration = (slide.duration || 5) * 1000;
    const tick = () => {
      const elapsed = performance.now() - startRef.current;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);
      if (pct >= 100) {
        if (idx < slides.length - 1) setIdx(i => i + 1);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [idx, paused, slide, slides.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === ' ') setPaused(p => !p);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  const share = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      navigator.share({ title: story.title, url }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(url);
      alert('Link copied!');
    }
  };

  if (!slide) return <div className="p-10 text-center text-gray-400">This story has no slides yet.</div>;

  return (
    <main className="bg-[#0a0a0a] min-h-screen">
      <div className="flex items-center justify-center py-6 md:py-10 px-4">
        <div className="relative w-full max-w-[420px] aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl bg-black select-none"
          onMouseDown={() => setPaused(true)} onMouseUp={() => setPaused(false)}
          onTouchStart={(e) => { setPaused(true); touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            setPaused(false);
            const diff = (touchStartX.current ?? 0) - e.changedTouches[0].clientX;
            if (diff > 50) next(); else if (diff < -50) prev();
            touchStartX.current = null;
          }}>

          <SlideBackground slide={slide} />
          {slide.overlay && <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/40" />}

          {/* Progress bar */}
          <div className="absolute top-3 left-3 right-3 flex gap-1 z-20">
            {slides.map((_: any, i: number) => (
              <div key={i} className="flex-1 h-1 rounded-full bg-white/25 overflow-hidden">
                <div className="h-full bg-white transition-none" style={{ width: i < idx ? '100%' : i === idx ? `${progress}%` : '0%' }} />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-7 left-3 right-3 flex items-center justify-between z-20">
            <Link href="/web-stories" className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white"><X size={16} /></Link>
            <div className="flex items-center gap-2">
              <button onClick={() => setMuted(m => !m)} className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white">
                {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <button onClick={() => setPaused(p => !p)} className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white">
                {paused ? <Play size={14} /> : <Pause size={14} />}
              </button>
              <button onClick={share} className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white"><Share2 size={14} /></button>
            </div>
          </div>

          {/* Tap zones */}
          <button aria-label="Previous slide" onClick={prev} className="absolute left-0 top-0 bottom-0 w-1/4 z-10" />
          <button aria-label="Next slide" onClick={next} className="absolute right-0 top-0 bottom-0 w-3/4 z-10" />

          {/* Elements */}
          <div className="absolute bottom-0 left-0 right-0 p-5 space-y-3 z-20 pointer-events-auto">
            {(slide.elements || []).map((el: any) => (
              <div key={el.id} className="pointer-events-auto">
                <ElementView el={el} entities={entities} siteConfig={siteConfig} />
              </div>
            ))}
          </div>

          {/* Nav arrows (desktop) */}
          <button onClick={prev} disabled={idx === 0} className="hidden md:flex absolute -left-14 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center text-white disabled:opacity-20 z-30">
            <ChevronLeft size={18} />
          </button>
          <button onClick={next} disabled={idx === slides.length - 1} className="hidden md:flex absolute -right-14 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center text-white disabled:opacity-20 z-30">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Recommendations */}
      {(entities.recommendations?.length > 0) && (
        <section className="max-w-4xl mx-auto px-6 py-6">
          <h2 className="text-white/60 text-xs font-bold uppercase tracking-wider mb-3">You Might Also Like</h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide">
            {entities.recommendations.map((r: any, i: number) => (
              <a key={i} href={r.href} className="shrink-0 w-40 bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/10 transition">
                <span className="text-[10px] font-bold text-[#F5A623] uppercase">{r.type}</span>
                <p className="text-xs text-white mt-1 line-clamp-2">{r.title}</p>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Related stories */}
      {related.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 py-8">
          <h2 className="text-white/60 text-xs font-bold uppercase tracking-wider mb-4">More Stories</h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {related.map((r: any) => (
              <Link key={r._id} href={`/web-stories/${r.slug}`} className="group">
                <div className="aspect-[9/16] rounded-xl overflow-hidden bg-white/10 relative">
                  {r.coverImage?.url ? <Image src={r.coverImage.url} alt={r.title} fill sizes="120px" className="object-cover" /> : (
                    <div className="w-full h-full flex items-center justify-center text-xl">{r.storyType?.icon || '📱'}</div>
                  )}
                </div>
                <p className="text-white/70 text-[10px] mt-1.5 line-clamp-2 group-hover:text-white transition">{r.title}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-6 py-10 text-center">
        <Link href="/book" className="inline-flex items-center gap-2 bg-[#F5A623] text-[#0B2560] px-7 py-3.5 rounded-2xl font-extrabold text-sm">
          <Calendar size={15} /> {siteConfig?.consultationCta || 'Book Consultation'}
        </Link>
      </section>
    </main>
  );
}
