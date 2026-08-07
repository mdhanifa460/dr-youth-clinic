'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { focalPointToObjectPosition, type FocalPoint } from '@/app/lib/media/focalPoint';

interface JourneyStage {
  label?: string;
  image?: string;
  caption?: string;
  focalPoint?: FocalPoint;
}

interface ClientJourneyData {
  eyebrow?: string;
  headline?: string;
  subheadline?: string;
  patientName?: string;
  patientTag?: string;
  disclaimer?: string;
  stages?: JourneyStage[];
}

const DEFAULT_STAGES: JourneyStage[] = [
  { label: 'Before', caption: 'Starting point — visible thinning and uneven density.' },
  { label: '1 Month', caption: 'Shedding has slowed and the scalp already feels healthier.' },
  { label: '3 Months', caption: 'Fine new growth is filling in across the crown.' },
  { label: '6 Months', caption: 'Density and thickness are building up steadily.' },
  { label: '12 Months', caption: 'Full, natural-looking results — journey complete.' },
];

export default function ClientJourneySection({ data }: { data: ClientJourneyData }) {
  const {
    eyebrow = 'Real Journey',
    headline = "One Patient's Real Transformation",
    subheadline = "Scroll through an actual patient's journey, month by month.",
    patientName = '',
    patientTag = '',
    disclaimer = 'Individual results may vary. Photos are from an actual DR Youth Clinic patient, shared with consent.',
    stages: rawStages = [],
  } = data;

  const stages = (rawStages.length ? rawStages : DEFAULT_STAGES).filter(
    (s) => s.image || s.caption || s.label
  );

  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, scrollLeft: 0 });

  const scrollToIndex = useCallback((idx: number) => {
    cardRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const scrollLeft = track.scrollLeft;
        let closest = 0;
        let closestDist = Infinity;
        cardRefs.current.forEach((card, i) => {
          if (!card) return;
          const dist = Math.abs(card.offsetLeft - track.offsetLeft - scrollLeft);
          if (dist < closestDist) {
            closestDist = dist;
            closest = i;
          }
        });
        setActive(closest);
      });
    };
    track.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      track.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [stages.length]);

  const onPointerDown = (e: React.PointerEvent) => {
    const track = trackRef.current;
    if (!track) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, scrollLeft: track.scrollLeft };
    track.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current || !trackRef.current) return;
    trackRef.current.scrollLeft = dragStart.current.scrollLeft - (e.clientX - dragStart.current.x);
  };
  const onPointerUp = () => {
    isDragging.current = false;
  };

  if (!stages.length) return null;

  return (
    <section className="bg-[#0B2560] py-16 md:py-24 relative overflow-hidden">
      <div className="pointer-events-none absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-[#F5A623]/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#3B82C4]/10 blur-[120px]" />

      <div className="max-w-5xl mx-auto px-5 relative">
        <div className="text-center mb-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-3">{eyebrow}</p>
          <h2 className="text-2xl md:text-4xl font-extrabold text-white">{headline}</h2>
          <p className="text-white/60 mt-3 text-sm md:text-base max-w-xl mx-auto">{subheadline}</p>
          {(patientName || patientTag) && (
            <p className="mt-4 inline-flex items-center gap-2 bg-white/10 border border-white/10 text-white/80 text-xs font-semibold px-4 py-1.5 rounded-full">
              {patientName}
              {patientName && patientTag ? ' · ' : ''}
              {patientTag}
            </p>
          )}
        </div>

        {/* Progress rail */}
        <div className="flex items-center gap-2 max-w-md mx-auto my-10">
          {stages.map((s, i) => (
            <button
              key={i}
              onClick={() => scrollToIndex(i)}
              className="flex-1 group"
              aria-label={`Go to ${s.label || `stage ${i + 1}`}`}
            >
              <div className="h-1.5 rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#3B82C4] to-[#F5A623] transition-all duration-500"
                  style={{ width: i <= active ? '100%' : '0%' }}
                />
              </div>
              <p
                className={`mt-2 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                  i === active ? 'text-[#F5A623]' : 'text-white/40'
                }`}
              >
                {s.label || `Stage ${i + 1}`}
              </p>
            </button>
          ))}
        </div>

        {/* Scroll track */}
        <div className="relative">
          <div
            ref={trackRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            className="flex gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 cursor-grab active:cursor-grabbing [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {stages.map((s, i) => (
              <div
                key={i}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                className="snap-center shrink-0 w-[78%] sm:w-[340px] select-none"
              >
                <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl bg-white/5">
                  {s.image ? (
                    <Image
                      src={s.image}
                      alt={s.label || `Stage ${i + 1}`}
                      fill
                      sizes="(max-width: 640px) 78vw, 340px"
                      className="object-cover pointer-events-none"
                      style={{ objectPosition: focalPointToObjectPosition(s.focalPoint) }}
                      draggable={false}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20 text-4xl">📷</div>
                  )}
                  <span className="absolute top-3 left-3 bg-[#F5A623] text-[#0B2560] text-[10px] font-extrabold px-3 py-1 rounded-full shadow">
                    {s.label || `Stage ${i + 1}`}
                  </span>
                </div>
                {s.caption && (
                  <p className="mt-4 text-white/70 text-sm leading-relaxed px-1">{s.caption}</p>
                )}
              </div>
            ))}
          </div>

          {stages.length > 1 && (
            <>
              <button
                onClick={() => scrollToIndex(Math.max(0, active - 1))}
                disabled={active === 0}
                aria-label="Previous stage"
                className="hidden md:flex absolute -left-5 top-[calc(50%-1.5rem)] -translate-y-1/2 w-10 h-10 rounded-full bg-white text-[#0B2560] items-center justify-center shadow-xl disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 transition"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => scrollToIndex(Math.min(stages.length - 1, active + 1))}
                disabled={active === stages.length - 1}
                aria-label="Next stage"
                className="hidden md:flex absolute -right-5 top-[calc(50%-1.5rem)] -translate-y-1/2 w-10 h-10 rounded-full bg-white text-[#0B2560] items-center justify-center shadow-xl disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 transition"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>

        <p className="text-center text-[11px] text-white/40 mt-4 md:hidden">← Drag to explore the full journey →</p>

        {disclaimer && (
          <p className="text-center text-xs text-white/40 mt-8 max-w-lg mx-auto">*{disclaimer}</p>
        )}
      </div>
    </section>
  );
}
