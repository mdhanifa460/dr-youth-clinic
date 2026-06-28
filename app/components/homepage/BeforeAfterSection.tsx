'use client';

import { useState } from 'react';
import Image from 'next/image';

// ── Single drag-reveal slider card ──────────────────────────────────────────
function SliderCard({ pair }: { pair: any }) {
  const [pos, setPos] = useState(50); // 0–100, % of "before" visible
  const hasImages = !!(pair.before?.url && pair.after?.url);

  return (
    <div className="rounded-[2rem] overflow-hidden bg-white shadow-[0_4px_40px_rgba(11,37,96,0.07)] border border-[#EBE8E3]">

      {/* ── SLIDER IMAGE AREA ── */}
      <div className="relative overflow-hidden select-none" style={{ height: 280 }}>
        {hasImages ? (
          <>
            {/* AFTER — base layer, always full width */}
            <Image
              src={pair.after.url}
              alt="After"
              fill
              className="object-cover"
              draggable={false}
            />

            {/* BEFORE — same size, clipped by clip-path so it sits correctly */}
            <Image
              src={pair.before.url}
              alt="Before"
              fill
              className="object-cover"
              style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
              draggable={false}
            />

            {/* DIVIDER LINE */}
            <div
              className="absolute inset-y-0 pointer-events-none"
              style={{ left: `${pos}%`, transform: 'translateX(-50%)' }}
            >
              <div className="w-[1.5px] h-full bg-white/90 shadow-[0_0_10px_rgba(255,255,255,0.7)]" />

              {/* HANDLE */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white border border-[#E5E7EB] shadow-[0_4px_20px_rgba(11,37,96,0.18)] flex items-center justify-center cursor-ew-resize">
                <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
                  <path d="M1 5H15M1 5L4 2M1 5L4 8M15 5L12 2M15 5L12 8" stroke="#0B2560" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            {/* LABELS */}
            <span className="pointer-events-none absolute top-4 left-4 bg-white/80 backdrop-blur-md text-[#0B2560] text-[10px] font-bold tracking-[0.18em] uppercase px-3 py-1.5 rounded-full border border-[#EBE8E3] shadow-sm">
              Before
            </span>
            <span className="pointer-events-none absolute top-4 right-4 bg-[#F5A623]/90 backdrop-blur-md text-white text-[10px] font-bold tracking-[0.18em] uppercase px-3 py-1.5 rounded-full shadow-sm">
              After
            </span>

            {/* Range input overlay — drives the drag */}
            <input
              type="range"
              min={0}
              max={100}
              value={pos}
              onChange={(e) => setPos(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10"
              style={{ margin: 0 }}
            />
          </>
        ) : (
          /* Placeholder */
          <div className="h-full flex flex-col items-center justify-center bg-[#F5F3F0] gap-3">
            <div className="relative h-full w-full flex">
              <div className="flex-1 bg-gradient-to-br from-[#F0EDE8] to-[#E8E4DE] flex items-center justify-center">
                <span className="text-xs font-semibold text-[#0B2560]/30 tracking-widest uppercase">Before</span>
              </div>
              <div className="w-[1.5px] bg-[#0B2560]/10 self-stretch" />
              <div className="flex-1 bg-gradient-to-br from-[#EBF3FF] to-[#DDE9FF] flex items-center justify-center">
                <span className="text-xs font-semibold text-[#3B82C4]/50 tracking-widest uppercase">After</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── TEXT ── */}
      <div className="px-7 py-6">
        <h3 className="font-bold text-[#0B2560] text-base">{pair.title}</h3>
        <p className="text-gray-400 text-sm mt-1.5 leading-relaxed">{pair.description}</p>
      </div>
    </div>
  );
}

// ── Main section ─────────────────────────────────────────────────────────────
export default function BeforeAfterSection({ data }: { data: any }) {
  const {
    headline = 'Real Results, Real Confidence',
    subheadline = 'Visible improvements that our patients are thrilled about. See the difference.',
    pairs = [],
  } = data || {};

  const displayPairs = pairs.length > 0 ? pairs : [
    { title: 'Acne Therapy & Scar Solution', description: 'Treatments that smooth, clarify & restore natural skin texture.' },
    { title: 'Hairfall & Scalp Restoration', description: 'Targeted care for stronger, healthier hair & nourished roots.' },
  ];

  return (
    <section id="results" className="py-28 bg-[#F5F1EC] relative overflow-hidden">

      {/* subtle warm ambient */}
      <div className="pointer-events-none absolute top-0 left-0 w-[400px] h-[400px] rounded-full bg-[#F5A623]/5 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-[360px] h-[360px] rounded-full bg-[#0B2560]/4 blur-[100px]" />

      <div className="max-w-7xl mx-auto px-6 md:px-10 relative">

        {/* ── HEADER ── */}
        <div className="grid md:grid-cols-2 gap-10 items-end mb-14">
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-6 h-[2px] bg-[#F5A623]" />
              <span className="text-[#F5A623] text-xs font-bold tracking-[0.22em] uppercase">
                Patient Results
              </span>
            </div>
            <h2 className="text-4xl md:text-[2.75rem] font-headline font-extrabold text-[#0B2560] leading-[1.1]">
              {headline}
            </h2>
            <p className="text-[#6B7280] mt-5 text-sm leading-relaxed max-w-sm">
              {subheadline}
            </p>
          </div>

          {/* STATS */}
          <div className="flex items-center gap-8 flex-wrap md:justify-end">
            {[
              { value: '98%', label: 'Patient satisfaction' },
              { value: '10K+', label: 'Treatments done' },
              { value: '22+', label: 'Years of care' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl font-headline font-extrabold text-[#0B2560]">{s.value}</p>
                <p className="text-[#9CA3AF] text-xs mt-1 font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* DRAG HINT */}
        <div className="mb-8">
          <span className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-[#EBE8E3] rounded-full px-4 py-2 text-xs text-[#9CA3AF] font-medium shadow-sm">
            <svg width="15" height="10" viewBox="0 0 15 10" fill="none">
              <path d="M1 5H14M1 5L3.5 2.5M1 5L3.5 7.5M14 5L11.5 2.5M14 5L11.5 7.5" stroke="#9CA3AF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Drag the slider to compare
          </span>
        </div>

        {/* SLIDER CARDS */}
        <div className={`grid gap-5 ${displayPairs.length === 1 ? 'max-w-xl' : 'sm:grid-cols-2'}`}>
          {displayPairs.map((pair: any, i: number) => (
            <SliderCard key={i} pair={pair} />
          ))}
        </div>

        {/* CATEGORY PILLS */}
        <div className="flex flex-wrap gap-2.5 mt-10">
          {['All Results', 'Skin Care', 'Hair Restoration', 'Laser Treatments', 'Acne & Scars'].map((tag, i) => (
            <button
              key={i}
              className={`px-5 py-2 rounded-full text-xs font-semibold tracking-wide transition ${
                i === 0
                  ? 'bg-[#0B2560] text-white shadow-[0_4px_14px_rgba(11,37,96,0.2)]'
                  : 'bg-white text-[#9CA3AF] border border-[#EBE8E3] hover:border-[#0B2560]/30 hover:text-[#0B2560] hover:bg-[#f5f8ff]'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

      </div>
    </section>
  );
}
