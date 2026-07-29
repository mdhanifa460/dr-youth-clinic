// Experience Presets — the "Theme Engine" for the Glass Hero banner
// template. Each preset bundles color, glass treatment, glow, particle
// idle-motion, mount entrance, animation speed, and scroll behavior into
// one named, business-friendly choice, the same way app/lib/banners/
// heroThemes.ts already bundles color alone into a named HeroTheme — this
// file widens that exact pattern rather than replacing it. A legacy
// banner with no experiencePreset set still renders correctly via
// resolveExperience()'s heroTheme fallback (see experienceEngine.ts).

import type { HeroThemeVars } from "@/app/lib/banners/heroThemes";

export type ExperiencePresetId =
  | "luxury-glass"
  | "skin-glow"
  | "hair-luxury"
  | "minimal-medical"
  | "corporate"
  | "weight-wellness"
  | "premium-beauty";

export type GlassBlur = "none" | "md" | "xl";
export type GlowIntensity = "none" | "soft" | "strong";
export type EntranceAnimation = "none" | "fade" | "fade-rise";
export type IdleAnimation = "none" | "drift" | "pulse";
export type AnimationSpeed = "slow" | "normal" | "fast";

export interface ExperiencePreset {
  id: ExperiencePresetId;
  label: string;
  description: string;
  isDark: boolean;
  vars: HeroThemeVars;
  glassBlur: GlassBlur;
  glowIntensity: GlowIntensity;
  entranceAnimation: EntranceAnimation;
  idleAnimation: IdleAnimation;
  animationSpeed: AnimationSpeed;
  parallax: boolean;
  scrollEffects: boolean;
  // Convenience prefill only — written into banner.motionIntensity by the
  // admin form the moment a preset is picked (same "pre-fill a concrete
  // field" convention BANNER_TEMPLATES[type].defaultData already uses).
  // Not consulted at render time; motionIntensity remains the single
  // always-effective source of truth for particle density, exactly as
  // it is today.
  suggestedMotionIntensity: "full" | "reduced" | "off";
}

