"use client";

import Image from "next/image";

// Before and After render as two separate, always-visible panes side by
// side — no drag-to-reveal comparison slider. Stripped of SliderCard's own
// title/description footer, since the banner template lays headline/
// description out separately alongside this comparison rather than below it.
export default function BeforeAfterSlider({ before, after, title }: { before: string; after: string; title: string }) {
  return (
    <div className="relative flex h-[260px] sm:h-[360px] rounded-3xl overflow-hidden shadow-[0_8px_34px_rgba(11,37,96,0.08)] border border-gray-100">
      <div className="relative flex-1 min-w-0">
        <Image src={before} alt={`${title} before`} fill sizes="(max-width: 768px) 50vw, 280px" className="object-cover" draggable={false} />
        <span className="pointer-events-none absolute top-4 left-4 bg-white/80 backdrop-blur-md text-[#0B2560] text-[10px] font-bold tracking-[0.18em] uppercase px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
          Before
        </span>
      </div>

      {/* Divider — static, purely visual separation between the two panes */}
      <div className="w-[1.5px] self-stretch shrink-0 bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.7)] z-10" />

      <div className="relative flex-1 min-w-0">
        <Image src={after} alt={`${title} after`} fill sizes="(max-width: 768px) 50vw, 280px" className="object-cover" draggable={false} />
        <span className="pointer-events-none absolute top-4 right-4 bg-[#F5A623]/90 backdrop-blur-md text-white text-[10px] font-bold tracking-[0.18em] uppercase px-3 py-1.5 rounded-full shadow-sm">
          After
        </span>
      </div>
    </div>
  );
}
