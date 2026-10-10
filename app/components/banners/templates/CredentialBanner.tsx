import { ShieldCheck } from "lucide-react";
import type { BannerDoc } from "@/app/lib/banners/types";
import CTAButton from "@/app/components/banners/shared/CTAButton";
import FocalImage from "@/app/components/media/FocalImage";

// Full-viewport "credential spotlight" — for a genuine accreditation,
// certification, or award, not a promotional offer. Dark navy background
// (not a photo) with a subtle dot-grid pattern, the real
// certificate/document image framed on one side, the claim + a short
// explanation on the other. Reuses the same generic headline/subtitle/
// description/desktopImage/primaryCTA every template already has — no new
// Banner schema fields, see types.ts's own comment on the "credential"
// template entry for why.
export default function CredentialBanner({ banner }: { banner: BannerDoc }) {
  return (
    <div className="relative min-h-[88vh] sm:min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-[#0B2560] via-[#0B2560] to-[#081b47]">
      {/* Decorative dot-grid — CSS-only, no image asset, same spirit as the
          "world map" texture full-screen credential banners typically use
          without copying any specific reference site's actual artwork. */}
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
        aria-hidden="true"
      />
      {/* Soft gold glow, bottom-right — echoes the brand accent without a
          literal photo background. */}
      <div
        className="absolute -bottom-32 -right-32 w-[480px] h-[480px] rounded-full bg-[#F5A623]/10 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-16 sm:py-20 grid md:grid-cols-2 gap-10 md:gap-14 items-center w-full">
        {/* Text column */}
        <div className="max-w-xl space-y-5 order-2 md:order-1 text-center md:text-left">
          {banner.subtitle && (
            <span className="inline-flex items-center gap-1.5 text-[#F5A623] text-xs sm:text-sm font-bold uppercase tracking-widest">
              <ShieldCheck size={15} className="shrink-0" />
              {banner.subtitle}
            </span>
          )}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-headline font-extrabold text-white leading-tight whitespace-pre-line">
            {banner.headline}
          </h1>
          {banner.description && (
            <p className="text-white/80 text-base md:text-lg leading-relaxed">{banner.description}</p>
          )}
          {(banner.primaryCTA?.label || banner.secondaryCTA?.label) && (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 justify-center md:justify-start">
              <CTAButton label={banner.primaryCTA?.label} href={banner.primaryCTA?.href} variant="primary" />
              {banner.secondaryCTA?.label && (
                <a
                  href={banner.secondaryCTA.href}
                  className="min-h-12 w-full sm:w-auto border border-white/30 text-white px-6 sm:px-8 py-3 rounded-xl font-semibold hover:bg-white/10 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center"
                >
                  {banner.secondaryCTA.label}
                </a>
              )}
            </div>
          )}
        </div>

        {/* Certificate column */}
        <div className="relative order-1 md:order-2 flex justify-center">
          <div className="relative w-full max-w-sm">
            {/* Gold frame edge — sits behind the card, peeking out, instead
                of a literal picture-frame border so it still reads cleanly
                at small sizes. */}
            <div className="absolute -inset-2.5 rounded-[28px] bg-gradient-to-br from-[#F5A623] to-[#A25607] opacity-70" aria-hidden="true" />
            <div className="relative rounded-3xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.35)] bg-white">
              <FocalImage
                image={banner.desktopImage}
                aspectRatio="4/5"
                sizes="(max-width: 768px) 90vw, 420px"
                alt={banner.headline || "Accreditation certificate"}
                fallbackEmoji="🏅"
              />
            </div>
            {/* Verified seal — purely decorative corner badge, no admin-
                entered text needed. */}
            <div className="absolute -bottom-4 -left-4 sm:-bottom-5 sm:-left-5 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#0B2560] border-4 border-white shadow-xl flex flex-col items-center justify-center text-white">
              <ShieldCheck size={20} className="text-[#F5A623]" />
              <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider mt-0.5">Verified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
