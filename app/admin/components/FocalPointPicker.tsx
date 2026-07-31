'use client';

import { useState } from 'react';
import {
  FOCAL_POINT_PRESETS, focalPointToObjectPosition, type FocalPoint, type FocalPointMode,
} from '@/app/lib/media/focalPoint';

// Draws the "safe area" rectangle showing what the target aspect-ratio crop
// will actually capture, centered on the current focal point, overlaid on
// the full uncropped source image. Needs the image's natural dimensions
// (captured via onLoad in the parent) since the math differs depending on
// whether the target ratio is narrower or wider than the source.
function SafeAreaOverlay({
  naturalWidth, naturalHeight, aspectRatio, focalPoint,
}: {
  naturalWidth: number;
  naturalHeight: number;
  aspectRatio: string;
  focalPoint: FocalPoint;
}) {
  if (!naturalWidth || !naturalHeight) return null;
  const [rw, rh] = aspectRatio.split('/').map(Number);
  const containerAspect = naturalWidth / naturalHeight;
  const targetAspect = rw / rh;

  let widthPct: number;
  let heightPct: number;
  if (targetAspect < containerAspect) {
    heightPct = 100;
    widthPct = (targetAspect / containerAspect) * 100;
  } else {
    widthPct = 100;
    heightPct = (containerAspect / targetAspect) * 100;
  }

  const [posXStr, posYStr] = focalPointToObjectPosition(focalPoint).split(' ');
  const posX = parseFloat(posXStr);
  const posY = parseFloat(posYStr);

  const left = Math.max(0, Math.min(100 - widthPct, posX - widthPct / 2));
  const top = Math.max(0, Math.min(100 - heightPct, posY - heightPct / 2));

  return (
    <div
      className="absolute border-2 border-[#F5A623] bg-[#F5A623]/10 pointer-events-none rounded-sm"
      style={{ left: `${left}%`, top: `${top}%`, width: `${widthPct}%`, height: `${heightPct}%` }}
    />
  );
}

// Phase 1 of the focal-point system: preset buttons + click-to-set-manual +
// safe-area overlay + live crop preview. Freeform pan/zoom crop-rectangle
// editing (as opposed to a single focal point) is a deliberate fast-follow,
// not implemented here — a focal point plus per-component aspect ratio
// covers the "keep the face/treatment-area visible" requirement without the
// added complexity of a full crop-rectangle editor.
export default function FocalPointPicker({
  imageUrl,
  aspectRatio,
  value,
  onChange,
}: {
  imageUrl: string;
  aspectRatio: string;
  value?: FocalPoint;
  onChange: (fp: FocalPoint) => void;
}) {
  const focalPoint: FocalPoint = value ?? { mode: 'center' };
  const [natural, setNatural] = useState({ width: 0, height: 0 });

  const setPreset = (mode: FocalPointMode) => {
    if (mode === 'manual') {
      onChange({ mode: 'manual', x: focalPoint.x ?? 50, y: focalPoint.y ?? 50 });
    } else {
      onChange({ mode });
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    onChange({ mode: 'manual', x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  const [markerLeft, markerTop] = focalPointToObjectPosition(focalPoint).split(' ');

  if (!imageUrl) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {FOCAL_POINT_PRESETS.map((p) => (
          <button
            key={p.mode}
            type="button"
            onClick={() => setPreset(p.mode)}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
              focalPoint.mode === p.mode ? 'bg-[#0B2560] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {focalPoint.mode === 'manual' && (
        <p className="text-[10px] text-gray-400">Click anywhere on the image below to move the focal point.</p>
      )}

      <div className="grid sm:grid-cols-[2fr_1fr] gap-4">
        <div
          onClick={handleImageClick}
          className="relative rounded-xl overflow-hidden border border-gray-200 cursor-crosshair bg-gray-50"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- admin-only editor preview, not a public page asset */}
          <img
            src={imageUrl}
            alt=""
            className="block w-full h-auto select-none"
            draggable={false}
            onLoad={(e) => setNatural({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
          />
          <SafeAreaOverlay
            naturalWidth={natural.width}
            naturalHeight={natural.height}
            aspectRatio={aspectRatio}
            focalPoint={focalPoint}
          />
          <div
            className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full border-2 border-white bg-[#F5A623] shadow-lg pointer-events-none"
            style={{ left: markerLeft, top: markerTop }}
          />
        </div>

        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
            Preview at {aspectRatio}
          </p>
          <div className="relative rounded-xl overflow-hidden border border-gray-200" style={{ aspectRatio }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- admin-only editor preview */}
            <img
              src={imageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: focalPointToObjectPosition(focalPoint) }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
