"use client";

import Image from "next/image";
import { useBeforeAfterDrag } from "@/app/lib/useBeforeAfterDrag";

// Compare-slider mechanics shared with app/components/SliderCard.tsx and
// BeforeAfterGallery.tsx via app/lib/useBeforeAfterDrag.ts (same drag-to-
// compare math, clip-path divider, Before/After pill labels) — stripped of
// SliderCard's own title/description footer, since the banner template
// lays headline/description out separately alongside this slider rather
// than below it.
export default function BeforeAfterSlider({ before, after, title }: { before: string; after: string; title: string }) {
  const { pos, setPos, containerRef, dragHandlers } = useBeforeAfterDrag(50);

  return (
    <div
      ref={containerRef}
      className="relative h-[260px] sm:h-[360px] rounded-3xl overflow-hidden select-none touch-none shadow-[0_8px_34px_rgba(11,37,96,0.08)] border border-gray-100"
      {...dragHandlers}
    >
      <Image src={after} alt="After" fill sizes="(max-width: 768px) 100vw, 560px" className="object-cover" draggable={false} />
      <Image
        src={before}
        alt="Before"
        fill
        sizes="(max-width: 768px) 100vw, 560px"
        className="object-cover"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        draggable={false}
      />

      <div className="absolute inset-y-0 pointer-events-none" style={{ left: `${pos}%`, transform: "translateX(-50%)" }}>
        <div className="w-[1.5px] h-full bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.7)]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white border border-gray-200 shadow-[0_4px_20px_rgba(11,37,96,0.18)] flex items-center justify-center cursor-ew-resize">
          <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
            <path d="M1 5H15M1 5L4 2M1 5L4 8M15 5L12 2M15 5L12 8" stroke="#0B2560" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <span className="pointer-events-none absolute top-4 left-4 bg-white/80 backdrop-blur-md text-[#0B2560] text-[10px] font-bold tracking-[0.18em] uppercase px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
        Before
      </span>
      <span className="pointer-events-none absolute top-4 right-4 bg-[#F5A623]/90 backdrop-blur-md text-white text-[10px] font-bold tracking-[0.18em] uppercase px-3 py-1.5 rounded-full shadow-sm">
        After
      </span>

      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(pos)}
        onChange={(e) => setPos(Number(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
        style={{ margin: 0 }}
        aria-label={`Compare before and after for ${title}`}
      />
    </div>
  );
}
