'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { focalPointToObjectPosition, type FocalPoint } from '@/app/lib/media/focalPoint';

interface BeforeAfterPair {
  label?: string;
  before?: { url?: string };
  after?: { url?: string };
  // One focal point for the whole pair, same convention as every other
  // before/after component sitewide — before/after must share identical
  // framing. Admin-side focal point picker for this LP block type is a
  // fast-follow; the component already reads it if present.
  focalPoint?: FocalPoint;
}

interface BeforeAfterData {
  headline?: string;
  disclaimer?: string;
  pairs?: BeforeAfterPair[];
}

// Before and After render as two separate, always-visible panes side by
// side — no drag-to-reveal comparison slider.
function SliderPair({ pair }: { pair: BeforeAfterPair }) {
  const objectPosition = focalPointToObjectPosition(pair.focalPoint);

  return (
    <div className="relative flex aspect-square rounded-2xl overflow-hidden shadow-xl">
      <div className="relative flex-1 min-w-0">
        <Image
          src={pair.before!.url!}
          alt="Before"
          fill
          sizes="(max-width: 768px) 44vw, 224px"
          className="object-cover"
          style={{ objectPosition }}
          draggable={false}
        />
        <span className="absolute top-3 left-3 bg-black/60 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-sm pointer-events-none">
          BEFORE
        </span>
      </div>

      {/* Divider — static, purely visual separation between the two panes */}
      <div className="w-0.5 self-stretch shrink-0 bg-white shadow-lg z-10" />

      <div className="relative flex-1 min-w-0">
        <Image
          src={pair.after!.url!}
          alt="After"
          fill
          sizes="(max-width: 768px) 44vw, 224px"
          className="object-cover"
          style={{ objectPosition }}
          draggable={false}
        />
        <span className="absolute top-3 right-3 bg-[#0B2560]/80 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-sm pointer-events-none">
          AFTER
        </span>
      </div>

      {/* Treatment badge */}
      {pair.label && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm text-[#0B2560] text-xs font-bold px-3 py-1.5 rounded-full shadow whitespace-nowrap pointer-events-none z-10">
          {pair.label}
        </div>
      )}
    </div>
  );
}

// Mobile-only: all cases in a horizontally swipeable, scroll-snap strip —
// replaces the old "one shown + a row of selector buttons that wraps into
// a static list once there are more than 2-3 cases" layout on small
// screens (the reported bug). Each card is ~88vw wide so the next card
// visibly peeks in from the edge, signaling it's swipeable.
//
// Auto-advance + manual are both supported, but manual always wins outright
// rather than the two fighting for control: a gentle auto-advance runs
// every 4.5s until the FIRST sign of real engagement (the visitor scrolls
// the strip themselves) — at that point it stops permanently for this page
// view.
function MobileCarousel({ pairs }: { pairs: BeforeAfterPair[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const userInteractedRef = useRef(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const stopAutoAdvance = useCallback(() => { userInteractedRef.current = true; }, []);

  useEffect(() => {
    if (pairs.length < 2) return;
    const id = setInterval(() => {
      if (userInteractedRef.current) { clearInterval(id); return; }
      const track = trackRef.current;
      if (!track) return;
      const cardWidth = track.firstElementChild?.clientWidth ?? track.clientWidth;
      const next = (activeIdx + 1) % pairs.length;
      track.scrollTo({ left: next * (cardWidth + 12), behavior: 'smooth' });
      setActiveIdx(next);
    }, 4500);
    return () => clearInterval(id);
    // activeIdx intentionally drives re-arming this interval each advance —
    // a single long-lived interval closing over a stale index would always
    // scroll to "index 1" instead of actually incrementing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx, pairs.length]);

  // Manual scroll (the user swiping) also stops auto-advance, and keeps the
  // dot indicator in sync with whatever card is actually centered.
  const onScroll = useCallback(() => {
    stopAutoAdvance();
    const track = trackRef.current;
    if (!track) return;
    const cardWidth = track.firstElementChild?.clientWidth ?? track.clientWidth;
    setActiveIdx(Math.round(track.scrollLeft / (cardWidth + 12)));
  }, [stopAutoAdvance]);

  return (
    <div>
      <div
        ref={trackRef}
        onScroll={onScroll}
        onTouchStart={stopAutoAdvance}
        className="ba-carousel-track flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-5 px-5"
        style={{ scrollbarWidth: 'none' }}
      >
        {pairs.map((pair, i) => (
          <div key={i} className="shrink-0 w-[88vw] max-w-xs snap-center">
            <SliderPair pair={pair} />
          </div>
        ))}
      </div>
      {/* No "scrollbar-hide" Tailwind utility exists in this project
          (checked — not a plugin here), and hiding a scrollbar is a
          pseudo-element rule (::-webkit-scrollbar) that can't be expressed
          via an inline style prop — scoped styled-jsx, same pattern
          BannerCarousel.tsx already uses for its own one-off CSS. */}
      <style jsx>{`
        .ba-carousel-track::-webkit-scrollbar { display: none; }
      `}</style>

      {pairs.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-4">
          {pairs.map((_, i) => (
            <span
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === activeIdx ? 'w-6 h-1.5 bg-[#0B2560]' : 'w-1.5 h-1.5 bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}
      <p className="text-center text-[11px] text-gray-400 mt-2">Swipe to see more</p>
    </div>
  );
}

export default function BeforeAfterSection({ data }: { data: BeforeAfterData }) {
  const {
    headline = 'Real Results',
    disclaimer = 'Individual results may vary. Photos are from actual DR Youth Clinic patients.',
    pairs = [],
  } = data;
  const [activePairIdx, setActivePairIdx] = useState(0);
  const activePairs = pairs.filter((p) => p.before?.url && p.after?.url);

  if (!activePairs.length) return null;

  const activePair = activePairs[activePairIdx] ?? activePairs[0];

  return (
    <section className="bg-[#f6faff] py-14 md:py-20">
      <div className="max-w-5xl mx-auto px-5">
        <div className="text-center mb-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#3B82C4] mb-3">
            Transformations
          </p>
          <h2 className="text-2xl md:text-4xl font-extrabold text-[#0B2560]">{headline}</h2>
        </div>

        {/* Mobile: horizontal swipe carousel of every case (the fix for the
            reported "static list" — see MobileCarousel's own comment).
            Desktop: unchanged — one active case + a button row to switch
            between them, which reads fine as a curated selector on a wide
            screen and wasn't part of the reported issue. */}
        <div className="md:hidden">
          <MobileCarousel pairs={activePairs} />
        </div>

        <div className="hidden md:block">
          <div className="max-w-xs sm:max-w-sm md:max-w-md mx-auto">
            <SliderPair key={activePairIdx} pair={activePair} />
          </div>

          {activePairs.length > 1 && (
            <div className="flex justify-center gap-3 mt-7 flex-wrap">
              {activePairs.map((pair, i) => (
                <button
                  key={i}
                  onClick={() => setActivePairIdx(i)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    i === activePairIdx
                      ? 'bg-[#0B2560] text-white shadow-md'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-[#0B2560]/40'
                  }`}
                >
                  {pair.label || `Case ${i + 1}`}
                </button>
              ))}
            </div>
          )}
        </div>

        {disclaimer && (
          <p className="text-center text-xs text-gray-500 mt-8">*{disclaimer}</p>
        )}
      </div>
    </section>
  );
}
