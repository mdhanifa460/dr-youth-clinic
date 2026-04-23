"use client";

import { useState } from "react";
import Image from "next/image";

type Props = {
  before: string;
  after: string;
};

export default function BeforeAfterSlider({ before, after }: Props) {
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const updatePosition = (clientX: number, rect: DOMRect) => {
    const newPos = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.max(0, Math.min(100, newPos)));
  };

  const handleMove = (e: any) => {
    if (!isDragging) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX || e.touches?.[0]?.clientX;

    updatePosition(x, rect);
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden rounded-xl select-none"
      onMouseMove={handleMove}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
      onTouchMove={handleMove}
      onTouchEnd={() => setIsDragging(false)}
    >

      {/* AFTER IMAGE */}
      <Image
        src={after}
        alt="after"
        fill
        className="object-cover"
      />

      {/* BEFORE IMAGE */}
      <div
        className="absolute top-0 left-0 h-full overflow-hidden transition-all duration-75"
        style={{ width: `${position}%` }}
      >
        <Image
          src={before}
          alt="before"
          fill
          className="object-cover"
        />
      </div>

      {/* LABELS */}
      <span className="absolute top-3 left-3 bg-black/60 text-white text-xs px-3 py-1 rounded-full backdrop-blur">
        BEFORE
      </span>

      <span className="absolute top-3 right-3 bg-black/60 text-white text-xs px-3 py-1 rounded-full backdrop-blur">
        AFTER
      </span>

      {/* SLIDER LINE */}
      <div
        className="absolute top-0 h-full w-[2px] bg-white shadow-lg"
        style={{ left: `${position}%` }}
      />

      {/* HANDLE */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-8 h-8 bg-white border-2 border-primary rounded-full shadow-lg flex items-center justify-center cursor-ew-resize hover:scale-110 transition"
        style={{ left: `${position}%`, transform: "translate(-50%, -50%)" }}
        onMouseDown={() => setIsDragging(true)}
        onTouchStart={() => setIsDragging(true)}
      >
        <div className="w-1 h-4 bg-primary"></div>
      </div>

      {/* HOVER HINT */}
      {!isDragging && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs bg-black/50 text-white px-3 py-1 rounded-full backdrop-blur opacity-80">
          Drag →
        </div>
      )}

    </div>
  );
}