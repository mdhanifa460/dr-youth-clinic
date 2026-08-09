import mongoose, { Schema } from "mongoose";
import { unstable_cache } from "next/cache";

// Homepage Personalization Engine — Phase 2. Singleton config (same
// pattern as Settings/QuizConfig/AssessmentConfig): one document, every
// number/list an admin can change without a code deploy. Nothing in
// app/lib/personalization.ts's scoring engine or the homepage itself
// hardcodes a threshold, weight, or category — all of it reads from here.

export interface InterestCategory {
  key: string;
  label: string;
  order: number;
  active: boolean;
}

export interface EventWeight {
  eventType: string;
  label: string;
  weight: number;
}

export interface ConfidenceBand {
  min: number;
  max: number;
  label: string;
  stars: number;
}

export interface SectionPersonalizationRule {
  sectionKey: string;
  label: string;
  personalizationEnabled: boolean;
  // How many of the visitor's top-ranked categories this section may draw
  // content from at once (e.g. Hero = 1 → single-category hero; Doctors =
  // 3 → up to 3 doctor cards spanning the visitor's top categories).
  maxCategories: number;
  // Lower number = considered first when multiple sections compete for
  // the same limited slot (not currently load-bearing for any single-
  // section decision, but keeps the config forward-compatible with a
  // future cross-section allocation pass).
  priority: number;
  fallbackToDefault: boolean;
  // No event history for this visitor yet (brand new visitor_id).
  anonymousVisitorBehavior: "default" | "popular";
  // Visitor has event history but no category cleared the primary/
  // secondary threshold — still "returning" in the sense that we know
  // something about them, just not enough to confidently personalize.
  returningVisitorBehavior: "personalized" | "default";
}

const CategorySchema = new Schema<InterestCategory>(
  { key: String, label: String, order: Number, active: Boolean },
  { _id: false }
);

const EventWeightSchema = new Schema<EventWeight>(
  { eventType: String, label: String, weight: Number },
  { _id: false }
);

const ConfidenceBandSchema = new Schema<ConfidenceBand>(
  { min: Number, max: Number, label: String, stars: Number },
  { _id: false }
);

const SectionRuleSchema = new Schema<SectionPersonalizationRule>(
  {
    sectionKey: String,
    label: String,
    personalizationEnabled: { type: Boolean, default: false },
    maxCategories: { type: Number, default: 1 },
    priority: { type: Number, default: 0 },
    fallbackToDefault: { type: Boolean, default: true },
    anonymousVisitorBehavior: { type: String, enum: ["default", "popular"], default: "default" },
    returningVisitorBehavior: { type: String, enum: ["personalized", "default"], default: "personalized" },
  },
  { _id: false }
);

export interface IPersonalizationConfig {
  categories: InterestCategory[];
  eventWeights: EventWeight[];
  // Half-life for time-decay, in days — an event this many days old counts
  // for half its original weight, a quarter at 2x this, etc. See
  // app/lib/personalization.ts's decayFactor().
  decayHalfLifeDays: number;
  primaryThreshold: number;
  secondaryThreshold: number;
  // How many categories can be "in play" at once on the homepage even if
  // more than this clear the secondary threshold (the spec's worked
  // example: Hair 92%, Skin 82%, Weight Loss 30% with maxCategories=2 →
  // only Hair + Skin are used, Weight Loss is dropped despite existing).
  maxCategories: number;
  // Converts a category's raw weighted-and-decayed event score into a
  // bounded 0-100 interest percentage via score = 100 * (1 - e^(-raw /
  // scoreSaturationPoint)) — an asymptotic curve rather than a hard cap or
  // a normalize-against-the-top-category approach, so a visitor's
  // percentages reflect their actual behavior (e.g. all three categories
  // can be low, or all three can be high) rather than always forcing the
  // best category near 100. Default 40 ≈ one assessment_completed (25)
  // plus a couple of page_views is enough to cross ~50%.
  scoreSaturationPoint: number;
  confidenceBands: ConfidenceBand[];
  sections: SectionPersonalizationRule[];
}

