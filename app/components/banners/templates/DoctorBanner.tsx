import { Check } from "lucide-react";
import type { BannerDoc } from "@/app/lib/banners/types";
import CTAButton from "@/app/components/banners/shared/CTAButton";
import ImageOverlay from "@/app/components/banners/shared/ImageOverlay";
import BannerHeroImage from "@/app/components/banners/shared/BannerHeroImage";

// Stores its own copy of the doctor's photo/name/title (not a live reference
// to a Doctor document) so a published banner survives independently of
// later edits/removal in the Doctors roster.
export default function DoctorBanner({ banner }: { banner: BannerDoc }) {
  return (
    <div className="relative bg-[#0B2560] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 grid md:grid-cols-2 gap-8 items-center py-12 sm:py-16 md:py-20">
        {banner.desktopImage?.url && (
          <div className="relative rounded-3xl overflow-hidden order-1">
            {/* 4:5 — a doctor portrait, not a generic hero scene, so it
                follows the site's Doctor ratio standard rather than 16:9. */}
            <BannerHeroImage
              desktopImage={banner.desktopImage}
              mobileImage={banner.mobileImage}
              alt={banner.headline || "Doctor"}
              aspectRatio="4/5"
            />
            <ImageOverlay overlay={banner.overlay} />
          </div>
        )}

        <div className="max-w-xl space-y-3 order-2">
          {banner.subtitle && (
            <span className="inline-flex items-center gap-1.5 text-[#F5A623] text-xs sm:text-sm font-bold uppercase tracking-widest">
              {banner.subtitle}
            </span>
          )}
          <h1 className="text-3xl sm:text-4xl font-headline font-extrabold text-white leading-tight">{banner.headline}</h1>
          {banner.description && <p className="text-white/70 text-base md:text-lg font-medium">{banner.description}</p>}

          {!!banner.achievements?.length && (
            <ul className="space-y-2 pt-1">
              {banner.achievements.map((a, i) => (
                <li key={i} className="flex items-center gap-2.5 text-white/90 font-medium">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-[#F5A623]/20 text-[#F5A623] flex items-center justify-center">
                    <Check size={13} strokeWidth={3} />
                  </span>
                  {a}
                </li>
              ))}
            </ul>
          )}

          <div className="pt-3">
            <CTAButton label={banner.primaryCTA?.label} href={banner.primaryCTA?.href} variant="primary" />
          </div>
        </div>
      </div>
    </div>
  );
}
