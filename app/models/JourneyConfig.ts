import mongoose, { Schema, Document } from 'mongoose';
import { unstable_cache } from 'next/cache';

// CMS-driven replacement for the goal metadata that used to live as source
// constants in app/lib/journeyGoals.ts (JOURNEY_GOAL_META/GOAL_CONCERN_TAGS)
// — the AI Beauty Journey redesign's explicit requirement is that goals,
// doctor-matching rules, concern-tag bridging, and CTA text are all
// admin-editable, not hardcoded. Singleton document, same pattern as
// Settings.ts (see getSettings() below).
export interface IJourneyGoal {
  slug: string;
  label: string;
  icon: string;
  heroGrad: string;
  // Matched against Service.category — same semantics as the old
  // JourneyGoalMeta.category.
  category: 'Skin' | 'Hair' | 'Laser' | 'Other';
  // Regex SOURCE strings (not RegExp instances — Mongoose can't store
  // those), compiled with `new RegExp(source, 'i')` at read time. Empty
  // string means "no filter", same as the old optional nameFilter.
  nameFilterSource: string;
  doctorRegexSource: string;
  // Bridges this goal to Clinical Intake concern tags (see
  // app/lib/quizDefaults.ts's DEFAULT_TREATMENT_MAP) — picking this goal
  // seeds the intake engine's answers.concern so the visitor isn't asked
  // the same question twice. Admin-editable now instead of the old
  // GOAL_CONCERN_TAGS source constant.
  concernTags: string[];
  ctaLabel: string;
  order: number;
  enabled: boolean;
}

// Default goals mirror today's JOURNEY_GOAL_META/GOAL_CONCERN_TAGS exactly
// — a fresh singleton doc reproduces current behavior with zero admin
// action required, same "additive, non-breaking" convention as every other
// singleton default in this codebase (see Settings.ts).
const DEFAULT_GOALS: IJourneyGoal[] = [
  {
    slug: 'hair', label: 'Hair Restoration', icon: '💇',
    heroGrad: 'from-[#7c1d0a] via-[#a63c1c] to-[#c96a4e]',
    category: 'Hair', nameFilterSource: '', doctorRegexSource: 'hair|trichol',
    concernTags: ['hair'], ctaLabel: 'Start My Hair Journey', order: 1, enabled: true,
  },
  {
    slug: 'skin', label: 'Skin & Aesthetics', icon: '✨',
    heroGrad: 'from-[#0B2560] via-[#1a3a6e] to-[#3B82C4]',
    category: 'Skin', nameFilterSource: '', doctorRegexSource: 'skin|derma|aesthet|cosmet',
    concernTags: ['acne', 'pigmentation', 'ageing', 'glow'], ctaLabel: 'Start My Skin Journey', order: 2, enabled: true,
  },
  {
    slug: 'laser', label: 'Laser Precision', icon: '⚡',
    heroGrad: 'from-[#4c1d95] via-[#6d28d9] to-[#8b5cf6]',
    category: 'Laser', nameFilterSource: '', doctorRegexSource: 'laser',
    concernTags: ['hair-removal', 'tattoo-removal'], ctaLabel: 'Start My Laser Journey', order: 3, enabled: true,
  },
  {
    slug: 'weight-loss', label: 'Weight Loss', icon: '🔥',
    heroGrad: 'from-[#166534] via-[#15803d] to-[#22c55e]',
    category: 'Other', nameFilterSource: 'weight', doctorRegexSource: 'weight|obesity|bariatric|nutrition',
    concernTags: ['weight-loss'], ctaLabel: 'Start My Weight Loss Journey', order: 4, enabled: true,
  },
];

export interface IJourneyConfig extends Document {
  goals: IJourneyGoal[];
  // Per-module feature toggles — an admin can turn off a module clinic-wide
  // without a code change (e.g. disable AI Observations while a photo-AI
  // vendor contract is being finalized, without pulling the whole journey).
  enablePhotoCapture: boolean;
  enableAiObservations: boolean;
  // Fixed, non-editable safety text is a worse pattern than admin-editable
  // text an admin could accidentally weaken — instead this is editable but
  // ALWAYS rendered (the UI never lets a patient skip past it unacknowledged,
  // see PatientJourney.aiObservations.disclaimerAcknowledged), and defaults
  // to strong, legally-reviewed-style language an admin would have to
  // deliberately soften, not silently lose.
  aiObservationsDisclaimer: string;
  costPlanningNote: string;
  updatedAt: Date;
}

const JourneyGoalSchema = new Schema<IJourneyGoal>(
  {
    slug: { type: String, required: true },
    label: { type: String, required: true },
    icon: { type: String, default: '✨' },
    heroGrad: { type: String, default: 'from-[#0B2560] via-[#1a3a6e] to-[#3B82C4]' },
    category: { type: String, enum: ['Skin', 'Hair', 'Laser', 'Other'], default: 'Other' },
    nameFilterSource: { type: String, default: '' },
    doctorRegexSource: { type: String, default: '' },
    concernTags: { type: [String], default: [] },
    ctaLabel: { type: String, default: 'Start My Journey' },
    order: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const JourneyConfigSchema = new Schema<IJourneyConfig>(
  {
    goals: { type: [JourneyGoalSchema], default: () => DEFAULT_GOALS },
    enablePhotoCapture: { type: Boolean, default: true },
    enableAiObservations: { type: Boolean, default: true },
    aiObservationsDisclaimer: {
      type: String,
      default:
        "These are general observations from your photos, not a medical diagnosis. Only a qualified doctor can " +
        'assess your skin/hair and recommend treatment during an in-person or video consultation.',
    },
    costPlanningNote: {
      type: String,
      default: 'These are typical ranges for patients with similar goals — your exact cost is confirmed by a doctor after consultation.',
    },
  },
  { timestamps: true }
);

export const JourneyConfig =
  mongoose.models.JourneyConfig || mongoose.model<IJourneyConfig>('JourneyConfig', JourneyConfigSchema);

const getCachedJourneyConfigDoc = unstable_cache(
  async () => {
    const doc = await JourneyConfig.findOne({} as any).lean();
    return doc as IJourneyConfig | null;
  },
  ['journey-config-singleton'],
  { revalidate: 60, tags: ['journey-config'] }
);

// Singleton helper — same shape as Settings.ts's getSettings(): always
// returns the one config doc, creating it (with the DEFAULT_GOALS above)
// on first-ever call.
export async function getJourneyConfig(): Promise<IJourneyConfig> {
  const doc = await getCachedJourneyConfigDoc();
  if (doc) return doc;
  return (await JourneyConfig.create({})) as IJourneyConfig;
}
