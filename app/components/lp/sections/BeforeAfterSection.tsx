'use client';

import { useState, useRef, useCallback } from 'react';

interface BeforeAfterPair {
  label?: string;
  before?: { url?: string };
  after?: { url?: string };
}

interface BeforeAfterData {
  headline?: string;
  disclaimer?: string;
  pairs?: BeforeAfterPair[];
}

function SliderPair({ pair }: { pair: BeforeAfterPair }) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const pct = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100));
    setPosition(pct);
  }, []);

  const onMouseDown = () => { isDragging.current = true; };
  const onMouseMove = (e: React.MouseEvent) => { if (isDragging.current) updatePosition(e.clientX); };
  const onMouseUp = () => { isDragging.current = false; };
  const onTouchMove = (e: React.TouchEvent) => { updatePosition(e.touches[0].clientX); };

  return (
    <div
      ref={containerRef}
      className="relative aspect-[3/4] rounded-2xl overflow-hidden select-none cursor-col-resize shadow-xl"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchMove={onTouchMove}
    >
      {/* After image (full bg) */}
      <img
        src={pair.after!.url}
        alt="After"
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />

      {/* Before image (clipped to left portion) */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img
          src={pair.before!.url}
          alt="Before"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      </div>

      {/* Slider handle */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-2xl flex items-center justify-center border-2 border-[#0B2560]">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M6 9L2 5M6 9L2 13M12 9L16 5M12 9L16 13" stroke="#0B2560" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <span className="absolute top-3 left-3 bg-black/60 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-sm pointer-events-none">
        BEFORE
      </span>
      <span className="absolute top-3 right-3 bg-[#0B2560]/80 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg backdrop-blur-sm pointer-events-none">
        AFTER
      </span>

      {/* Treatment badge */}
      {pair.label && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm text-[#0B2560] text-xs font-bold px-3 py-1.5 rounded-full shadow whitespace-nowrap pointer-events-none">
          {pair.label}
        </div>
      )}
    </div>
  );
}

export default function BeforeAfterSection({ data }: { data: BeforeAfterData }) {
  const {
    headline = 'Real Results',
    disclaimer = 'Individual results may vary. Photos are from actual DR Youth Clinic patients.',
    pairs = [],
  } = data;
  const [activePairIdx, setActivePairIdx] = useState(0);
  const activePairs = pairs.filter((p) => p.before?.url && p.after?.url);

  if (!activePairs.length) return null;

  const activePair = activePairs[activePairIdx] ?? activePairs[0];

  return (
    <section className="bg-[#f6faff] py-14 md:py-20">
      <div className="max-w-5xl mx-auto px-5">
        <div className="text-center mb-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#3B82C4] mb-3">
            Transformations
          </p>
          <h2 className="text-2xl md:text-4xl font-extrabold text-[#0B2560]">{headline}</h2>
          <p className="text-sm text-gray-500 mt-3">Drag the slider left or right to reveal the transformation</p>
        </div>

        <div className="max-w-xs sm:max-w-sm md:max-w-md mx-auto">
          <SliderPair key={activePairIdx} pair={activePair} />
        </div>

        {/* Pair selector */}
        {activePairs.length > 1 && (
          <div className="flex justify-center gap-3 mt-7 flex-wrap">
            {activePairs.map((pair, i) => (
              <button
                key={i}
                onClick={() => setActivePairIdx(i)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  i === activePairIdx
                    ? 'bg-[#0B2560] text-white shadow-md'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-[#0B2560]/40'
                }`}
              >
                {pair.label || `Case ${i + 1}`}
              </button>
            ))}
          </div>
        )}

        {disclaimer && (
          <p className="text-center text-xs text-gray-400 mt-8">*{disclaimer}</p>
        )}
      </div>
    </section>
  );
}
