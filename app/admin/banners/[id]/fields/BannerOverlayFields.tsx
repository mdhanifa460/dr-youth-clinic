"use client";

import { Toggle } from "./shared";

export default function BannerOverlayFields({ banner, set }: { banner: any; set: (patch: Record<string, any>) => void }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
      <p className="text-sm font-bold text-gray-700">Overlay</p>
      <Toggle checked={!!banner.overlay?.enabled} onChange={(v) => set({ overlay: { ...banner.overlay, enabled: v } })} label="Enable dark/gradient overlay on the banner image" />
      {banner.overlay?.enabled && (
        <div className="grid grid-cols-2 gap-3 items-center">
          <select value={banner.overlay.style} onChange={(e) => set({ overlay: { ...banner.overlay, style: e.target.value } })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="dark">Dark</option>
            <option value="gradient">Gradient</option>
          </select>
          <input type="range" min={0} max={1} step={0.05} value={banner.overlay.opacity} onChange={(e) => set({ overlay: { ...banner.overlay, opacity: Number(e.target.value) } })} />
        </div>
      )}
    </div>
  );
}