const PersonalizationConfigSchema = new Schema<IPersonalizationConfig>(
  {
    categories: { type: [CategorySchema], default: [] },
    eventWeights: { type: [EventWeightSchema], default: [] },
    decayHalfLifeDays: { type: Number, default: 30 },
    primaryThreshold: { type: Number, default: 70 },
    secondaryThreshold: { type: Number, default: 50 },
    maxCategories: { type: Number, default: 2 },
    scoreSaturationPoint: { type: Number, default: 40 },
    confidenceBands: { type: [ConfidenceBandSchema], default: [] },
    sections: { type: [SectionRuleSchema], default: [] },
  },
  { timestamps: true }
);

export const PersonalizationConfig =
  mongoose.models.PersonalizationConfig || mongoose.model("PersonalizationConfig", PersonalizationConfigSchema);

// ─── Defaults — seeded on first read if no document exists yet ────────────

export const DEFAULT_CATEGORIES: InterestCategory[] = [
  { key: "hair", label: "Hair", order: 1, active: true },
  { key: "skin", label: "Skin", order: 2, active: true },
  { key: "body", label: "Body", order: 3, active: true },
  { key: "weight-loss", label: "Weight Loss", order: 4, active: true },
];

// Matches the weights from the original product spec exactly.
export const DEFAULT_EVENT_WEIGHTS: EventWeight[] = [
  { eventType: "page_view", label: "Viewed a treatment page", weight: 5 },
  { eventType: "blog_read", label: "Read a blog post", weight: 3 },
  { eventType: "video_watch", label: "Watched ≥75% of a video", weight: 8 },
  { eventType: "assessment_completed", label: "Completed an assessment", weight: 25 },
  { eventType: "doctor_view", label: "Viewed a doctor profile", weight: 10 },
  { eventType: "booking_started", label: "Started booking", weight: 30 },
];

export const DEFAULT_CONFIDENCE_BANDS: ConfidenceBand[] = [
  { min: 70, max: 100, label: "High Confidence", stars: 5 },
  { min: 40, max: 69, label: "Medium Confidence", stars: 3 },
  { min: 0, max: 39, label: "Low Confidence", stars: 1 },
];

