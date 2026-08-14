import mongoose, { Schema, Document } from "mongoose";
import type { BannerTemplateType } from "@/app/lib/banners/types";
import type { ExperiencePresetId } from "@/app/lib/banners/experiencePresets";
import { FocalPointSchema } from "@/app/models/shared/imageSchema";
import type { FocalPoint } from "@/app/lib/media/focalPoint";

export interface IBanner extends Document {
  title: string;
  templateType: BannerTemplateType;
  headline: string;
  subtitle: string;
  description: string;
  desktopImage: { url: string; publicId: string; focalPoint?: FocalPoint };
  mobileImage: { url: string; publicId: string; focalPoint?: FocalPoint };
  beforeImage: { url: string; publicId: string };
  video: { url: string; publicId: string };
  overlay: { enabled: boolean; style: "dark" | "gradient"; opacity: number };
  primaryCTA: { label: string; href: string };
  secondaryCTA: { label: string; href: string };
  // Only meaningful for templateType "glass-hero" — the 3rd fixed-role CTA
  // ("WhatsApp Expert"). primaryCTA/secondaryCTA already cover the other
  // two roles, so this is additive rather than a migration to a generic
  // CTA array.
  tertiaryCTA: { label: string; href: string };
  trustBadges: { icon: string; text: string }[];
  statBadges: { value: string; label: string }[];
  rating: { enabled: boolean; value: number; reviewCount: number };
  benefits: string[];
  achievements: string[];
  // Everything below is only meaningful for templateType "glass-hero".
  heroTheme: 'aurora' | 'gold' | 'ocean' | 'violet' | 'midnight';
  lottieUrl: string;
  lottiePlacement: 'background' | 'beside-heading' | 'floating-badge';
  // Independent of lottieUrl/lottiePlacement above — a banner can use
  // either technology (or, in principle, both at different placements)
  // per Phase 3 of the Experience Engine. See RivePlayer.tsx for why this
  // needed its own runtime-import discipline separate from LottiePlayer.
  riveUrl: string;
  rivePlacement: 'background' | 'beside-heading' | 'floating-badge';
  serviceChips: { label: string; icon: string; href: string }[];
  doctorHighlight: { doctorId: mongoose.Types.ObjectId | null; tagline: string };
  assistantTeaser: { enabled: boolean; text: string; ctaLabel: string; href: string };
  // Admin-side animation dial — the visitor's own OS
  // prefers-reduced-motion always overrides this, never the other way
  // round (see GlassHeroBanner.tsx). Kept as the single always-effective
  // source of truth for particle density; experiencePreset only *suggests*
  // a starting value for this field when first picked in the admin UI
  // (app/lib/banners/experiencePresets.ts's suggestedMotionIntensity).
  motionIntensity: 'full' | 'reduced' | 'off';
  // Experience Engine (Task 2 of the Enterprise Experience & Theme Engine
  // design) — the business-friendly preset an admin picks in Simple Mode.
  // Resolved by resolveExperience() (app/lib/banners/experienceEngine.ts)
  // into the full color/glass/glow/animation token set GlassHeroBanner.tsx
  // renders. A banner with no experiencePreset falls back to the legacy
  // heroTheme-only rendering (zero migration needed for pre-existing
  // banners) — see resolveExperience()'s legacyExperience() branch.
  experiencePreset: ExperiencePresetId;
  // Advanced Mode overrides — sparse and optional; every field falls back
  // to the preset's own value when unset (`??` in resolveExperience()).
  // This is deliberately a SEPARATE new field from heroTheme/motionIntensity
  // rather than repurposing those (which already carry non-null schema
  // defaults, making "admin explicitly chose this" indistinguishable from
  // "never touched" — colorThemeOverride avoids that ambiguity entirely by
  // defaulting to undefined/null).
  experienceOverrides?: {
    colorThemeOverride: 'aurora' | 'gold' | 'ocean' | 'violet' | 'midnight' | null;
    glassBlur: 'none' | 'md' | 'xl' | null;
    glowIntensity: 'none' | 'soft' | 'strong' | null;
    entranceAnimation: 'none' | 'fade' | 'fade-rise' | null;
    idleAnimation: 'none' | 'drift' | 'pulse' | null;
    animationSpeed: 'slow' | 'normal' | 'fast' | null;
    parallax: boolean | null;
    scrollEffects: boolean | null;
  };
  status: "draft" | "active" | "disabled";
  priority: number;
  order: number;
  startDate: Date | null;
  endDate: Date | null;
  // Single source of truth read at render time. The admin-requested
  // `targetPages` concept is derived from these three via the pre('save')
  // hook below, purely for admin-list filter/badge display — kept as one
  // settable representation rather than two independently-settable ones
  // that could drift out of sync.
  showOnHomepage: boolean;
  showOnLocationPage: boolean;
  showOnServicePage: boolean;
  // Own dedicated toggle rather than reusing showOnServicePage — a banner
  // may want to target individual service pages without targeting the
  // coarser category-listing page, or vice versa.
  showOnCategoryPage: boolean;
  // Only meaningful when showOnHomepage is also true — see the matching
  // comment on BannerDoc in app/lib/banners/types.ts.
  splashEnabled: boolean;
  splashAutoCloseSeconds: number;
  targetPages: ("homepage" | "location" | "service" | "category")[];
  targetLocations: string[];
  targetServices: string[];
  // Values match CATEGORY_MAP keys (app/lib/serviceCategories.ts):
  // skin|hair|laser|other. Empty = eligible on every category page.
  targetCategories: string[];
  smartRules?: {
    daysOfWeek: number[];
    timeWindowStart: string | null;
    timeWindowEnd: string | null;
    dateRangeStart: Date | null;
    dateRangeEnd: Date | null;
    // "Season" as a recurring month-of-year window (1-12, e.g. summer =
    // start:3 end:6), evaluated every year with no expiry — unlike
    // dateRangeStart/End (a one-time window an admin must re-enter
    // annually). Handles wraparound (e.g. start:11 end:2 for
    // Nov-through-Feb) the same way timeWindowStart/End already does.
    // Deliberately NOT live-weather-API-driven — see note in
    // resolveBanner.ts on why that's a separate decision, not this field.
    seasonStartMonth: number | null;
    seasonEndMonth: number | null;
    // Phase 4 of the Experience Engine — reuses the season/date-range
    // windows above (already proven for banner *visibility*) to also
    // drive which Experience Preset applies while that window is active,
    // on the SAME banner document, with no second banner needed. Resolved
    // by resolveExperience() in experienceEngine.ts; campaignPreset wins
    // over seasonalPresetOverride when both windows happen to overlap
    // (a short-lived campaign is more specific than a recurring season).
    seasonalPresetOverride: ExperiencePresetId | null;
    campaignPreset: ExperiencePresetId | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ImageSubSchema = { url: { type: String, default: "" }, publicId: { type: String, default: "" } };
const ImageWithFocalSubSchema = { ...ImageSubSchema, focalPoint: { type: FocalPointSchema, default: undefined } };
const CTASubSchema = { label: { type: String, default: "" }, href: { type: String, default: "" } };

const SmartRulesSchema = new Schema(
  {
    daysOfWeek: { type: [Number], default: [] },
    timeWindowStart: { type: String, default: null },
    timeWindowEnd: { type: String, default: null },
    dateRangeStart: { type: Date, default: null },
    dateRangeEnd: { type: Date, default: null },
    seasonStartMonth: { type: Number, default: null, min: 1, max: 12 },
    seasonEndMonth: { type: Number, default: null, min: 1, max: 12 },
    seasonalPresetOverride: {
      type: String,
      enum: ["luxury-glass", "skin-glow", "hair-luxury", "minimal-medical", "corporate", "weight-wellness", "premium-beauty", null],
      default: null,
    },
    campaignPreset: {
      type: String,
      enum: ["luxury-glass", "skin-glow", "hair-luxury", "minimal-medical", "corporate", "weight-wellness", "premium-beauty", null],
      default: null,
    },
  },
  { _id: false }
);

const BannerSchema = new Schema<IBanner>(
  {
    title: { type: String, required: [true, "Title is required"], trim: true },
    templateType: {
      type: String,
      required: true,
      enum: ["premium-hero", "offer", "before-after", "service", "doctor", "clinic-experience", "glass-hero"],
    },
    headline: { type: String, default: "" },
    subtitle: { type: String, default: "" },
    description: { type: String, default: "" },

    desktopImage: ImageWithFocalSubSchema,
    mobileImage: ImageWithFocalSubSchema,
    // Only meaningful for templateType "before-after" (paired with
    // desktopImage as the "after" image) — schema-available to every
    // template for simplicity, admin UI hides the field for other types.
    beforeImage: ImageSubSchema,
    video: ImageSubSchema,

    overlay: {
      enabled: { type: Boolean, default: false },
      style: { type: String, enum: ["dark", "gradient"], default: "dark" },
      opacity: { type: Number, default: 0.4, min: 0, max: 1 },
    },

    primaryCTA: { type: CTASubSchema, required: true },
    secondaryCTA: { type: CTASubSchema, default: () => ({ label: "", href: "" }) },
    tertiaryCTA: { type: CTASubSchema, default: () => ({ label: "", href: "" }) },

    trustBadges: { type: [{ icon: String, text: String }], default: [] },
    statBadges: { type: [{ value: String, label: String }], default: [] },
    rating: {
      enabled: { type: Boolean, default: false },
      value: { type: Number, default: 0, min: 0, max: 5 },
      reviewCount: { type: Number, default: 0 },
    },
    // Bullet lists — Service Banner's benefits, Doctor Banner's achievements.
    benefits: { type: [String], default: [] },
    achievements: { type: [String], default: [] },

    // Glass Hero-only fields — harmless/unused on every other templateType,
    // same convention as beforeImage/video above.
    heroTheme: { type: String, enum: ["aurora", "gold", "ocean", "violet", "midnight"], default: "aurora" },
    lottieUrl: { type: String, default: "" },
    lottiePlacement: { type: String, enum: ["background", "beside-heading", "floating-badge"], default: "beside-heading" },
    riveUrl: { type: String, default: "" },
    rivePlacement: { type: String, enum: ["background", "beside-heading", "floating-badge"], default: "beside-heading" },
    serviceChips: { type: [{ label: String, icon: String, href: String }], default: [] },
    doctorHighlight: {
      doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", default: null },
      tagline: { type: String, default: "" },
    },
    assistantTeaser: {
      enabled: { type: Boolean, default: true },
      text: { type: String, default: "Need help choosing a treatment?" },
      ctaLabel: { type: String, default: "Start Assessment" },
      href: { type: String, default: "/skin-quiz" },
    },
    motionIntensity: { type: String, enum: ["full", "reduced", "off"], default: "full" },
    experiencePreset: {
      type: String,
      enum: ["luxury-glass", "skin-glow", "hair-luxury", "minimal-medical", "corporate", "weight-wellness", "premium-beauty"],
      default: "luxury-glass",
    },
    experienceOverrides: {
      type: {
        colorThemeOverride: { type: String, enum: ["aurora", "gold", "ocean", "violet", "midnight", null], default: null },
        glassBlur: { type: String, enum: ["none", "md", "xl", null], default: null },
        glowIntensity: { type: String, enum: ["none", "soft", "strong", null], default: null },
        entranceAnimation: { type: String, enum: ["none", "fade", "fade-rise", null], default: null },
        idleAnimation: { type: String, enum: ["none", "drift", "pulse", null], default: null },
        animationSpeed: { type: String, enum: ["slow", "normal", "fast", null], default: null },
        parallax: { type: Boolean, default: null },
        scrollEffects: { type: Boolean, default: null },
      },
      required: false,
      default: () => ({}),
      _id: false,
    },

    // draft = never shown publicly (supports Preview-before-publish);
    // active = eligible per schedule/rules; disabled = manually paused
    // without deleting. Only 'active' banners are ever resolveBanner()
    // candidates.
    status: { type: String, enum: ["draft", "active", "disabled"], default: "draft" },

    // Drives *selection* among matching candidates (higher wins ties).
    priority: { type: Number, default: 0 },
    // Drives admin-list *display position* only (drag-reorder target) —
    // deliberately separate from priority, since "how the list is sorted
    // for editing" and "which banner wins a targeting tie" are different
    // concerns.
    order: { type: Number, default: 0 },

    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },

    showOnHomepage: { type: Boolean, default: false },
    showOnLocationPage: { type: Boolean, default: false },
    showOnServicePage: { type: Boolean, default: false },
    showOnCategoryPage: { type: Boolean, default: false },
    splashEnabled: { type: Boolean, default: false },
    splashAutoCloseSeconds: { type: Number, default: 5 },
    // Derived (see pre('save') hook below) — do not set independently from
    // the four booleans above.
    targetPages: { type: [String], enum: ["homepage", "location", "service", "category"], default: [] },

    // Empty array = eligible everywhere, same convention as Service.targetLocations.
    targetLocations: { type: [String], default: [] },
    targetServices: { type: [String], default: [] },
    targetCategories: { type: [String], default: [] },

    // Whole subdocument optional (no default object) — its presence/absence
    // is itself the "has rules attached" signal resolveBanner() checks.
    smartRules: { type: SmartRulesSchema, required: false },
  },
  { timestamps: true }
);

// NOTE: targetPages is derived from the three show*Page booleans, but this
// is done explicitly in the admin API route handlers (app/api/admin/banners/**),
// not via a pre('save') hook — this codebase's CRUD convention updates
// documents with findByIdAndUpdate (see Offer's PUT route), which does not
// trigger 'save' middleware, so a hook here would silently go stale on
// every edit. See deriveTargetPages() in app/lib/banners/resolveBanner.ts.

BannerSchema.index({ status: 1, priority: -1 });
BannerSchema.index({ showOnHomepage: 1 });
BannerSchema.index({ showOnLocationPage: 1, targetLocations: 1 });
BannerSchema.index({ showOnServicePage: 1, targetServices: 1 });
BannerSchema.index({ showOnCategoryPage: 1, targetCategories: 1 });

export const Banner = mongoose.models.Banner || mongoose.model<IBanner>("Banner", BannerSchema);
