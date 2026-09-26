import Image from "next/image";
import type { BannerDoc } from "@/app/lib/banners/types";
import { cloudImgFocal } from "@/app/lib/cloudinary-url";
import { focalPointToObjectPosition } from "@/app/lib/media/focalPoint";

// Image-only "poster" banner — the designed creative (headline, price,
// offer copy all baked into the artwork, like a real ad banner) IS the
// banner, shown edge to edge in a rounded card with no text laid over it.
// The whole card is one link to primaryCTA.href when set. headline is used
// only as the image's alt text (and for screen readers/SEO).
//
// Mobile: a dedicated portrait image (4:5) when uploaded; otherwise the
// desktop artwork is shown whole at its own 21:8 ratio (never cropped —
// baked-in text would get cut off), so it stays fully readable.
const DESKTOP_RATIO = "21 / 8";
const MOBILE_RATIO = "4 / 5";

export default function PosterBanner({ banner }: { banner: BannerDoc }) {
  const desktop = banner.desktopImage;
  if (!desktop?.url) return null;
  const mobile = banner.mobileImage?.url ? banner.mobileImage : null;
  const alt = (banner.headline || banner.title || "Offer").replace(/\n/g, " ");
  const href = banner.primaryCTA?.href;
  const label = banner.primaryCTA?.label;

  const desktopSrc = desktop.publicId ? cloudImgFocal(desktop.publicId, { w: 1800, h: 686, focalPoint: desktop.focalPoint }) : desktop.url;
  const mobileSrc = mobile
    ? (mobile.publicId ? cloudImgFocal(mobile.publicId, { w: 900, h: 1125, focalPoint: mobile.focalPoint }) : mobile.url)
    : desktopSrc;

  const art = (
    <div className="relative overflow-hidden rounded-2xl md:rounded-3xl shadow-[0_10px_30px_rgba(11,37,96,0.14)] ring-1 ring-black/5 bg-[#0B2560]/5">
      <div className="relative hidden sm:block w-full" style={{ aspectRatio: DESKTOP_RATIO }}>
        <Image src={desktopSrc} alt={alt} fill sizes="(min-width:1280px) 1216px, 100vw" className="object-cover" style={{ objectPosition: focalPointToObjectPosition(desktop.focalPoint) }} priority />
      </div>
      <div className="relative sm:hidden w-full" style={{ aspectRatio: mobile ? MOBILE_RATIO : DESKTOP_RATIO }}>
        <Image src={mobileSrc} alt={alt} fill sizes="100vw" className={mobile ? "object-cover" : "object-contain"} style={{ objectPosition: focalPointToObjectPosition(mobile?.focalPoint) }} priority />
      </div>
      {label && href && (
        <span className="absolute bottom-3 right-3 sm:bottom-5 sm:right-5 bg-[#F5A623] text-[#0B2560] text-xs sm:text-sm font-bold px-4 py-2 rounded-full shadow-lg">
          {label} →
        </span>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 md:py-5">
      {href ? (
        <a href={href} aria-label={alt} className="block transition-transform duration-300 hover:-translate-y-0.5">{art}</a>
      ) : art}
    </div>
  );
}
