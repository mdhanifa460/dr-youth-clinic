import Image from "next/image";
import type { BannerDoc } from "@/app/lib/banners/types";
import CTAButton from "@/app/components/banners/shared/CTAButton";
import BeforeAfterSlider from "@/app/components/banners/shared/BeforeAfterSlider";
import ImageOverlay from "@/app/components/banners/shared/ImageOverlay";

// Headline/trust-message/CTA laid out around the compare-slider mechanics
// (BeforeAfterSlider, adapted from the existing app/components/SliderCard.tsx
// rather than a fork of the drag-compare math) — falls back to a single
// static image when beforeImage isn't set, same "hasImages" guard SliderCard
// already uses.
export default function BeforeAfterBanner({ banner }: { banner: BannerDoc }) {
  const hasPair = !!(banner.beforeImage?.url && banner.desktopImage?.url);

  return (
    <div className="relative bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 grid md:grid-cols-2 gap-8 md:gap-12 items-center py-12 sm:py-16 md:py-20">
        <div className="max-w-xl space-y-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-headline font-extrabold text-[#0B2560] leading-tight whitespace-pre-line">
            {banner.headline}
          </h1>
          {banner.description && <p className="text-gray-600 text-base md:text-lg leading-relaxed">{banner.description}</p>}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
            <CTAButton label={banner.primaryCTA?.label} href={banner.primaryCTA?.href} variant="primary" />
            <CTAButton label={banner.secondaryCTA?.label} href={banner.secondaryCTA?.href} variant="secondary" />
          </div>
        </div>

        <div>
          {hasPair ? (
            // Overlay is deliberately not applied here — it would sit on
            // top of the drag-to-compare divider/handle and obscure the
            // interaction it's meant to highlight.
            <BeforeAfterSlider before={banner.beforeImage.url} after={banner.desktopImage.url} title={banner.headline} />
          ) : banner.desktopImage?.url ? (
            <div className="rounded-3xl overflow-hidden shadow-[0_8px_34px_rgba(11,37,96,0.08)] border border-gray-100 relative h-[260px] sm:h-[320px]">
              <Image src={banner.desktopImage.url} alt={banner.headline || "Results"} fill sizes="(max-width: 768px) 100vw, 560px" className="object-cover" />
              <ImageOverlay overlay={banner.overlay} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
