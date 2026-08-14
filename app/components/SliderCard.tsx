'use client';

import Image from 'next/image';
import { cloudImgFocal } from '@/app/lib/cloudinary-url';
import { focalPointToObjectPosition } from '@/app/lib/media/focalPoint';
import { useBeforeAfterDrag } from '@/app/lib/useBeforeAfterDrag';

// 1:1 crop, both frames sharing the pair's one focal point (before/after
// must line up identically or the slider comparison is misleading), same
// mechanism as BeforeAfterGallery.tsx.
function focalSrc(img: { url: string; publicId?: string }, focalPoint?: any) {
  return img?.publicId
    ? cloudImgFocal(img.publicId, { w: 1000, h: 1000, focalPoint })
    : img?.url;
}

export default function SliderCard({ pair }: { pair: any }) {
  const { pos, setPos, containerRef, dragHandlers } = useBeforeAfterDrag(50);
  if (!pair) return null;
  const hasImages = !!(pair.before?.url && pair.after?.url);
  const objectPosition = focalPointToObjectPosition(pair.focalPoint);

  return (
    <div className="rounded-3xl overflow-hidden bg-white shadow-[0_8px_34px_rgba(11,37,96,0.08)] border border-[#EBE8E3] transition-all duration-300 hover:shadow-[0_16px_42px_rgba(11,37,96,0.12)]">

      {/* IMAGE AREA — 1:1, matches the site's Before/After ratio standard.
          Pointer handlers live on this container (not a stretched native
          range input) — a mousedown/touch anywhere starts the drag from
          that exact point, identically on desktop and mobile. See
          app/lib/useBeforeAfterDrag.ts for why the old approach only
          worked reliably on touch. */}
      <div
        ref={containerRef}
        className="relative aspect-square overflow-hidden select-none touch-none"
        {...(hasImages ? dragHandlers : {})}
        // Cards are sometimes wrapped in a Link to the result's detail
        // page — stop the click from bubbling to it, or dragging the
        // slider to compare would also navigate away on release.
        onClick={(e) => e.stopPropagation()}
      >
        {hasImages ? (
          <>
            <Image
              src={focalSrc(pair.after, pair.focalPoint)}
              alt="After"
              fill
              sizes="(max-width: 768px) 100vw, 672px"
              className="object-cover"
              style={{ objectPosition }}
              draggable={false}
            />
            <Image
              src={focalSrc(pair.before, pair.focalPoint)}
              alt="Before"
              fill
              sizes="(max-width: 768px) 100vw, 672px"
              className="object-cover"
              style={{ objectPosition, clipPath: `inset(0 ${100 - pos}% 0 0)` }}
              draggable={false}
            />

            {/* DIVIDER */}
            <div className="absolute inset-y-0 pointer-events-none" style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}>
              <div className="w-[1.5px] h-full bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.7)]" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white border border-[#E5E7EB] shadow-[0_4px_20px_rgba(11,37,96,0.18)] flex items-center justify-center cursor-ew-resize">
                <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
                  <path d="M1 5H15M1 5L4 2M1 5L4 8M15 5L12 2M15 5L12 8" stroke="#0B2560" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* LABELS */}
            <span className="pointer-events-none absolute top-4 left-4 bg-white/80 backdrop-blur-md text-[#0B2560] text-[10px] font-bold tracking-[0.18em] uppercase px-3 py-1.5 rounded-full border border-[#EBE8E3] shadow-sm">Before</span>
            <span className="pointer-events-none absolute top-4 right-4 bg-[#F5A623]/90 backdrop-blur-md text-white text-[10px] font-bold tracking-[0.18em] uppercase px-3 py-1.5 rounded-full shadow-sm">After</span>

            {/* Keyboard-accessible fallback only — drag itself is handled
                by the container's pointer handlers above, not this input's
                own native drag physics. pointer-events-none keeps mouse/
                touch going to the container; Tab-focus + arrow keys still
                reach this normally since that's keyboard navigation, not
                a pointer interaction. */}
            <input
              type="range" min={0} max={100} value={Math.round(pos)}
              onChange={(e) => setPos(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
              style={{ margin: 0 }}
              aria-label={`Compare before and after for ${pair.title}`}
            />
          </>
        ) : (
          <div className="h-full w-full flex">
            <div className="flex-1 bg-gradient-to-br from-[#F0EDE8] to-[#E8E4DE] flex items-center justify-center">
              <span className="text-xs font-semibold text-[#0B2560]/30 tracking-widest uppercase">Before</span>
            </div>
            <div className="w-[1.5px] bg-[#0B2560]/10 self-stretch" />
            <div className="flex-1 bg-gradient-to-br from-[#EBF3FF] to-[#DDE9FF] flex items-center justify-center">
              <span className="text-xs font-semibold text-[#3B82C4]/50 tracking-widest uppercase">After</span>
            </div>
          </div>
        )}
      </div>

      {/* TEXT */}
      <div className="px-5 sm:px-6 py-5">
        <h3 className="font-bold text-[#0B2560] text-base leading-snug">{pair.title}</h3>
        {pair.description && (
          <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">{pair.description}</p>
        )}
        {pair.category && (
          <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-[#f6faff] text-[#3B82C4] text-xs font-semibold">
            {pair.category}
          </span>
        )}
      </div>
    </div>
  );
}
