// The Experience Engine — resolves an admin's business-language choice
// (banner.experiencePreset + optional advanced overrides) into the full
// token set GlassHeroBanner.tsx needs to render. Pure function, O(1)
// lookups only, same shape/spirit as heroThemes.ts's existing
// getHeroTheme() — this is that pattern widened, not a new one.
import { getHeroTheme, type HeroThemeVars } from "@/app/lib/banners/heroThemes";
import { inMonthWindow, endOfDayUTC } from "@/app/lib/banners/resolveBanner";
import {
  getExperiencePreset,
  type GlassBlur,
  type GlowIntensity,
  type EntranceAnimation,
  type IdleAnimation,
  type AnimationSpeed,
} from "@/app/lib/banners/experiencePresets";

interface SmartRulesForExperience {
  seasonStartMonth?: number | null;
  seasonEndMonth?: number | null;
  seasonalPresetOverride?: string | null;
  dateRangeStart?: string | Date | null;
  dateRangeEnd?: string | Date | null;
  campaignPreset?: string | null;
}

// Phase 4 — the same season/date-range windows that already gate banner
// *visibility* (resolveBanner.ts) also gate which preset applies, on the
// same banner document, no second banner needed. campaignPreset wins when
// both windows happen to be active at once (more specific/short-lived).
// A missing bound on either side of a window is treated as "no override"
// for that window, matching resolveBanner.ts's own one-sided-window
// tolerance for the *visibility* check.
export function resolveEffectivePresetId(
  banner: { experiencePreset?: string },
  smartRules: SmartRulesForExperience | null | undefined,
  now: Date = new Date()
): string | undefined {
  if (smartRules?.campaignPreset && smartRules.dateRangeStart && smartRules.dateRangeEnd) {
    const start = new Date(smartRules.dateRangeStart);
    const end = endOfDayUTC(smartRules.dateRangeEnd);
    if (now >= start && now <= end) return smartRules.campaignPreset;
  }

  if (smartRules?.seasonalPresetOverride && smartRules.seasonStartMonth && smartRules.seasonEndMonth) {
    const nowMonth = now.getMonth() + 1;
    if (inMonthWindow(nowMonth, smartRules.seasonStartMonth, smartRules.seasonEndMonth)) {
      return smartRules.seasonalPresetOverride;
    }
  }

  return banner.experiencePreset;
}

export interface ExperienceOverrides {
  colorThemeOverride?: string | null;
  glassBlur?: GlassBlur;
  glowIntensity?: GlowIntensity;
  entranceAnimation?: EntranceAnimation;
  idleAnimation?: IdleAnimation;
  animationSpeed?: AnimationSpeed;
  parallax?: boolean;
  scrollEffects?: boolean;
}

export interface ResolvedExperience {
  vars: HeroThemeVars;
  isDark: boolean;
  glassBlur: GlassBlur;
  glowIntensity: GlowIntensity;
  entranceAnimation: EntranceAnimation;
  idleAnimation: IdleAnimation;
  animationSpeed: AnimationSpeed;
  parallax: boolean;
  scrollEffects: boolean;
}

const SPEED_DURATIONS: Record<AnimationSpeed, { gradient: string; particle: string; pulse: string }> = {
  slow: { gradient: "26s", particle: "13s", pulse: "8s" },
  normal: { gradient: "18s", particle: "9s", pulse: "6s" },
  fast: { gradient: "11s", particle: "6s", pulse: "4s" },
};

export function getAnimationDurations(speed: AnimationSpeed) {
  return SPEED_DURATIONS[speed];
}

// Legacy fallback — a banner saved before experiencePreset existed (or one
// that somehow has an invalid preset id) renders exactly as it always has,
// via the original 5-theme heroTheme lookup, with today's hardcoded
// defaults reproduced explicitly so there is zero visual regression.
function legacyExperience(heroThemeId: string | undefined): ResolvedExperience {
  const theme = getHeroTheme(heroThemeId);
  return {
    vars: theme.vars,
    isDark: theme.isDark,
    glassBlur: "xl",
    glowIntensity: "soft",
    entranceAnimation: "none",
    idleAnimation: "drift",
    animationSpeed: "normal",
    parallax: false,
    scrollEffects: false,
  };
}

export function resolveExperience(
  banner: {
    experiencePreset?: string;
    heroTheme?: string;
    experienceOverrides?: ExperienceOverrides | null;
    smartRules?: SmartRulesForExperience | null;
  },
  now: Date = new Date()
): ResolvedExperience {
  const effectivePresetId = resolveEffectivePresetId(banner, banner.smartRules, now);
  const preset = getExperiencePreset(effectivePresetId);
  if (!preset) return legacyExperience(banner.heroTheme);

  const overrides = banner.experienceOverrides || {};
  const colorOverrideTheme = overrides.colorThemeOverride ? getHeroTheme(overrides.colorThemeOverride) : null;

  return {
    vars: colorOverrideTheme?.vars ?? preset.vars,
    isDark: colorOverrideTheme?.isDark ?? preset.isDark,
    glassBlur: overrides.glassBlur ?? preset.glassBlur,
    glowIntensity: overrides.glowIntensity ?? preset.glowIntensity,
    entranceAnimation: overrides.entranceAnimation ?? preset.entranceAnimation,
    idleAnimation: overrides.idleAnimation ?? preset.idleAnimation,
    animationSpeed: overrides.animationSpeed ?? preset.animationSpeed,
    parallax: overrides.parallax ?? preset.parallax,
    scrollEffects: overrides.scrollEffects ?? preset.scrollEffects,
  };
}
