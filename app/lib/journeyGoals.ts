// Shared metadata/types for the "Plan My Journey" page
// (app/(public)/plan-my-journey/). Deliberately has NO Mongoose/DB imports
// — this file is imported from PlanMyJourneyClient.tsx ("use client"), and
// pulling in app/lib/mongodb.ts (which transitively requires Node builtins
// like "net") from a client component breaks the browser bundle. The
// actual DB queries live in journeyGoals.server.ts, imported only from the
// server component (page.tsx).
export const JOURNEY_GOALS = ["hair", "skin", "laser", "weight-loss"] as const;
export type JourneyGoalSlug = (typeof JOURNEY_GOALS)[number];

export interface JourneyGoalMeta {
  label: string;
  category: "Skin" | "Hair" | "Laser" | "Other";
  nameFilter?: RegExp; // only set for weight-loss — narrows the Other category by name
  doctorRegex: RegExp; // matched against each Doctor.specializations array element
  icon: string;
  heroGrad: string;
}

export const JOURNEY_GOAL_META: Record<JourneyGoalSlug, JourneyGoalMeta> = {
  hair: {
    label: "Hair Restoration",
    category: "Hair",
    doctorRegex: /hair|trichol/i,
    icon: "💇",
    heroGrad: "from-[#7c1d0a] via-[#a63c1c] to-[#c96a4e]",
  },
  skin: {
    label: "Skin & Aesthetics",
    category: "Skin",
    doctorRegex: /skin|derma|aesthet|cosmet/i,
    icon: "✨",
    heroGrad: "from-[#0B2560] via-[#1a3a6e] to-[#3B82C4]",
  },
  laser: {
    label: "Laser Precision",
    category: "Laser",
    doctorRegex: /laser/i,
    icon: "⚡",
    heroGrad: "from-[#4c1d95] via-[#6d28d9] to-[#8b5cf6]",
  },
  "weight-loss": {
    label: "Weight Loss",
    category: "Other",
    nameFilter: /weight/i,
    doctorRegex: /weight|obesity|bariatric|nutrition/i,
    icon: "🔥",
    heroGrad: "from-[#166534] via-[#15803d] to-[#22c55e]",
  },
};

export interface JourneyGoalBundle {
  goal: JourneyGoalSlug;
  services: any[];
  doctors: any[];
  results: any[];
}

// Bridges a Plan My Journey goal to the Clinical Intake "concern" tags it
// corresponds to (see app/lib/quizDefaults.ts's DEFAULT_TREATMENT_MAP
// concernTag buckets) — picking a goal card seeds the intake engine's
// answers.concern directly, so the visitor is never asked the redundant
// "what's your concern?" question a second time. "weight-loss" has no
// Clinical Intake concern bucket yet (see Phase 3 of the journey-merge
// plan) — left empty until real content exists, at which point the intake
// question flow simply won't branch for this goal (an empty array matches
// nothing, same as today's behavior with no bridging at all).
export const GOAL_CONCERN_TAGS: Record<JourneyGoalSlug, string[]> = {
  hair: ["hair"],
  skin: ["acne", "pigmentation", "ageing", "glow"],
  laser: ["hair-removal", "tattoo-removal"],
  "weight-loss": [],
};