// Every real homepage section (app/lib/homepageDefaults.ts) gets a row so
// nothing is silently excluded from admin control — only the sections the
// original spec called out as visitor-interest-relevant default to ON;
// structural chrome (topbar/header/footer/consultation form) and sections
// with no natural per-category variant (locations, web stories) default
// to OFF but remain fully configurable. "Offers" and "Why Choose Us" from
// the spec's worked example don't have an exact 1:1 homepage section today
// (Offers is its own page at /offers, not a homepage section; the closest
// match for "Why Choose Us" is Trust Timeline) — mapped as closely as the
// real section set allows rather than inventing a section that doesn't exist.
export const DEFAULT_SECTIONS: SectionPersonalizationRule[] = [
  { sectionKey: "hero", label: "Hero Banner", personalizationEnabled: true, maxCategories: 1, priority: 1, fallbackToDefault: true, anonymousVisitorBehavior: "default", returningVisitorBehavior: "personalized" },
  { sectionKey: "before_after", label: "Success Stories (Before/After)", personalizationEnabled: true, maxCategories: 2, priority: 2, fallbackToDefault: true, anonymousVisitorBehavior: "default", returningVisitorBehavior: "personalized" },
  { sectionKey: "doctors", label: "Doctors", personalizationEnabled: true, maxCategories: 3, priority: 3, fallbackToDefault: true, anonymousVisitorBehavior: "default", returningVisitorBehavior: "personalized" },
  { sectionKey: "blog", label: "Blog / Insights", personalizationEnabled: true, maxCategories: 4, priority: 4, fallbackToDefault: true, anonymousVisitorBehavior: "default", returningVisitorBehavior: "personalized" },
  { sectionKey: "video_academy", label: "Skin & Hair Academy (Videos)", personalizationEnabled: true, maxCategories: 4, priority: 5, fallbackToDefault: true, anonymousVisitorBehavior: "default", returningVisitorBehavior: "personalized" },
  { sectionKey: "faq", label: "FAQ Accordion", personalizationEnabled: true, maxCategories: 2, priority: 6, fallbackToDefault: true, anonymousVisitorBehavior: "default", returningVisitorBehavior: "personalized" },
  { sectionKey: "services", label: "Services Cards", personalizationEnabled: false, maxCategories: 2, priority: 7, fallbackToDefault: true, anonymousVisitorBehavior: "default", returningVisitorBehavior: "personalized" },
  { sectionKey: "cta_strip", label: "3-Column CTA Strip", personalizationEnabled: false, maxCategories: 1, priority: 8, fallbackToDefault: true, anonymousVisitorBehavior: "default", returningVisitorBehavior: "personalized" },
  { sectionKey: "testimonials", label: "Testimonials Slider", personalizationEnabled: false, maxCategories: 1, priority: 9, fallbackToDefault: true, anonymousVisitorBehavior: "default", returningVisitorBehavior: "default" },
  { sectionKey: "stats", label: "Stats Bar (Clinic Statistics)", personalizationEnabled: false, maxCategories: 1, priority: 10, fallbackToDefault: true, anonymousVisitorBehavior: "default", returningVisitorBehavior: "default" },
  { sectionKey: "trust_timeline", label: "Trust Timeline (Why Choose Us)", personalizationEnabled: false, maxCategories: 1, priority: 11, fallbackToDefault: true, anonymousVisitorBehavior: "default", returningVisitorBehavior: "default" },
  { sectionKey: "founder", label: "Founder / CEO Section", personalizationEnabled: false, maxCategories: 1, priority: 12, fallbackToDefault: true, anonymousVisitorBehavior: "default", returningVisitorBehavior: "default" },
  { sectionKey: "web_stories", label: "Web Stories", personalizationEnabled: false, maxCategories: 2, priority: 13, fallbackToDefault: true, anonymousVisitorBehavior: "default", returningVisitorBehavior: "personalized" },
  { sectionKey: "locations", label: "Locations", personalizationEnabled: false, maxCategories: 1, priority: 14, fallbackToDefault: true, anonymousVisitorBehavior: "default", returningVisitorBehavior: "default" },
];

export const DEFAULT_PERSONALIZATION_CONFIG: IPersonalizationConfig = {
  categories: DEFAULT_CATEGORIES,
  eventWeights: DEFAULT_EVENT_WEIGHTS,
  decayHalfLifeDays: 30,
  primaryThreshold: 70,
  secondaryThreshold: 50,
  maxCategories: 2,
  scoreSaturationPoint: 40,
  confidenceBands: DEFAULT_CONFIDENCE_BANDS,
  sections: DEFAULT_SECTIONS,
};

// Same cached-singleton convention as getSettings()/getCachedQuizConfig —
// short revalidate window, busted immediately on save via revalidateTag.
const getCachedPersonalizationConfigDoc = unstable_cache(
  async () => {
    const doc = await (PersonalizationConfig as any).findOne({}).lean();
    return doc as (IPersonalizationConfig & { _id: any }) | null;
  },
  ["personalization-config-singleton"],
  { revalidate: 60, tags: ["personalization-config"] }
);

export async function getPersonalizationConfig(): Promise<IPersonalizationConfig> {
  const doc = await getCachedPersonalizationConfigDoc();
  if (doc) return doc;
  return (await (PersonalizationConfig as any).create(DEFAULT_PERSONALIZATION_CONFIG)) as IPersonalizationConfig;
}
