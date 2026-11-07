'use client';

import { Children, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Phone: a horizontal swipe carousel (one card plus a peek of the next, snap
// scrolling, "3 / 22" counter and arrows). From `sm` up the same children lay
// out as a normal grid, using the caller's `gridClass` (e.g. "sm:grid-cols-2").
// `bleed` lets the track run edge to edge on phones; it must undo the parent's
// side padding (e.g. "-mx-6 px-6 scroll-px-6" inside a px-6 container).
export default function SwipeTray({
  children,
  gridClass,
  bleed = '-mx-6 px-6 scroll-px-6',
  label,
}: {
  children: ReactNode;
  gridClass: string;
  bleed?: string;
  label: string;
}) {
  const items = Children.toArray(children);
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onScroll = () => {
      const card = el.firstElementChild as HTMLElement | null;
      if (!card) return;
      const step = card.offsetWidth + parseFloat(getComputedStyle(el).columnGap || '0');
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      setIndex(atEnd ? items.length - 1 : Math.round(el.scrollLeft / step));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [items.length]);

  const go = (to: number) => {
    const el = trackRef.current;
    const card = el?.children[Math.max(0, Math.min(items.length - 1, to))] as HTMLElement | undefined;
    if (!el || !card) return;
    el.scrollTo({ left: card.offsetLeft - el.offsetLeft - parseFloat(getComputedStyle(el).paddingLeft), behavior: 'smooth' });
  };

  return (
    <div className="min-w-0">
      <div
        ref={trackRef}
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
        className={`flex gap-4 overflow-x-auto snap-x snap-mandatory overscroll-x-contain pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${bleed} sm:mx-0 sm:px-0 sm:pb-0 sm:grid sm:gap-6 sm:overflow-visible ${gridClass}`}
      >
        {items.map((child, i) => (
          <div key={i} className="snap-start shrink-0 basis-[86%] min-w-0 sm:basis-auto">
            {child}
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <div className="sm:hidden mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="Previous"
            className="w-10 h-10 rounded-full bg-white border border-[#EBE8E3] shadow-sm flex items-center justify-center text-primary disabled:opacity-40"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1 flex flex-col items-center gap-1.5" aria-live="polite">
            <span className="text-xs font-semibold text-primary tabular-nums">
              {index + 1} / {items.length}
            </span>
            <span className="block h-1 w-28 rounded-full bg-primary/10 overflow-hidden">
              <span
                className="block h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${((index + 1) / items.length) * 100}%` }}
              />
            </span>
          </div>
          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={index === items.length - 1}
            aria-label="Next"
            className="w-10 h-10 rounded-full bg-white border border-[#EBE8E3] shadow-sm flex items-center justify-center text-primary disabled:opacity-40"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
