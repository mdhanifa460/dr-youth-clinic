"use client";

import type { BannerTemplateType } from "@/app/lib/banners/types";
import { CTAFields } from "./shared";

export default function BannerCTASection({ banner, set, templateType }: { banner: any; set: (patch: Record<string, any>) => void; templateType: BannerTemplateType }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
      <p className="text-sm font-bold text-gray-700">Call to Action</p>
      <CTAFields label={templateType === "glass-hero" ? "Primary CTA (e.g. Book Consultation)" : "Primary CTA"} cta={banner.primaryCTA} onChange={(v) => set({ primaryCTA: v })} />
      <CTAFields label={templateType === "glass-hero" ? "Secondary CTA (e.g. Free AI Assessment)" : "Secondary CTA (optional)"} cta={banner.secondaryCTA} onChange={(v) => set({ secondaryCTA: v })} />
      {templateType === "glass-hero" && (
        <CTAFields label="Tertiary CTA (e.g. WhatsApp Expert)" cta={banner.tertiaryCTA} onChange={(v) => set({ tertiaryCTA: v })} />
      )}
    </div>
  );
}
