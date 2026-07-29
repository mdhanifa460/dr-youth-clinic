import { getSiteConfig } from "@/app/lib/siteConfig";
import { resolveAllJourneyGoalBundles } from "@/app/lib/journeyGoals.server";
import { getCachedQuizConfig } from "@/app/lib/quizConfig.server";
import PlanMyJourneyClient from "./PlanMyJourneyClient";

// Unlike skin-quiz (fully client-driven against an admin-config API), this
// page's core differentiator IS real services/doctors/results — resolving
// all 4 goals once per request means switching goals client-side is
// instant (no fetch waterfall, no new API route needed for that part).
// quizConfig is fetched the same way so the goal-filtered intake questions
// (see GOAL_CONCERN_TAGS in journeyGoals.ts) come from the same admin-
// configured Clinical Intake engine skin-quiz uses — not a duplicate.
export const revalidate = 300;

export default async function PlanMyJourneyPage() {
  const [bundles, siteConfig, quizConfig] = await Promise.all([
    resolveAllJourneyGoalBundles(),
    getSiteConfig(),
    getCachedQuizConfig(),
  ]);

  return <PlanMyJourneyClient bundles={bundles} siteConfig={siteConfig} quizConfig={quizConfig} />;
}
