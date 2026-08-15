"use client";

import { Input, Textarea } from "./shared";

export default function BannerContentFields({ banner, set }: { banner: any; set: (patch: Record<string, any>) => void }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
      <p className="text-sm font-bold text-gray-700">Content</p>
      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">Admin Title (internal only)</label>
        <Input value={banner.title} onChange={(v) => set({ title: v })} />
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">Headline</label>
        <Textarea value={banner.headline} onChange={(v) => set({ headline: v })} rows={2} placeholder="Use \n for a line break" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Subtitle / Eyebrow</label>
          <Input value={banner.subtitle} onChange={(v) => set({ subtitle: v })} />
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">Description</label>
        <Textarea value={banner.description} onChange={(v) => set({ description: v })} rows={2} />
      </div>
    </div>
  );
}
