'use client';

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Same fade/auto-scroll/dots/progress-bar interaction HeroSection.tsx
// already uses for the homepage's hand-authored slides — reused here to
// drive resolveBanner()'s admin-managed Banner documents instead.
//
// Takes already-rendered slide elements rather than BannerDoc[] + rendering
// BannerRenderer itself: BannerRenderer's template subtree (specifically
// GlassHeroBanner -> experienceEngine.ts -> resolveBanner.ts) transitively
// imports Mongoose. Every call site here is a Server Component, so having
// THIS 'use client' component import BannerRenderer directly would pull
// that whole Mongoose-touching chain into the client bundle (Next.js
// treats a 'use client' file's entire import graph as client code) and
// break the build ("Module not found: Can't resolve 'net'"). Passing
// pre-rendered <BannerRenderer banner={b} /> elements as children sidesteps
// that entirely — this component only ever touches React elements, never
// the module that produced them.
//
// A single slide (the common case today) renders through the early return
// below with zero nav chrome — pixel-identical to before this component
// existed. Nav chrome only appears once an admin has actually added a
// second banner to the same slot.
//
// intervalMs comes from Settings.display.carouselIntervalMs (Public
// Display admin settings) — one shared value site-wide rather than a
// hardcoded constant per component. The 6000 default only applies if a
// caller genuinely can't reach Settings, which none currently do.
export default function BannerCarousel({ slides, intervalMs = 6000, inlineDots = false }: {
  slides: ReactNode[];
  intervalMs?: number;
  // The dots+counter pill (and progress bar) default to floating over the
  // slide (absolute bottom-5) — correct for this component's original use,
  // a full-bleed hero image/video with open background behind them. LpRenderer
  // also reuses this component to group consecutive 'solution' sections
  // (plain content cards with real text, no full-bleed background) — there,
  // a floating overlay lands directly on top of live text instead of empty
  // space (reported live, looked broken). inlineDots renders the same dots
  // in normal document flow below the slide instead for that case, without
  // changing anything for the existing hero-banner callers.
  inlineDots?: boolean;
}) {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingRef = useRef(0);

  const goTo = useCallback((index: number) => {
    if (index === pendingRef.current) return;
    pendingRef.current = index;
    setVisible(false);
    setTimeout(() => {
      setCurrent(index);
      setVisible(true);
    }, 380);
  }, []);

  const next = useCallback(() => {
    goTo((pendingRef.current + 1) % slides.length);
  }, [goTo, slides.length]);

  const prev = useCallback(() => {
    goTo((pendingRef.current - 1 + slides.length) % slides.length);
  }, [goTo, slides.length]);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    timerRef.current = setInterval(next, intervalMs);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused, next, slides.length]);

  if (slides.length === 0) return null;
  if (slides.length === 1) return <>{slides[0]}</>;

  return (
    <div className="relative" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className={`transition-opacity duration-500 ease-out ${visible ? 'opacity-100' : 'opacity-0'}`}>
        {slides[current]}
      </div>

      {/* Nav arrows float mid-slide (top-1/2) — correct over an open hero
          image/video, but would sit awkwardly on top of a 'solution'
          card's own image/text layout. inlineDots mode relies on the dots
          below (still fully clickable) for navigation instead. */}
      {!inlineDots && (
        <>
          <button
            onClick={prev}
            aria-label="Previous banner"
            className="hidden sm:flex absolute left-4 md:left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 shadow-md items-center justify-center text-[#0B2560] hover:bg-white hover:scale-105 transition-all duration-200 z-20"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={next}
            aria-label="Next banner"
            className="hidden sm:flex absolute right-4 md:right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 shadow-md items-center justify-center text-[#0B2560] hover:bg-white hover:scale-105 transition-all duration-200 z-20"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {/* Dots + "1 / 2" counter. Two distinct presentations depending on
          what's behind them:
          - Default (hero banners, full-bleed image/video): floats over the
            open background on a dark backdrop-blur pill, exactly as before.
          - inlineDots (grouped 'solution' content cards, plain light
            background with real text): sits in normal document flow below
            the slide instead — an absolute overlay here would land on top
            of live text rather than empty space (the reported bug). Plain
            navy/gray dots, no dark pill backing, matching the same
            dot-indicator convention already used for the before/after
            mobile carousel (BeforeAfterSection.tsx). */}
      {inlineDots ? (
        <div className="flex items-center justify-center gap-2 mt-5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`rounded-full transition-all duration-300 touch-manipulation ${
                i === current ? 'w-6 h-1.5 bg-[#0B2560]' : 'w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      ) : (
        <>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-black/30 backdrop-blur-sm rounded-full pl-3 pr-4 py-2">
            <div className="flex items-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Go to banner ${i + 1}`}
                  className={`rounded-full transition-all duration-300 touch-manipulation ${
                    i === current ? 'w-8 h-3.5 bg-white' : 'w-3.5 h-3.5 bg-white/60 hover:bg-white/90'
                  }`}
                />
              ))}
            </div>
            <span className="text-white text-xs font-semibold tabular-nums tracking-wide">
              {current + 1} / {slides.length}
            </span>
          </div>

          {!paused && (
            <div className="absolute bottom-0 left-0 h-[3px] bg-white/20 w-full z-20">
              <div
                key={`${current}-progress`}
                className="h-full bg-white/70 rounded-full"
                style={{ animation: `bannerCarouselProgress ${intervalMs}ms linear forwards` }}
              />
            </div>
          )}
        </>
      )}

      <style jsx>{`
        @keyframes bannerCarouselProgress {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  );
}
