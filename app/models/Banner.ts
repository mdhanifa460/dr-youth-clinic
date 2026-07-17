import mongoose, { Schema, Document } from "mongoose";
import type { BannerTemplateType } from "@/app/lib/banners/types";

export interface IBanner extends Document {
  title: string;
  templateType: BannerTemplateType;
  headline: string;
  subtitle: string;
  description: string;
  desktopImage: { url: string; publicId: string };
  mobileImage: { url: string; publicId: string };
  beforeImage: { url: string; publicId: string };
  video: { url: string; publicId: string };
  overlay: { enabled: boolean; style: "dark" | "gradient"; opacity: number };
  primaryCTA: { label: string; href: string };
  secondaryCTA: { label: string; href: string };
  trustBadges: { icon: string; text: string }[];
  statBadges: { value: string; label: string }[];
  rating: { enabled: boolean; value: number; reviewCount: number };
  benefits: string[];
  achievements: string[];
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
  targetPages: ("homepage" | "location" | "service")[];
  targetLocations: string[];
  targetServices: string[];
  smartRules?: {
    daysOfWeek: number[];
    timeWindowStart: string | null;
    timeWindowEnd: string | null;
    dateRangeStart: Date | null;
    dateRangeEnd: Date | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ImageSubSchema = { url: { type: String, default: "" }, publicId: { type: String, default: "" } };
const CTASubSchema = { label: { type: String, default: "" }, href: { type: String, default: "" } };

const SmartRulesSchema = new Schema(
  {
    daysOfWeek: { type: [Number], default: [] },
    timeWindowStart: { type: String, default: null },
    timeWindowEnd: { type: String, default: null },
    dateRangeStart: { type: Date, default: null },
    dateRangeEnd: { type: Date, default: null },
  },
  { _id: false }
);

const BannerSchema = new Schema<IBanner>(
  {
    title: { type: String, required: [true, "Title is required"], trim: true },
    templateType: {
      type: String,
      required: true,
      enum: ["premium-hero", "offer", "before-after", "service", "doctor", "clinic-experience"],
    },
    headline: { type: String, default: "" },
    subtitle: { type: String, default: "" },
    description: { type: String, default: "" },

    desktopImage: ImageSubSchema,
    mobileImage: ImageSubSchema,
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
    // Derived (see pre('save') hook below) — do not set independently from
    // the three booleans above.
    targetPages: { type: [String], enum: ["homepage", "location", "service"], default: [] },

    // Empty array = eligible everywhere, same convention as Service.targetLocations.
    targetLocations: { type: [String], default: [] },
    targetServices: { type: [String], default: [] },

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

export const Banner = mongoose.models.Banner || mongoose.model<IBanner>("Banner", BannerSchema);
