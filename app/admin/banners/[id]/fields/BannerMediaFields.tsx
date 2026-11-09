"use client";

import type { BannerTemplateType } from "@/app/lib/banners/types";
import ImageUpload from "@/app/admin/components/ImageUpload";
import VideoUpload from "@/app/admin/components/VideoUpload";

export default function BannerMediaFields({ banner, set, templateType }: { banner: any; set: (patch: Record<string, any>) => void; templateType: BannerTemplateType }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
      <p className="text-sm font-bold text-gray-700">Media</p>
      <ImageUpload
        label={templateType === "spotlight" ? "Background image (optional — shown under a dark theme-coloured veil; also the still frame for the video)" : templateType === "glass-hero" ? "Background Image (optional — subtle, tinted behind the glass)" : templateType === "poster" ? "Poster artwork — desktop (wide, ~21:8, e.g. 2100×800)" : templateType === "credential" ? "Certificate / Accreditation Document Photo (portrait, ~4:5 — a real photo of the real document)" : "Desktop Image"}
        folder="dr-youth-clinic/banners"
        currentPublicId={banner.desktopImage?.publicId}
        onUpload={(img) => set({ desktopImage: img })}
      />
      {templateType !== "glass-hero" && (
        <ImageUpload label={templateType === "poster" ? "Poster artwork — mobile (portrait 4:5, e.g. 1080×1350; optional — desktop shown whole if empty)" : "Mobile Image (optional — falls back to desktop)"} folder="dr-youth-clinic/banners" currentPublicId={banner.mobileImage?.publicId} onUpload={(img) => set({ mobileImage: img })} />
      )}
      {templateType === "before-after" && (
        <ImageUpload label="Before Image" folder="dr-youth-clinic/banners" currentPublicId={banner.beforeImage?.publicId} onUpload={(img) => set({ beforeImage: img })} />
      )}
      {(templateType === "clinic-experience" || templateType === "glass-hero" || templateType === "spotlight") && (
        <VideoUpload label={templateType === "spotlight" ? "Background video (optional — plays muted on a loop once the section is on screen; visitors on reduced motion or data saver see the image instead)" : templateType === "glass-hero" ? "Background Video (optional — overrides the background image above)" : "Video (optional)"} currentUrl={banner.video?.url} onUpload={(vid) => set({ video: vid })} />
      )}
    </div>
  );
}
