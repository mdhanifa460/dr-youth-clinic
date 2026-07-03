'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Pair {
  before: { url: string };
  after: { url: string };
  concern?: string;
}

interface Props {
  pairs: Pair[];
  serviceName: string;
}

const ALL_LABEL = 'All Results';

function CompareSlider({ pair, serviceName }: { pair: Pair; serviceName: string }) {
  const [pos, setPos] = useState(50);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-gray-100 shadow-sm select-none" style={{ aspectRatio: '1 / 1' }}>
      {/* After (base layer) */}
      <Image
        src={pair.after.url}
        alt={`${serviceName} after`}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-cover"
        draggable={false}
      />
      {/* Before (clipped overlay) */}
      <Image
        src={pair.before.url}
        alt={`${serviceName} before`}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-cover"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        draggable={false}
      />

      {/* Divider line + handle */}
      <div
        className="absolute inset-y-0 pointer-events-none"
        style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
      >
        <div className="w-[2px] h-full bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.7)]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-[0_4px_20px_rgba(11,37,96,0.18)] flex items-center justify-center cursor-ew-resize">
          <svg width="14" height="9" viewBox="0 0 16 10" fill="none">
            <path d="M1 5H15M1 5L4 2M1 5L4 8M15 5L12 2M15 5L12 8" stroke="#0B2560" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <span className="pointer-events-none absolute top-3 left-3 bg-white/85 backdrop-blur text-[#0B2560] text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full border border-gray-100 shadow-sm">Before</span>
      <span className="pointer-events-none absolute top-3 right-3 bg-[#F5A623]/90 text-white text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full shadow-sm">After</span>

      {/* Concern badge */}
      {pair.concern && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
          <span className="bg-white/90 backdrop-blur text-[#0B2560] text-[10px] font-bold px-3 py-1 rounded-full shadow">
            {pair.concern}
          </span>
        </div>
      )}

      {/* Invisible range input captures drag */}
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10"
        style={{ margin: 0 }}
        aria-label={`Compare before and after for ${serviceName}`}
      />
    </div>
  );
}

export default function BeforeAfterGallery({ pairs, serviceName }: Props) {
  const concerns = [ALL_LABEL, ...Array.from(new Set(pairs.map((p) => p.concern).filter(Boolean) as string[]))];
  const [activeFilter, setActiveFilter] = useState(ALL_LABEL);
  const [currentIndex, setCurrentIndex] = useState(0);

  const filtered = activeFilter === ALL_LABEL ? pairs : pairs.filter((p) => p.concern === activeFilter);
  const pair = filtered[currentIndex] ?? filtered[0];

  function prev() {
    setCurrentIndex((i) => (i === 0 ? filtered.length - 1 : i - 1));
  }

  function next() {
    setCurrentIndex((i) => (i === filtered.length - 1 ? 0 : i + 1));
  }

  function changeFilter(f: string) {
    setActiveFilter(f);
    setCurrentIndex(0);
  }

  if (!pair) return null;

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      {concerns.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {concerns.map((c) => (
            <button
              key={c}
              onClick={() => changeFilter(c)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                activeFilter === c
                  ? 'bg-[#0B2560] text-white border-[#0B2560]'
                  : 'border-gray-100 text-gray-500 hover:border-[#0B2560] hover:text-[#0B2560]'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Drag hint */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <svg width="13" height="9" viewBox="0 0 15 10" fill="none">
          <path d="M1 5H14M1 5L3.5 2.5M1 5L3.5 7.5M14 5L11.5 2.5M14 5L11.5 7.5" stroke="#9CA3AF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Drag the slider to compare
      </div>

      {/* Slider */}
      <div className="relative">
        <CompareSlider pair={pair} serviceName={serviceName} />

        {/* Navigation arrows */}
        {filtered.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white transition z-20"
            >
              <ChevronLeft size={15} className="text-[#0B2560]" />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white transition z-20"
            >
              <ChevronRight size={15} className="text-[#0B2560]" />
            </button>
          </>
        )}
      </div>

      {/* Dot indicators */}
      {filtered.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {filtered.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-2 rounded-full transition-all ${i === currentIndex ? 'w-5 bg-[#0B2560]' : 'w-2 bg-gray-200'}`}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">Real patient results · Unretouched · Individual results may vary</p>
    </div>
  );
}
