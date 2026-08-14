'use client';

import { useCallback, useRef, useState } from 'react';

// Shared drag-to-compare mechanic for every before/after slider in this
// codebase (SliderCard.tsx, banners/shared/BeforeAfterSlider.tsx,
// BeforeAfterGallery.tsx all duplicated their own copy of this before).
//
// Previously each one stretched a native <input type="range"> across the
// whole image area with opacity-0 and relied on the browser's own range-
// thumb drag physics. That's why it "worked on mobile, not desktop": touch
// events on a stretched range input map to the tapped X position anywhere
// in the box, but a desktop mouse drag on a native range track only picks
// up smoothly once the cursor is already near the (invisible) thumb — so
// starting a drag from an arbitrary point on the image did nothing on
// desktop while behaving fine on mobile.
//
// This uses the Pointer Events API directly instead (unifies mouse/touch/
// pen in one model) with setPointerCapture, so a mousedown/touchstart
// anywhere in the container immediately starts tracking the drag from
// that exact point, on every input type identically.
export function useBeforeAfterDrag(initial = 50) {
  const [pos, setPos] = useState(initial);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(100, Math.max(0, pct)));
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    updateFromClientX(e.clientX);
    // Keeps receiving pointermove even if the cursor briefly leaves the
    // container during a fast drag — without this, a quick mouse movement
    // can outrun the element's own bounds and the drag silently stops.
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }, [updateFromClientX]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    updateFromClientX(e.clientX);
  }, [updateFromClientX]);

  const endDrag = useCallback(() => {
    draggingRef.current = false;
  }, []);

  return {
    pos,
    setPos,
    containerRef,
    dragHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}
