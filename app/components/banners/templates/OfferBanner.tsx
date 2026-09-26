import type { BannerDoc } from "@/app/lib/banners/types";
import CTAButton from "@/app/components/banners/shared/CTAButton";
import ImageOverlay from "@/app/components/banners/shared/ImageOverlay";
import BannerHeroImage from "@/app/components/banners/shared/BannerHeroImage";

function formatValidity(endDate: string | null): string {
  if (!endDate) return "";
  const d = new Date(endDate);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

// Dark navy offer banner. Validity is rendered as a static formatted string
// ("Offer valid till {date}"), not a live client-side countdown — these
// pages are server components, and no countdown timer exists elsewhere in
// this codebase to justify the client/server-boundary complexity for v1.
export default function OfferBanner({ banner }: { banner: BannerDoc }) {
  const validity = formatValidity(banner.endDate);
  const hasImage = !!banner.desktopImage?.url;

  return (
    <div className="relative bg-[#0B2560] overflow-hidden">
      {/* Image is a real full-bleed banner photo, not a thumbnail: on mobile
          it heads the banner edge to edge and fades into the navy below; on
          md+ it fills the right ~55% of the banner and fades in from the
          left so the copy sits on solid navy. */}
      {hasImage && (
        <>
          <div className="relative md:hidden">
            <BannerHeroImage
              desktopImage={banner.desktopImage}
              mobileImage={banner.mobileImage}
              alt={banner.headline || "Offer"}
              aspectRatio="4/3"
              className="w-full"
            />
            <ImageOverlay overlay={banner.overlay} />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0B2560] to-transparent" />
          </div>
          <div className="hidden md:block absolute inset-y-0 right-0 w-[58%]">
            <BannerHeroImage
              desktopImage={banner.desktopImage}
              mobileImage={banner.desktopImage}
              alt={banner.headline || "Offer"}
              aspectRatio="16/9"
              className="!aspect-auto w-full h-full"
              priority
            />
            <ImageOverlay overlay={banner.overlay} />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0B2560] via-[#0B2560]/50 to-transparent" />
          </div>
        </>
      )}

      <div className={`relative max-w-7xl mx-auto px-4 md:px-6 lg:px-8 ${hasImage ? "pb-10 -mt-6 md:mt-0 md:py-20 lg:py-24" : "py-12 sm:py-16 md:py-20"}`}>
        <div className="max-w-xl space-y-4">
          {banner.subtitle && (
            <span className="inline-flex items-center gap-1.5 text-[#F5A623] text-xs sm:text-sm font-bold uppercase tracking-widest">
              {banner.subtitle}
            </span>
          )}

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-headline font-extrabold text-white leading-tight whitespace-pre-line">
            {banner.headline}
          </h1>

          {banner.description && <p className="text-white/70 text-base md:text-lg leading-relaxed">{banner.description}</p>}

          {validity && (
            <p className="flex items-center gap-2 text-white/60 text-sm">
              <span>⏰</span> Valid till {validity}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
            <CTAButton label={banner.primaryCTA?.label} href={banner.primaryCTA?.href} variant="primary" />
            {banner.secondaryCTA?.label && (
              <SecondaryDarkCTA label={banner.secondaryCTA.label} href={banner.secondaryCTA.href} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Kept local — the primary CTAButton's "outline" variant uses a light
// background/border that reads invisible against this template's dark navy
// section, so the offer banner needs its own light-on-dark secondary style
// rather than reusing CTAButton's secondary variant as-is.
function SecondaryDarkCTA({ label, href }: { label: string; href: string }) {
  if (!label || !href) return null;
  return (
    <a
      href={href}
      className="min-h-12 w-full sm:w-auto border border-white/30 text-white px-6 sm:px-8 py-3 rounded-xl font-semibold hover:bg-white/10 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center"
    >
      {label}
    </a>
  );
}
