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
      {/* Filter pills — only shown if concerns exist */}
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

      {/* Gallery viewer */}
      <div className="relative rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
        <div className="grid grid-cols-2">
          <div className="relative aspect-square">
            <Image src={pair.before.url} alt={`${serviceName} before`} fill sizes="50vw" className="object-cover" />
            <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded">BEFORE</span>
          </div>
          <div className="relative aspect-square">
            <Image src={pair.after.url} alt={`${serviceName} after`} fill sizes="50vw" className="object-cover" />
            <span className="absolute bottom-2 left-2 bg-[#0B2560]/90 text-white text-[10px] font-bold px-2 py-0.5 rounded">AFTER</span>
          </div>
        </div>

        {/* Concern badge */}
        {pair.concern && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2">
            <span className="bg-white/90 backdrop-blur text-[#0B2560] text-[10px] font-bold px-3 py-1 rounded-full shadow">
              {pair.concern}
            </span>
          </div>
        )}

        {/* Navigation — only shown when multiple */}
        {filtered.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white transition"
            >
              <ChevronLeft size={15} className="text-[#0B2560]" />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white transition"
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
              className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-[#0B2560] w-5' : 'bg-gray-200'}`}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">Real patient results · Unretouched · Individual results may vary</p>
    </div>
  );
}
