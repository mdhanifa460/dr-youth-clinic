'use client';

import { useState } from 'react';
import Image from 'next/image';
import SwipeTray from '@/app/components/SwipeTray';
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
        <span className="pointer-events-none absolute top-3 left-3 bg-white/85 backdrop-blur text-primary text-xs font-bold tracking-wider uppercase px-2.5 py-1 rounded-full border border-gray-100 shadow-sm">Before</span>
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
        <span className="pointer-events-none absolute top-3 right-3 bg-champagne/90 text-white text-xs font-bold tracking-wider uppercase px-2.5 py-1 rounded-full shadow-sm">After</span>
      </div>

      {/* Concern badge */}
      {pair.concern && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10">
          <span className="bg-white/90 backdrop-blur text-primary text-xs font-bold px-3 py-1 rounded-full shadow">
            {pair.concern}
          </span>
        </div>
      )}
    </div>
  );
}

// Phone: swipe through the pairs (SwipeTray carousel with counter + arrows).
// Tablet/desktop: the pairs sit in a two-column grid, so every pair is visible.
export default function BeforeAfterGallery({ pairs, serviceName }: Props) {
  const concerns = [ALL_LABEL, ...Array.from(new Set(pairs.map((p) => p.concern).filter(Boolean) as string[]))];
  const [activeFilter, setActiveFilter] = useState(ALL_LABEL);

  const filtered = activeFilter === ALL_LABEL ? pairs : pairs.filter((p) => p.concern === activeFilter);
  if (filtered.length === 0) return null;

  return (
    <div className="space-y-4 min-w-0">
      {/* Filter pills — one swipeable row */}
      {concerns.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-6 px-6 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {concerns.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActiveFilter(c)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                activeFilter === c
                  ? 'bg-primary text-white border-primary'
                  : 'border-gray-100 text-gray-500 hover:border-primary hover:text-primary'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <SwipeTray key={activeFilter} gridClass="sm:grid-cols-2" label={`${serviceName} before and after photos`}>
        {filtered.map((pair, i) => (
          <CompareSlider key={i} pair={pair} serviceName={serviceName} />
        ))}
      </SwipeTray>

      <p className="text-xs text-gray-500 text-center">Real patient results · Unretouched · Individual results may vary</p>
    </div>
  );
}
