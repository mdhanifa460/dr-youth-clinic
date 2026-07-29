import Image from "next/image";
import type { BannerDoc } from "@/app/lib/banners/types";
import { resolveExperience, getAnimationDurations } from "@/app/lib/banners/experienceEngine";
import GlassCTAButton from "@/app/components/banners/shared/GlassCTAButton";
import { AnimatedStatRow } from "@/app/components/banners/shared/AnimatedStat";
import { ServiceChipRow } from "@/app/components/banners/shared/ServiceChipRow";
import { FloatingAssistantTeaser } from "@/app/components/banners/shared/FloatingAssistantTeaser";
import { HeroParticles } from "@/app/components/banners/shared/HeroParticles";
import { ParallaxBackground, ScrollFadeCard } from "@/app/components/banners/shared/ScrollMotion";
// Plain import — safe now because LottiePlayer.tsx itself has no static
// import of "lottie-react" at module scope (see that file's comment for
// why: three different code-splitting strategies at THIS boundary all
// still eagerly shipped lottie-web regardless). This component's own
// chunk is now tiny; the heavy dependency only loads via a runtime
// import() inside LottiePlayer's effect, when it actually mounts.
import LottiePlayer from "@/app/components/banners/shared/LottiePlayer";
// Same runtime-import discipline as LottiePlayer, documented in that
// file's own comment — RivePlayer.tsx replicates it exactly for
// "@rive-app/react-canvas" (Phase 3 of the Experience Engine).
import RivePlayer from "@/app/components/banners/shared/RivePlayer";

// Literal, complete Tailwind class strings (never string-concatenated) so
// the JIT content scanner can find them — see the note on GLOW_OPACITY
// below for why this matters.
const GLASS_BLUR_CLASS: Record<string, string> = {
  none: "",
  md: "backdrop-blur-md",
  xl: "backdrop-blur-xl",
};

// Tailwind only ships classes it finds as complete literal strings in
// source, so this must be a lookup of whole class names, never
// `opacity-${n}` built at runtime.
const GLOW_OPACITY_CLASS: Record<string, string> = {
  soft: "opacity-40",
  strong: "opacity-90",
};

const ENTRANCE_CLASS: Record<string, string> = {
  none: "",
  fade: "glass-hero-entrance-fade",
  "fade-rise": "glass-hero-entrance-fade-rise",
};

// The premium glassmorphism hero — animated gradient + floating glass
// cards, replacing the image-right/text-left "traditional banner" layout
// every other hero template in this codebase uses. Deliberately does not
// share layout with PremiumHeroBanner.tsx; this is a different visual
// language, not a themed variant of the old one.
export default function GlassHeroBanner({ banner }: { banner: BannerDoc }) {
  const experience = resolveExperience(banner);
  const durations = getAnimationDurations(experience.animationSpeed);
  const doctor = banner.doctorHighlight?.doctorId;
  const lottieBg = banner.lottieUrl && banner.lottiePlacement === "background";
  const lottieInline = banner.lottieUrl && banner.lottiePlacement === "beside-heading";
  const lottieBadge = banner.lottieUrl && banner.lottiePlacement === "floating-badge";
  const riveBg = banner.riveUrl && banner.rivePlacement === "background";
  const riveInline = banner.riveUrl && banner.rivePlacement === "beside-heading";
  const riveBadge = banner.riveUrl && banner.rivePlacement === "floating-badge";

  const hasBackground = !!(banner.video?.url || banner.desktopImage?.url);
  const background = banner.video?.url ? (
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
  ) : null;

  const glowClass = GLOW_OPACITY_CLASS[experience.glowIntensity] || "";
  const glowAnimClass = experience.idleAnimation === "pulse" ? "hero-glow-pulse" : "";

  const heroCard = (
    <div
      className={`glass-hero-card mx-auto max-w-3xl rounded-[28px] px-6 sm:px-10 md:px-14 py-10 sm:py-12 md:py-14 text-center ${GLASS_BLUR_CLASS[experience.glassBlur]} ${ENTRANCE_CLASS[experience.entranceAnimation]}`}
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
          {riveInline && (
            <span className="w-4 h-4 inline-block" aria-hidden="true">
              <RivePlayer url={banner.riveUrl!} className="w-full h-full" />
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
  );

  return (
    <section
      className="glass-hero relative overflow-hidden min-h-[calc(100svh-96px)] md:min-h-[85vh] flex items-center"
      style={{
        ...(experience.vars as React.CSSProperties),
        // @ts-expect-error — custom properties aren't in React's CSSProperties type
        "--hero-anim-duration": durations.gradient,
        "--hero-particle-duration": durations.particle,
        "--hero-pulse-duration": durations.pulse,
      }}
    >
      {/* Optional hero image/video — full-bleed background, deliberately
          subdued (not a discrete "image card" like the traditional
          banners) so it reads as atmosphere behind the glass, not the
          focal point. The gradient renders on top at reduced opacity as a
          tint rather than being replaced by it. Wrapped in ParallaxBackground
          only when the resolved experience actually calls for it — see
          ScrollMotion.tsx's comment on why this costs nothing otherwise. */}
      {background && (experience.parallax ? <ParallaxBackground>{background}</ParallaxBackground> : background)}

      {/* Animated gradient background — CSS-only, see .glass-hero in globals.css.
          idleAnimation 'none' pauses the drift (a static gradient) rather than
          removing the element, so the gradient's own color mix still renders. */}
      <div
        className={`glass-hero-gradient absolute inset-0 ${hasBackground ? "opacity-80" : ""}`}
        style={experience.idleAnimation === "none" ? { animationPlayState: "paused" } : undefined}
        aria-hidden="true"
      />

      {/* Soft glow orbs — omitted entirely when glowIntensity is 'none'
          (cheapest option, matches Minimal Medical/Corporate's restraint). */}
      {experience.glowIntensity !== "none" && (
        <>
          <div className={`absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl ${glowClass} ${glowAnimClass}`} style={{ background: "var(--hero-glow-a)" }} aria-hidden="true" />
          <div className={`absolute -bottom-32 -right-16 w-96 h-96 rounded-full blur-3xl ${glowClass} ${glowAnimClass}`} style={{ background: "var(--hero-glow-b)" }} aria-hidden="true" />
        </>
      )}

      {lottieBg && (
        <div className="absolute inset-0 opacity-40 pointer-events-none" aria-hidden="true">
          <LottiePlayer url={banner.lottieUrl} className="w-full h-full" />
        </div>
      )}

      {riveBg && (
        <div className="absolute inset-0 opacity-40 pointer-events-none" aria-hidden="true">
          <RivePlayer url={banner.riveUrl!} className="w-full h-full" />
        </div>
      )}

      <HeroParticles intensity={banner.motionIntensity} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-14 sm:py-16 md:py-20 w-full">
        {experience.scrollEffects ? <ScrollFadeCard>{heroCard}</ScrollFadeCard> : heroCard}

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

        {riveBadge && (
          <div className="absolute bottom-6 right-6 w-16 h-16 sm:w-20 sm:h-20" aria-hidden="true">
            <RivePlayer url={banner.riveUrl!} className="w-full h-full" />
          </div>
        )}
      </div>
    </section>
  );
}
