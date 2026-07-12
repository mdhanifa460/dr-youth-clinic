'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import SliderCard from '@/app/components/SliderCard';

const FALLBACK_PAIRS = [
  { title: 'Acne Therapy & Scar Solution', description: 'Treatments that smooth, clarify & restore natural skin texture.', category: 'Skin Care' },
  { title: 'Hairfall & Scalp Restoration', description: 'Targeted care for stronger, healthier hair & nourished roots.', category: 'Hair' },
  { title: 'Laser Skin Brightening', description: 'Advanced laser therapy for pigmentation, spots & uneven tone.', category: 'Laser' },
];

export default function BeforeAfterSection({ data }: { data: any }) {
  const {
    headline = 'Real Results, Real Confidence',
    subheadline = 'Visible improvements that our patients are thrilled about. See the difference.',
    pairs = [],
  } = data || {};

  const displayPairs = (pairs.length > 0 ? pairs : FALLBACK_PAIRS).slice(0, 6);
  const total = displayPairs.length;

  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const prev = useCallback(() => setIdx((i) => (i - 1 + total) % total), [total]);
  const next = useCallback(() => setIdx((i) => (i + 1) % total), [total]);

  // Auto-advance every 4s, pause on hover/touch
  useEffect(() => {
    if (paused) return;
    intervalRef.current = setInterval(next, 4000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [paused, next]);

  return (
    <section id="results" className="py-12 md:py-16 lg:py-20 bg-[#F5F1EC] relative overflow-hidden">

      {/* Ambient blobs */}
      <div className="pointer-events-none absolute top-0 left-0 w-[400px] h-[400px] rounded-full bg-[#F5A623]/5 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-[360px] h-[360px] rounded-full bg-[#0B2560]/4 blur-[100px]" />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 relative">

        {/* HEADER */}
        {/* No stat row here by design — the clinic-wide numbers (patients, years,
            rating) are already stated once in StatsBar right after the hero;
            repeating a second, slightly different set here undercut trust
            rather than building it. */}
        <div className="mb-8 md:mb-10 max-w-2xl">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-6 h-[2px] bg-[#F5A623]" />
            <span className="text-[#F5A623] text-xs font-bold tracking-[0.22em] uppercase">Patient Results</span>
          </div>
          <h2 className="text-3xl md:text-[2.5rem] lg:text-[2.75rem] font-headline font-extrabold text-[#0B2560] leading-[1.1]">
            {headline}
          </h2>
          <p className="text-[#6B7280] mt-4 text-sm leading-relaxed max-w-sm">{subheadline}</p>
        </div>

        {/* DRAG HINT */}
        <div className="mb-5 md:mb-6">
          <span className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-[#EBE8E3] rounded-full px-4 py-2 text-xs text-[#9CA3AF] font-medium shadow-sm">
            <svg width="15" height="10" viewBox="0 0 15 10" fill="none">
              <path d="M1 5H14M1 5L3.5 2.5M1 5L3.5 7.5M14 5L11.5 2.5M14 5L11.5 7.5" stroke="#9CA3AF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Drag the slider to compare
          </span>
        </div>

        {/* PAGER — one card at a time, auto-scrolls */}
        <div
          className="relative"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={(e) => { setPaused(true); touchStartX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            const diff = (touchStartX.current ?? 0) - e.changedTouches[0].clientX;
            if (diff > 40) next();
            else if (diff < -40) prev();
            touchStartX.current = null;
            setPaused(false);
          }}
        >
          {/* Card — max width on desktop, full width on mobile */}
          <div className="max-w-xl mx-auto md:max-w-2xl">
            <SliderCard pair={displayPairs[idx]} />
          </div>

          {/* Side arrows — only on desktop */}
          <button
            onClick={prev}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 w-11 h-11 rounded-full bg-white shadow-md items-center justify-center text-[#0B2560] hover:bg-[#0B2560] hover:text-white hover:scale-105 transition-all duration-300 border border-gray-100 z-10"
            aria-label="Previous result"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={next}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 w-11 h-11 rounded-full bg-white shadow-md items-center justify-center text-[#0B2560] hover:bg-[#0B2560] hover:text-white hover:scale-105 transition-all duration-300 border border-gray-100 z-10"
            aria-label="Next result"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* DOT INDICATORS + mobile arrows */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={prev}
            className="md:hidden w-11 h-11 rounded-full bg-white shadow-md flex items-center justify-center text-[#0B2560] border border-gray-100"
            aria-label="Previous result"
          >
            <ChevronLeft size={15} />
          </button>

          <div className="flex gap-1">
            {displayPairs.map((_: any, i: number) => (
              <button
                key={i}
                onClick={() => { setIdx(i); setPaused(true); setTimeout(() => setPaused(false), 6000); }}
                className="h-11 min-w-8 rounded-full flex items-center justify-center"
                aria-label={`Show result ${i + 1}`}
              >
                <span className={`h-2 rounded-full transition-all duration-300 ${i === idx ? 'w-7 bg-[#0B2560]' : 'w-2 bg-[#0B2560]/20'}`} />
              </button>
            ))}
          </div>

          <button
            onClick={next}
            className="md:hidden w-11 h-11 rounded-full bg-white shadow-md flex items-center justify-center text-[#0B2560] border border-gray-100"
            aria-label="Next result"
          >
            <ChevronRight size={15} />
          </button>
        </div>

        {/* CTA to details page */}
        <div className="flex justify-center mt-10 pt-8 border-t border-[#EBE8E3]">
          <Link
            href="/results"
            className="min-h-12 flex items-center gap-3 bg-[#0B2560] text-white px-6 sm:px-8 py-3 rounded-2xl font-bold text-sm hover:bg-[#12345c] transition-all duration-300 shadow-[0_8px_24px_rgba(11,37,96,0.25)] hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(11,37,96,0.3)]"
          >
            View All Patient Results
            <span className="w-6 h-6 rounded-full bg-[#F5A623] flex items-center justify-center shrink-0">
              <ChevronRight size={14} />
            </span>
          </Link>
        </div>

      </div>
    </section>
  );
}
