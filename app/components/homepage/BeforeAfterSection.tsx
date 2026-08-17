'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import SliderCard from '@/app/components/SliderCard';

// Auto-advance interval — same scale as TestimonialsSlider.tsx's 4000ms
// default (this tray shows partial next/previous cards rather than a full
// hero image, so it doesn't need BannerCarousel's slower 6000ms).
const AUTO_SCROLL_MS = 4000;

const FALLBACK_PAIRS = [
  { title: 'Acne Therapy & Scar Solution', description: 'Treatments that smooth, clarify & restore natural skin texture.', category: 'Skin Care' },
  { title: 'Hairfall & Scalp Restoration', description: 'Targeted care for stronger, healthier hair & nourished roots.', category: 'Hair' },
  { title: 'Laser Skin Brightening', description: 'Advanced laser therapy for pigmentation, spots & uneven tone.', category: 'Laser' },
];

// Multiple cards per row, responsive by CSS alone (native horizontal
// scroll-snap, same tray pattern as the homepage's Shorts & Reels
// section) — previously this showed exactly one card at a time
// regardless of screen size, with a JS pager (arrows/dots/auto-advance)
// to move between them. A native scroll tray means the visible card
// count adjusts itself per breakpoint with no JS "how many fit" logic,
// and dragging to scroll the tray no longer conflicts with dragging the
// before/after divider inside a card, since scrolling happens on the
// horizontal axis at the tray level while the divider drag is a
// container-scoped pointer capture (see useBeforeAfterDrag.ts).
export default function BeforeAfterSection({ data }: { data: any }) {
  const {
    headline = 'Real Results, Real Confidence',
    subheadline = 'Visible improvements that our patients are thrilled about. See the difference.',
    pairs = [],
  } = data || {};

  const displayPairs = (pairs.length > 0 ? pairs : FALLBACK_PAIRS).slice(0, 6);
  const trayRef = useRef<HTMLDivElement>(null);
  // Paused while the visitor is actively engaging with the tray — hovering
  // (desktop), touching (mobile swipe), or dragging a card's own
  // before/after divider (useBeforeAfterDrag.ts) — so auto-advance never
  // fights a manual scroll or an in-progress divider drag. Same `paused`
  // pattern as BannerCarousel.tsx.
  const [paused, setPaused] = useState(false);

  const scrollByCard = (dir: 1 | -1) => {
    const el = trayRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('[data-card]');
    const step = (card?.offsetWidth || el.clientWidth * 0.85) + 20; // + gap
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  // Auto-advance — one card at a time, wrapping back to the start once the
  // tray is scrolled (near) all the way to the end. Manual arrow clicks and
  // touch swipes keep working as before; this just adds a passive tick so
  // visitors who never touch the arrows still see more than the first row.
  useEffect(() => {
    if (paused || displayPairs.length <= 1) return;
    const timer = setInterval(() => {
      const el = trayRef.current;
      if (!el) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
      if (atEnd) el.scrollTo({ left: 0, behavior: 'smooth' });
      else scrollByCard(1);
    }, AUTO_SCROLL_MS);
    return () => clearInterval(timer);
  }, [paused, displayPairs.length]);

  return (
    <section id="results" className="py-12 md:py-16 lg:py-20 bg-[#F5F1EC] relative overflow-hidden">

      {/* Ambient blobs */}
      <div className="pointer-events-none absolute top-0 left-0 w-[400px] h-[400px] rounded-full bg-[#F5A623]/5 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-[360px] h-[360px] rounded-full bg-[#0B2560]/4 blur-[100px]" />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 relative">

        {/* HEADER */}
        <div className="mb-8 md:mb-10 flex items-end justify-between gap-6 flex-wrap">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-6 h-[2px] bg-[#F5A623]" />
              <span className="text-[#F5A623] text-xs font-bold tracking-[0.22em] uppercase">Patient Results</span>
            </div>
            <h2 className="text-3xl md:text-[2.5rem] lg:text-[2.75rem] font-headline font-extrabold text-[#0B2560] leading-[1.1]">
              {headline}
            </h2>
            <p className="text-[#6B7280] mt-4 text-sm leading-relaxed max-w-sm">{subheadline}</p>
          </div>

          {/* Arrows — desktop only, tray itself is natively swipeable on touch */}
          {displayPairs.length > 1 && (
            <div className="hidden md:flex gap-2 shrink-0">
              <button
                onClick={() => scrollByCard(-1)}
                className="w-11 h-11 rounded-full bg-white shadow-md flex items-center justify-center text-[#0B2560] hover:bg-[#0B2560] hover:text-white hover:scale-105 transition-all duration-300 border border-gray-100"
                aria-label="Scroll to previous results"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => scrollByCard(1)}
                className="w-11 h-11 rounded-full bg-white shadow-md flex items-center justify-center text-[#0B2560] hover:bg-[#0B2560] hover:text-white hover:scale-105 transition-all duration-300 border border-gray-100"
                aria-label="Scroll to next results"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        {/* DRAG HINT */}
        <div className="mb-5 md:mb-6">
          <span className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-[#EBE8E3] rounded-full px-4 py-2 text-xs text-[#9CA3AF] font-medium shadow-sm">
            <svg width="15" height="10" viewBox="0 0 15 10" fill="none">
              <path d="M1 5H14M1 5L3.5 2.5M1 5L3.5 7.5M14 5L11.5 2.5M14 5L11.5 7.5" stroke="#9CA3AF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Drag each photo to compare — swipe to see more
          </span>
        </div>

        {/* TRAY — 1 card on mobile (with a peek of the next), 2 on tablet, 3 on desktop */}
        <div
          ref={trayRef}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
          className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:bg-[#0B2560]/10 [&::-webkit-scrollbar-thumb]:rounded-full"
        >
          {displayPairs.map((pair: any, i: number) => (
            <div
              key={i}
              data-card
              className="snap-start shrink-0 basis-[86%] sm:basis-[47%] lg:basis-[31.5%]"
            >
              {pair?.slug ? (
                <Link href={`/results/${pair.slug}`} className="block">
                  <SliderCard pair={pair} />
                </Link>
              ) : (
                <SliderCard pair={pair} />
              )}
            </div>
          ))}
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
