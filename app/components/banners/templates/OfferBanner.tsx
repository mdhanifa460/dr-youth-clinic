import Image from "next/image";
import type { BannerDoc } from "@/app/lib/banners/types";
import CTAButton from "@/app/components/banners/shared/CTAButton";
import ImageOverlay from "@/app/components/banners/shared/ImageOverlay";

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

  return (
    <div className="relative bg-[#0B2560] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 grid md:grid-cols-2 gap-8 items-center py-12 sm:py-16 md:py-20">
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

        {banner.desktopImage?.url && (
          <div className="relative mx-auto md:mx-0">
            <div className="relative w-56 h-56 sm:w-72 sm:h-72 rounded-full overflow-hidden ring-4 ring-[#F5A623]/60 shadow-2xl">
              <Image
                src={banner.mobileImage?.url || banner.desktopImage.url}
                alt={banner.headline || "Offer"}
                fill
                sizes="(max-width: 640px) 224px, 288px"
                className="object-cover md:hidden"
              />
              <Image
                src={banner.desktopImage.url}
                alt={banner.headline || "Offer"}
                fill
                sizes="288px"
                className="object-cover hidden md:block"
              />
              <ImageOverlay overlay={banner.overlay} />
            </div>
          </div>
        )}
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
