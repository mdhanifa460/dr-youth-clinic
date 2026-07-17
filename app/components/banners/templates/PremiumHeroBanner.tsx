import Image from "next/image";
import type { BannerDoc } from "@/app/lib/banners/types";
import CTAButton from "@/app/components/banners/shared/CTAButton";
import TrustBadges from "@/app/components/banners/shared/TrustBadges";
import RatingStars from "@/app/components/banners/shared/RatingStars";
import { StatBadgeRow } from "@/app/components/banners/shared/StatBadge";
import ImageOverlay from "@/app/components/banners/shared/ImageOverlay";

// Structural reference: app/components/homepage/HeroSection.tsx's left/right
// grid — same two-column layout, but built from the shared CTAButton/
// TrustBadges/RatingStars/StatBadge components instead of inline JSX.
export default function PremiumHeroBanner({ banner }: { banner: BannerDoc }) {
  const image = banner.desktopImage;
  const mobileImage = banner.mobileImage?.url || banner.desktopImage?.url;

  return (
    <div className="relative bg-gradient-to-br from-[#f6faff] to-[#e8eff7] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 grid md:grid-cols-2 gap-7 md:gap-10 lg:gap-12 items-center py-10 sm:py-12 md:py-16 lg:py-20">
        <div className="max-w-xl space-y-4 sm:space-y-5 md:space-y-7">
          {banner.subtitle && (
            <span className="inline-flex min-h-9 items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#60A5D8]/20 text-[#0B2560] text-xs sm:text-sm font-semibold tracking-wide">
              {banner.subtitle}
            </span>
          )}

          <h1 className="text-[2.15rem] sm:text-[2.75rem] md:text-6xl font-headline font-extrabold text-[#0B2560] leading-[1.08] md:leading-tight whitespace-pre-line">
            {banner.headline}
          </h1>

          {banner.description && (
            <p className="text-gray-700 text-base md:text-lg leading-relaxed font-semibold max-w-lg">
              {banner.description}
            </p>
          )}

          {banner.rating?.enabled && <RatingStars value={banner.rating.value} reviewCount={banner.rating.reviewCount} />}

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-1">
            <CTAButton label={banner.primaryCTA?.label} href={banner.primaryCTA?.href} variant="primary" />
            <CTAButton label={banner.secondaryCTA?.label} href={banner.secondaryCTA?.href} variant="secondary" />
          </div>

          <StatBadgeRow stats={banner.statBadges} />
          <TrustBadges badges={banner.trustBadges} />
        </div>

        <div className="relative mt-2 md:mt-0">
          <div className="absolute -inset-4 bg-[#0B2560]/10 blur-3xl rounded-full" />
          <div className="relative bg-white p-3 sm:p-4 rounded-3xl shadow-[0_18px_50px_rgba(11,37,96,0.12)] ring-1 ring-white/80 overflow-hidden">
            {image?.url ? (
              <>
                <Image
                  src={image.url}
                  alt={banner.headline || "DR Youth Clinic"}
                  width={500}
                  height={500}
                  className="rounded-2xl w-full h-[260px] sm:h-[320px] md:h-[420px] object-cover hidden sm:block"
                  priority
                  sizes="(max-width: 768px) 100vw, 500px"
                />
                <Image
                  src={mobileImage}
                  alt={banner.headline || "DR Youth Clinic"}
                  width={500}
                  height={500}
                  className="rounded-2xl w-full h-[260px] object-cover sm:hidden"
                  priority
                  sizes="100vw"
                />
              </>
            ) : (
              <div className="rounded-2xl w-full h-[260px] sm:h-[320px] md:h-[420px] bg-gradient-to-br from-[#0B2560]/20 to-[#60A5D8]/20 flex items-center justify-center">
                <span className="text-5xl">🏥</span>
              </div>
            )}
            <ImageOverlay overlay={banner.overlay} />
          </div>
        </div>
      </div>
    </div>
  );
}
