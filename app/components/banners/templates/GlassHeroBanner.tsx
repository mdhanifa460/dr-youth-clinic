import Image from "next/image";
import dynamic from "next/dynamic";
import type { BannerDoc } from "@/app/lib/banners/types";
import { getHeroTheme } from "@/app/lib/banners/heroThemes";
import GlassCTAButton from "@/app/components/banners/shared/GlassCTAButton";
import { AnimatedStatRow } from "@/app/components/banners/shared/AnimatedStat";
import { ServiceChipRow } from "@/app/components/banners/shared/ServiceChipRow";
import { FloatingAssistantTeaser } from "@/app/components/banners/shared/FloatingAssistantTeaser";
import { HeroParticles } from "@/app/components/banners/shared/HeroParticles";

// Lazy, client-only — the entire lottie-web runtime only ships when a
// banner actually sets lottieUrl. A banner without one costs zero extra
// bytes/work, which is the whole point of keeping Lottie "optional" here.
const LottiePlayer = dynamic(() => import("@/app/components/banners/shared/LottiePlayer"), {
  ssr: false,
  loading: () => null,
});

// The premium glassmorphism hero — animated gradient + floating glass
// cards, replacing the image-right/text-left "traditional banner" layout
// every other hero template in this codebase uses. Deliberately does not
// share layout with PremiumHeroBanner.tsx; this is a different visual
// language, not a themed variant of the old one.
export default function GlassHeroBanner({ banner }: { banner: BannerDoc }) {
  const theme = getHeroTheme(banner.heroTheme);
  const doctor = banner.doctorHighlight?.doctorId;
  const lottieBg = banner.lottieUrl && banner.lottiePlacement === "background";
  const lottieInline = banner.lottieUrl && banner.lottiePlacement === "beside-heading";
  const lottieBadge = banner.lottieUrl && banner.lottiePlacement === "floating-badge";

  return (
    <section
      className="glass-hero relative overflow-hidden min-h-[calc(100svh-96px)] md:min-h-[85vh] flex items-center"
      style={theme.vars as React.CSSProperties}
    >
      {/* Optional hero image/video — full-bleed background, deliberately
          subdued (not a discrete "image card" like the traditional
          banners) so it reads as atmosphere behind the glass, not the
          focal point. The gradient renders on top at reduced opacity as a
          tint rather than being replaced by it. */}
      {banner.video?.url ? (
        <video
          src={banner.video.url}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-50"
          aria-hidden="true"
        />
      ) : banner.desktopImage?.url ? (
        <Image
          src={banner.desktopImage.url}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-40"
          aria-hidden="true"
        />
      ) : null}

      {/* Animated gradient background — CSS-only, see .glass-hero in globals.css */}
      <div className={`glass-hero-gradient absolute inset-0 ${(banner.video?.url || banner.desktopImage?.url) ? "opacity-80" : ""}`} aria-hidden="true" />

      {/* Soft glow orbs */}
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl opacity-70" style={{ background: "var(--hero-glow-a)" }} aria-hidden="true" />
      <div className="absolute -bottom-32 -right-16 w-96 h-96 rounded-full blur-3xl opacity-70" style={{ background: "var(--hero-glow-b)" }} aria-hidden="true" />

      {lottieBg && (
        <div className="absolute inset-0 opacity-40 pointer-events-none" aria-hidden="true">
          <LottiePlayer url={banner.lottieUrl} className="w-full h-full" />
        </div>
      )}

      <HeroParticles intensity={banner.motionIntensity} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-14 sm:py-16 md:py-20 w-full">
        <div
          className="glass-hero-card mx-auto max-w-3xl rounded-[28px] px-6 sm:px-10 md:px-14 py-10 sm:py-12 md:py-14 backdrop-blur-xl text-center"
          style={{ background: "var(--hero-glass-bg)", border: "1px solid var(--hero-glass-border)" }}
        >
          {banner.subtitle && (
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold tracking-wide mb-5"
              style={{ background: "var(--hero-accent)", color: "var(--hero-accent-text)" }}
            >
              {lottieInline && (
                <span className="w-4 h-4 inline-block" aria-hidden="true">
                  <LottiePlayer url={banner.lottieUrl} className="w-full h-full" />
                </span>
              )}
              {banner.subtitle}
            </span>
          )}

          <h1
            className="text-[2.1rem] sm:text-4xl md:text-5xl font-headline font-extrabold leading-[1.1] whitespace-pre-line mb-4"
            style={{ color: "var(--hero-text)" }}
          >
            {banner.headline}
          </h1>

          {banner.description && (
            <p className="text-base md:text-lg max-w-xl mx-auto mb-7" style={{ color: "var(--hero-text-muted)" }}>
              {banner.description}
            </p>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
            <GlassCTAButton label={banner.primaryCTA?.label} href={banner.primaryCTA?.href} variant="primary" />
            <GlassCTAButton label={banner.secondaryCTA?.label} href={banner.secondaryCTA?.href} variant="glass" />
            <GlassCTAButton label={banner.tertiaryCTA?.label} href={banner.tertiaryCTA?.href} variant="whatsapp" />
          </div>

          {banner.statBadges?.length > 0 && (
            <div className="mb-8 pt-6" style={{ borderTop: "1px solid var(--hero-glass-border)" }}>
              <AnimatedStatRow stats={banner.statBadges} />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2">
            <ServiceChipRow chips={banner.serviceChips} />
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
          <FloatingAssistantTeaser teaser={banner.assistantTeaser} />

          {doctor && (
            <div
              className="flex items-center gap-3 rounded-2xl px-4 py-3 backdrop-blur-md"
              style={{ background: "var(--hero-glass-bg)", border: "1px solid var(--hero-glass-border)" }}
            >
              {doctor.photo?.url ? (
                <Image src={doctor.photo.url} alt={doctor.name} width={40} height={40} className="rounded-full w-10 h-10 object-cover" />
              ) : (
                <span className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "var(--hero-accent)", color: "var(--hero-accent-text)" }}>
                  {doctor.name?.[0]}
                </span>
              )}
              <div className="text-left">
                <p className="text-sm font-semibold" style={{ color: "var(--hero-text)" }}>{doctor.name}</p>
                <p className="text-xs" style={{ color: "var(--hero-text-muted)" }}>
                  {banner.doctorHighlight.tagline || doctor.title}
                </p>
              </div>
            </div>
          )}
        </div>

        {lottieBadge && (
          <div className="absolute bottom-6 right-6 w-16 h-16 sm:w-20 sm:h-20" aria-hidden="true">
            <LottiePlayer url={banner.lottieUrl} className="w-full h-full" />
          </div>
        )}
      </div>
    </section>
  );
}
