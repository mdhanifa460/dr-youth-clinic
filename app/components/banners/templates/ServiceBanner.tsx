import Image from "next/image";
import { Check } from "lucide-react";
import type { BannerDoc } from "@/app/lib/banners/types";
import CTAButton from "@/app/components/banners/shared/CTAButton";
import ImageOverlay from "@/app/components/banners/shared/ImageOverlay";

export default function ServiceBanner({ banner }: { banner: BannerDoc }) {
  return (
    <div className="relative bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 grid md:grid-cols-2 gap-8 md:gap-12 items-center py-12 sm:py-16 md:py-20">
        <div className="max-w-xl space-y-4">
          {banner.subtitle && (
            <span className="inline-flex items-center gap-1.5 text-[#F5A623] text-xs sm:text-sm font-bold uppercase tracking-widest">
              {banner.subtitle}
            </span>
          )}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-headline font-extrabold text-[#0B2560] leading-tight whitespace-pre-line">
            {banner.headline}
          </h1>
          {banner.description && <p className="text-gray-600 text-base md:text-lg leading-relaxed">{banner.description}</p>}

          {!!banner.benefits?.length && (
            <ul className="space-y-2">
              {banner.benefits.map((b, i) => (
                <li key={i} className="flex items-center gap-2.5 text-gray-700 font-medium">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                    <Check size={13} strokeWidth={3} />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
            <CTAButton label={banner.primaryCTA?.label} href={banner.primaryCTA?.href} variant="primary" />
            <CTAButton label={banner.secondaryCTA?.label} href={banner.secondaryCTA?.href} variant="secondary" />
          </div>
        </div>

        {banner.desktopImage?.url && (
          <div className="relative rounded-3xl overflow-hidden shadow-[0_18px_50px_rgba(11,37,96,0.12)] h-[260px] sm:h-[380px]">
            <Image src={banner.desktopImage.url} alt={banner.headline || "Service"} fill sizes="(max-width: 768px) 100vw, 560px" className="object-cover hidden sm:block" />
            <Image src={banner.mobileImage?.url || banner.desktopImage.url} alt={banner.headline || "Service"} fill sizes="100vw" className="object-cover sm:hidden" />
            <ImageOverlay overlay={banner.overlay} />
          </div>
        )}
      </div>
    </div>
  );
}
