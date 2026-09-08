'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cloudImgFocal } from '@/app/lib/cloudinary-url';
import { focalPointToObjectPosition, type FocalPoint } from '@/app/lib/media/focalPoint';

interface Pair {
  before: { url: string; publicId?: string };
  after: { url: string; publicId?: string };
  concern?: string;
  // One focal point for the whole pair — before and after must share
  // identical framing, or the comparison itself is misleading.
  focalPoint?: FocalPoint;
}

interface Props {
  pairs: Pair[];
  serviceName: string;
}

const ALL_LABEL = 'All Results';

// 1:1 crop, both frames. Server-side crop when a publicId is available,
// same object-position fallback either way — the same identical-framing
// mechanism FocalImage uses, applied manually here since the clip-path
// compare technique needs two raw <Image> layers rather than one.
function focalSrc(img: { url: string; publicId?: string }, focalPoint?: FocalPoint) {
  return img.publicId
    ? cloudImgFocal(img.publicId, { w: 1000, h: 1000, focalPoint })
    : img.url;
}

// Before and After render as two separate, always-visible panes side by
// side — no drag-to-reveal comparison slider.
function CompareSlider({ pair, serviceName }: { pair: Pair; serviceName: string }) {
  const objectPosition = focalPointToObjectPosition(pair.focalPoint);

  return (
    <div
      className="relative flex rounded-2xl overflow-hidden border border-gray-100 shadow-sm"
      style={{ aspectRatio: '1 / 1' }}
    >
      <div className="relative flex-1 min-w-0">
        <Image
          src={focalSrc(pair.before, pair.focalPoint)}
          alt={`${serviceName} before`}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover"
          style={{ objectPosition }}
          draggable={false}
        />
        <span className="pointer-events-none absolute top-3 left-3 bg-white/85 backdrop-blur text-[#0B2560] text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full border border-gray-100 shadow-sm">Before</span>
      </div>

      {/* Divider — static, purely visual separation between the two panes */}
      <div className="w-[2px] self-stretch shrink-0 bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.7)] z-10" />

      <div className="relative flex-1 min-w-0">
        <Image
          src={focalSrc(pair.after, pair.focalPoint)}
          alt={`${serviceName} after`}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover"
          style={{ objectPosition }}
          draggable={false}
        />
        <span className="pointer-events-none absolute top-3 right-3 bg-[#F5A623]/90 text-white text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full shadow-sm">After</span>
      </div>

      {/* Concern badge */}
      {pair.concern && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
          <span className="bg-white/90 backdrop-blur text-[#0B2560] text-[10px] font-bold px-3 py-1 rounded-full shadow">
            {pair.concern}
          </span>
        </div>
      )}
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

      {/* Comparison */}
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

      <p className="text-xs text-gray-500 text-center">Real patient results · Unretouched · Individual results may vary</p>
    </div>
  );
}
