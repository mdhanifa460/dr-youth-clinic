// Single source of truth for every enum used by the Flash Offer Popup
// (splashAnimationStyle / splashSound.effect / splashFrequency). Both the
// Mongoose schema (app/models/Banner.ts) and any client-side option list
// must import from here rather than hand-typing the same string array
// twice — that exact drift (a value added to one but not the other) is
// what caused Banner.templateType's enum bug earlier this session.

export const SPLASH_ANIMATION_STYLES = [
  "none",
  "sparkle",
  "golden-glow",
  "confetti",
  "soft-particles",
  "lottie",
] as const;
export type SplashAnimationStyle = (typeof SPLASH_ANIMATION_STYLES)[number];

export const SPLASH_SOUND_EFFECTS = [
  "soft-chime",
  "notification",
  "celebration",
] as const;
export type SplashSoundEffect = (typeof SPLASH_SOUND_EFFECTS)[number];

export const SPLASH_FREQUENCIES = [
  "once-per-session",
  "once-per-day",
  "every-session",
] as const;
export type SplashFrequency = (typeof SPLASH_FREQUENCIES)[number];

// Display labels — admin UI only, never used as stored values.
export const SPLASH_ANIMATION_STYLE_LABELS: Record<SplashAnimationStyle, string> = {
  none: "None",
  sparkle: "✨ Sparkle",
  "golden-glow": "🌟 Golden Glow",
  confetti: "🎉 Confetti",
  "soft-particles": "❄️ Soft Particles",
  lottie: "🎞️ Lottie",
};

export const SPLASH_SOUND_EFFECT_LABELS: Record<SplashSoundEffect, string> = {
  "soft-chime": "Soft Chime",
  notification: "Notification",
  celebration: "Celebration",
};

export const SPLASH_FREQUENCY_LABELS: Record<SplashFrequency, string> = {
  "once-per-session": "Once per session",
  "once-per-day": "Once per day",
  "every-session": "Every session",
};
