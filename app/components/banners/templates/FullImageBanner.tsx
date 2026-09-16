import Image from "next/image";
import type { BannerDoc } from "@/app/lib/banners/types";
import { cloudImgFocal } from "@/app/lib/cloudinary-url";
import { focalPointToObjectPosition } from "@/app/lib/media/focalPoint";
import CTAButton from "@/app/components/banners/shared/CTAButton";
import ImageOverlay from "@/app/components/banners/shared/ImageOverlay";

// Full-bleed background image with a text overlay — every other template
// but "before-after" splits into text-left/image-right or a small circular
// image (see OfferBanner.tsx); this one reads as one full photo with the
// headline/CTA laid over it, for an offer or promotion where the image
// itself is the whole message.
//
// Renders the image directly (not via BannerHeroImage) — that shared
// component's wrapper is sized by a fixed CSS aspect-ratio, but this
// template's height comes from the outer section's own min-height instead,
// so the image needs to be a plain `fill` layer, not ratio-constrained.
export default function FullImageBanner({ banner }: { banner: BannerDoc }) {
  const desktop = banner.desktopImage;
  const mobile = banner.mobileImage?.url ? banner.mobileImage : desktop;

  return (
    <div className="relative min-h-[360px] sm:min-h-[440px] overflow-hidden bg-[#0B2560]">
      {desktop?.url && (
        <>
          <Image
            src={desktop.publicId ? cloudImgFocal(desktop.publicId, { w: 1600, h: 900, focalPoint: desktop.focalPoint }) : desktop.url}
            alt={banner.headline || "Offer"}
            fill
            sizes="100vw"
            className="object-cover hidden sm:block"
            style={{ objectPosition: focalPointToObjectPosition(desktop.focalPoint) }}
            priority
          />
          <Image
            src={mobile?.publicId ? cloudImgFocal(mobile.publicId, { w: 900, h: 1200, focalPoint: mobile.focalPoint }) : (mobile?.url || desktop.url)}
            alt={banner.headline || "Offer"}
            fill
            sizes="100vw"
            className="object-cover sm:hidden"
            style={{ objectPosition: focalPointToObjectPosition(mobile?.focalPoint) }}
            priority
          />
        </>
      )}
      <ImageOverlay overlay={banner.overlay?.enabled ? banner.overlay : { enabled: true, style: "gradient", opacity: 0.55 }} />

      <div className="relative max-w-3xl mx-auto px-6 md:px-10 py-16 sm:py-20 flex flex-col items-center text-center gap-4">
        {banner.subtitle && (
          <span className="inline-flex items-center gap-1.5 text-[#F5A623] text-xs sm:text-sm font-bold uppercase tracking-widest">
            {banner.subtitle}
          </span>
        )}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-headline font-extrabold text-white leading-tight whitespace-pre-line drop-shadow-sm">
          {banner.headline}
        </h1>
        {banner.description && (
          <p className="text-white/85 text-base md:text-lg leading-relaxed max-w-xl">{banner.description}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
          <CTAButton label={banner.primaryCTA?.label} href={banner.primaryCTA?.href} variant="primary" />
          {banner.secondaryCTA?.label && (
            <a
              href={banner.secondaryCTA.href}
              className="min-h-12 w-full sm:w-auto border border-white/40 text-white px-6 sm:px-8 py-3 rounded-xl font-semibold hover:bg-white/10 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center"
            >
              {banner.secondaryCTA.label}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
