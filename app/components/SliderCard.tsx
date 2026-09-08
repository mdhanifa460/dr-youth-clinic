'use client';

import Image from 'next/image';
import { cloudImgFocal } from '@/app/lib/cloudinary-url';
import { focalPointToObjectPosition } from '@/app/lib/media/focalPoint';

// 1:1 crop, both frames sharing the pair's one focal point (before/after
// must line up identically or the slider comparison is misleading), same
// mechanism as BeforeAfterGallery.tsx.
function focalSrc(img: { url: string; publicId?: string }, focalPoint?: any) {
  return img?.publicId
    ? cloudImgFocal(img.publicId, { w: 1000, h: 1000, focalPoint })
    : img?.url;
}

export default function SliderCard({ pair }: { pair: any }) {
  if (!pair) return null;
  const hasImages = !!(pair.before?.url && pair.after?.url);
  const objectPosition = focalPointToObjectPosition(pair.focalPoint);

  return (
    <div className="rounded-3xl overflow-hidden bg-white shadow-[0_8px_34px_rgba(11,37,96,0.08)] border border-[#EBE8E3] transition-all duration-300 hover:shadow-[0_16px_42px_rgba(11,37,96,0.12)]">

      {/* IMAGE AREA — 1:1, matches the site's Before/After ratio standard.
          Before and After are two separate, always-visible image panes
          side by side — no drag-to-reveal comparison slider. */}
      <div className="relative aspect-square overflow-hidden flex">
        {hasImages ? (
          <>
            <div className="relative flex-1 min-w-0">
              <Image
                src={focalSrc(pair.before, pair.focalPoint)}
                alt="Before"
                fill
                sizes="(max-width: 768px) 50vw, 336px"
                className="object-cover"
                style={{ objectPosition }}
                draggable={false}
              />
              <span className="pointer-events-none absolute top-4 left-4 bg-white/80 backdrop-blur-md text-[#0B2560] text-[10px] font-bold tracking-[0.18em] uppercase px-3 py-1.5 rounded-full border border-[#EBE8E3] shadow-sm">Before</span>
            </div>

            {/* DIVIDER — static, purely visual separation between the two panes */}
            <div className="w-[1.5px] self-stretch shrink-0 bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.7)] z-10" />

            <div className="relative flex-1 min-w-0">
              <Image
                src={focalSrc(pair.after, pair.focalPoint)}
                alt="After"
                fill
                sizes="(max-width: 768px) 50vw, 336px"
                className="object-cover"
                style={{ objectPosition }}
                draggable={false}
              />
              <span className="pointer-events-none absolute top-4 right-4 bg-[#F5A623]/90 backdrop-blur-md text-white text-[10px] font-bold tracking-[0.18em] uppercase px-3 py-1.5 rounded-full shadow-sm">After</span>
            </div>
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
