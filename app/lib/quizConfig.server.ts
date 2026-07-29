// Server-only fetch/cache for the Clinical Intake config — shared by
// app/api/quiz-config/route.ts (public client fetch) and
// app/(public)/plan-my-journey/page.tsx (needs the same questions/settings
// server-side to seed the goal-filtered question flow, see GOAL_CONCERN_TAGS
// in journeyGoals.ts). Kept out of a "use client" file's import graph —
// pulls in mongoose via connectDB, which breaks the browser bundle.
import { unstable_cache } from "next/cache";
import { connectDB } from "@/app/lib/mongodb";
import QuizConfig, { DEFAULT_QUIZ_CONFIG } from "@/app/models/QuizConfig";
import { migrateLegacyQuizConfig, backfillClinicalFields } from "@/app/lib/quizMigration";

export const getCachedQuizConfig = unstable_cache(
  async () => {
    try {
      await connectDB();
      const config = await (QuizConfig as any).findOne({}).lean();
      return config ? backfillClinicalFields(migrateLegacyQuizConfig(config)) : DEFAULT_QUIZ_CONFIG;
    } catch {
      return DEFAULT_QUIZ_CONFIG;
    }
  },
  // Bumped to v3 — Clinical Intake data model extension added
  // conditionTags/clinicalIndicators/confidenceLevel etc.; a stale v2-shaped
  // cache entry must not be served after this deploy. (v2 was the prior
  // bump: rigid concerns/skinTypes/... fields → generic questions[].)
  ["quiz-config-v3"],
  { revalidate: 300, tags: ["quiz-config"] }
);
