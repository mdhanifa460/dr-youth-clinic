"use client";

import type { BannerTemplateType } from "@/app/lib/banners/types";
import ImageUpload from "@/app/admin/components/ImageUpload";
import VideoUpload from "@/app/admin/components/VideoUpload";

export default function BannerMediaFields({ banner, set, templateType }: { banner: any; set: (patch: Record<string, any>) => void; templateType: BannerTemplateType }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
      <p className="text-sm font-bold text-gray-700">Media</p>
      <ImageUpload
        label={templateType === "glass-hero" ? "Background Image (optional — subtle, tinted behind the glass)" : "Desktop Image"}
        folder="dr-youth-clinic/banners"
        currentPublicId={banner.desktopImage?.publicId}
        onUpload={(img) => set({ desktopImage: img })}
      />
      {templateType !== "glass-hero" && (
        <ImageUpload label="Mobile Image (optional — falls back to desktop)" folder="dr-youth-clinic/banners" currentPublicId={banner.mobileImage?.publicId} onUpload={(img) => set({ mobileImage: img })} />
      )}
      {templateType === "before-after" && (
        <ImageUpload label="Before Image" folder="dr-youth-clinic/banners" currentPublicId={banner.beforeImage?.publicId} onUpload={(img) => set({ beforeImage: img })} />
      )}
      {(templateType === "clinic-experience" || templateType === "glass-hero") && (
        <VideoUpload label={templateType === "glass-hero" ? "Background Video (optional — overrides the background image above)" : "Video (optional)"} currentUrl={banner.video?.url} onUpload={(vid) => set({ video: vid })} />
      )}
    </div>
  );
}
