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

// `onDragStart` marks the carousel as user-interacted (see BeforeAfterSection
// below) — the drag handle's own touch gesture takes priority within the
// image itself, but the very first touch/drag anywhere on a card is also a
// reasonable signal that the visitor is actively engaging, so auto-advance
// stops there rather than yanking a card away mid-comparison.
function SliderPair({ pair, onDragStart }: { pair: BeforeAfterPair; onDragStart?: () => void }) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const pct = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100));
    setPosition(pct);
  }, []);

  const onMouseDown = () => { isDragging.current = true; onDragStart?.(); };
  const onMouseMove = (e: React.MouseEvent) => { if (isDragging.current) updatePosition(e.clientX); };
  const onMouseUp = () => { isDragging.current = false; };
  const onTouchStart = () => { onDragStart?.(); };
  const onTouchMove = (e: React.TouchEvent) => { updatePosition(e.touches[0].clientX); };

  const objectPosition = focalPointToObjectPosition(pair.focalPoint);

  return (
    <div
      ref={containerRef}
      className="relative aspect-square rounded-2xl overflow-hidden select-none cursor-col-resize shadow-xl"
      // touch-action: pan-y — this is the actual fix for "can't drag the
      // handle" on mobile. Nesting SliderPair inside the new horizontally-
      // scrollable carousel track gave the browser a real native
      // horizontal-scroll gesture on this element's ancestor; without this,
      // a horizontal touch-drag on the image gets captured by that native
      // scroll instead of reaching onTouchMove below (onTouchMove never
      // called preventDefault, and couldn't reliably anyway — React attaches
      // touchmove as a passive listener by default). pan-y explicitly cedes
      // ONLY horizontal touch gestures on this element to this component's
      // own JS, while still letting vertical page scroll pass through
      // natively if a visitor's drag starts on the image but moves vertically.
      style={{ touchAction: 'pan-y' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
    >
      {/* After image (full bg) */}
      <Image
        src={pair.after!.url!}
        alt="After"
        fill
        sizes="(max-width: 768px) 88vw, 448px"
        className="object-cover"
        style={{ objectPosition }}
        draggable={false}
      />

      {/* Before image (clipped to left portion) — same objectPosition as
          After so the two frames line up as the slider moves. */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <Image
          src={pair.before!.url!}
          alt="Before"
          fill
          sizes="(max-width: 768px) 88vw, 448px"
          className="object-cover"
          style={{ objectPosition }}
          draggable={false}
        />
      </div>

      {/* Slider handle */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-2xl flex items-center justify-center border-2 border-[#0B2560]">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M6 9L2 5M6 9L2 13M12 9L16 5M12 9L16 13" stroke="#0B2560" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <span className="absolute top-3 left-3 bg-black/60 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-sm pointer-events-none">
        BEFORE
      </span>
      <span className="absolute top-3 right-3 bg-[#0B2560]/80 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-sm pointer-events-none">
        AFTER
      </span>

      {/* Treatment badge */}
      {pair.label && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm text-[#0B2560] text-xs font-bold px-3 py-1.5 rounded-full shadow whitespace-nowrap pointer-events-none">
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
// every 4.5s until the FIRST sign of real engagement (the user scrolls the
// strip themselves, or starts dragging a card's own before/after handle) —
// at that point it stops permanently for this page view. Auto-rotating a
// comparison a visitor is actively mid-drag on would yank it away under
// their thumb, which is worse than not auto-advancing at all.
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
            <SliderPair pair={pair} onDragStart={stopAutoAdvance} />
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
      <p className="text-center text-[11px] text-gray-400 mt-2">Swipe to see more · drag a photo to compare</p>
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
          <p className="text-sm text-gray-500 mt-3 hidden md:block">Drag the slider left or right to reveal the transformation</p>
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