export const EXPERIENCE_PRESETS: Record<ExperiencePresetId, ExperiencePreset> = {
  "luxury-glass": {
    id: "luxury-glass",
    label: "Luxury Glass",
    description: "Flagship premium look — deep glassmorphism, restrained ambient motion, signature navy + gold.",
    isDark: false,
    vars: {
      "--hero-grad-1": "#eef5ff",
      "--hero-grad-2": "#f7f2ff",
      "--hero-grad-3": "#e8f3f6",
      "--hero-glow-a": "rgba(96,165,216,0.35)",
      "--hero-glow-b": "rgba(197,181,255,0.30)",
      "--hero-particle": "rgba(11,37,96,0.25)",
      "--hero-text": "#0B2560",
      "--hero-text-muted": "rgba(11,37,96,0.65)",
      "--hero-glass-bg": "rgba(255,255,255,0.55)",
      "--hero-glass-border": "rgba(255,255,255,0.8)",
      "--hero-accent": "#0B2560",
      "--hero-accent-text": "#ffffff",
    },
    glassBlur: "xl",
    glowIntensity: "soft",
    entranceAnimation: "fade-rise",
    idleAnimation: "drift",
    animationSpeed: "normal",
    parallax: true,
    scrollEffects: false,
    suggestedMotionIntensity: "full",
  },
  "skin-glow": {
    id: "skin-glow",
    label: "Skin Glow",
    description: "Luminous, warm, clinical-but-soft — for the skin/dermatology vertical.",
    isDark: false,
    vars: {
      "--hero-grad-1": "#fff9f5",
      "--hero-grad-2": "#ffeef0",
      "--hero-grad-3": "#fff4e8",
      "--hero-glow-a": "rgba(255,183,150,0.35)",
      "--hero-glow-b": "rgba(255,214,214,0.30)",
      "--hero-particle": "rgba(200,120,90,0.30)",
      "--hero-text": "#6b3a2e",
      "--hero-text-muted": "rgba(107,58,46,0.65)",
      "--hero-glass-bg": "rgba(255,255,255,0.65)",
      "--hero-glass-border": "rgba(255,255,255,0.9)",
      "--hero-accent": "#E8825A",
      "--hero-accent-text": "#ffffff",
    },
    glassBlur: "md",
    glowIntensity: "soft",
    entranceAnimation: "fade",
    idleAnimation: "pulse",
    animationSpeed: "slow",
    parallax: false,
    scrollEffects: false,
    suggestedMotionIntensity: "reduced",
  },
  "hair-luxury": {
    id: "hair-luxury",
    label: "Hair Luxury",
    description: "Darker, dramatic, higher-contrast — for hair transplant/restoration.",
    isDark: true,
    vars: {
      "--hero-grad-1": "#16181f",
      "--hero-grad-2": "#1f1830",
      "--hero-grad-3": "#120f1c",
      "--hero-glow-a": "rgba(147,112,255,0.35)",
      "--hero-glow-b": "rgba(245,166,35,0.15)",
      "--hero-particle": "rgba(214,197,255,0.5)",
      "--hero-text": "#f5f3ff",
      "--hero-text-muted": "rgba(245,243,255,0.72)",
      "--hero-glass-bg": "rgba(255,255,255,0.08)",
      "--hero-glass-border": "rgba(255,255,255,0.22)",
      "--hero-accent": "#F5A623",
      "--hero-accent-text": "#1a1033",
    },
    glassBlur: "xl",
    glowIntensity: "strong",
    entranceAnimation: "fade-rise",
    idleAnimation: "drift",
    animationSpeed: "normal",
    parallax: true,
    scrollEffects: false,
    suggestedMotionIntensity: "full",
  },
  "minimal-medical": {
    id: "minimal-medical",
    label: "Minimal Medical",
    description: "Clinical trust over spectacle — near-flat, motion almost entirely absent.",
    isDark: false,
    vars: {
      "--hero-grad-1": "#ffffff",
      "--hero-grad-2": "#f3f8fd",
      "--hero-grad-3": "#eef6fb",
      "--hero-glow-a": "rgba(11,37,96,0)",
      "--hero-glow-b": "rgba(11,37,96,0)",
      "--hero-particle": "rgba(11,37,96,0.15)",
      "--hero-text": "#0B2560",
      "--hero-text-muted": "rgba(11,37,96,0.6)",
      "--hero-glass-bg": "rgba(255,255,255,0.95)",
      "--hero-glass-border": "rgba(11,37,96,0.12)",
      "--hero-accent": "#0B7285",
      "--hero-accent-text": "#ffffff",
    },
    glassBlur: "none",
    glowIntensity: "none",
    entranceAnimation: "fade",
    idleAnimation: "none",
    animationSpeed: "normal",
    parallax: false,
    scrollEffects: false,
    suggestedMotionIntensity: "off",
  },
  corporate: {
    id: "corporate",
    label: "Corporate",
    description: "Structured, confident, low ornamentation — for practitioner/B2B audiences.",
    isDark: true,
    vars: {
      "--hero-grad-1": "#0B2560",
      "--hero-grad-2": "#0d2d72",
      "--hero-grad-3": "#0a1f4d",
      "--hero-glow-a": "rgba(255,255,255,0)",
      "--hero-glow-b": "rgba(255,255,255,0)",
      "--hero-particle": "rgba(255,255,255,0.2)",
      "--hero-text": "#ffffff",
      "--hero-text-muted": "rgba(255,255,255,0.7)",
      "--hero-glass-bg": "rgba(255,255,255,0.06)",
      "--hero-glass-border": "rgba(255,255,255,0.18)",
      "--hero-accent": "#F5A623",
      "--hero-accent-text": "#0B2560",
    },
    glassBlur: "none",
    glowIntensity: "none",
    entranceAnimation: "fade-rise",
    idleAnimation: "none",
    animationSpeed: "normal",
    parallax: false,
    scrollEffects: false,
    suggestedMotionIntensity: "off",
  },
  "weight-wellness": {
    id: "weight-wellness",
    label: "Weight Wellness",
    description: "Bright, energetic, motivational — for weight-loss/body-contouring.",
    isDark: false,
    vars: {
      "--hero-grad-1": "#fff5ec",
      "--hero-grad-2": "#ffe9d6",
      "--hero-grad-3": "#fff0e0",
      "--hero-glow-a": "rgba(255,127,80,0.30)",
      "--hero-glow-b": "rgba(255,193,7,0.25)",
      "--hero-particle": "rgba(200,90,40,0.30)",
      "--hero-text": "#5c2e10",
      "--hero-text-muted": "rgba(92,46,16,0.65)",
      "--hero-glass-bg": "rgba(255,255,255,0.6)",
      "--hero-glass-border": "rgba(255,255,255,0.85)",
      "--hero-accent": "#FF7F50",
      "--hero-accent-text": "#ffffff",
    },
    glassBlur: "md",
    glowIntensity: "soft",
    entranceAnimation: "fade-rise",
    idleAnimation: "drift",
    animationSpeed: "fast",
    parallax: false,
    scrollEffects: true,
    suggestedMotionIntensity: "full",
  },
  "premium-beauty": {
    id: "premium-beauty",
    label: "Premium Beauty",
    description: "Soft glass, pastel, romantic and elegant — the safe default for general aesthetic pages.",
    isDark: false,
    vars: {
      "--hero-grad-1": "#fdf2f8",
      "--hero-grad-2": "#f5f0ff",
      "--hero-grad-3": "#fdf4f9",
      "--hero-glow-a": "rgba(216,155,255,0.30)",
      "--hero-glow-b": "rgba(255,182,213,0.30)",
      "--hero-particle": "rgba(150,90,180,0.28)",
      "--hero-text": "#4a2545",
      "--hero-text-muted": "rgba(74,37,69,0.65)",
      "--hero-glass-bg": "rgba(255,255,255,0.6)",
      "--hero-glass-border": "rgba(255,255,255,0.85)",
      "--hero-accent": "#C77DBE",
      "--hero-accent-text": "#ffffff",
    },
    glassBlur: "xl",
    glowIntensity: "soft",
    entranceAnimation: "fade-rise",
    idleAnimation: "drift",
    animationSpeed: "slow",
    parallax: false,
    scrollEffects: false,
    suggestedMotionIntensity: "reduced",
  },
};

export const EXPERIENCE_PRESET_LIST: ExperiencePreset[] = Object.values(EXPERIENCE_PRESETS);

export function getExperiencePreset(id: string | undefined): ExperiencePreset | null {
  if (!id) return null;
  return EXPERIENCE_PRESETS[id as ExperiencePresetId] ?? null;
}
