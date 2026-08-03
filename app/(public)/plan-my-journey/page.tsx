import { getSiteConfig } from "@/app/lib/siteConfig";
import { resolveJourneyGoals } from "@/app/lib/journeyGoals.server";
import { getCachedQuizConfig } from "@/app/lib/quizConfig.server";
import { getJourneyConfig } from "@/app/models/JourneyConfig";
import PlanMyJourneyClient from "./PlanMyJourneyClient";

// Unlike skin-quiz (fully client-driven against an admin-config API), this
// page's core differentiator IS real services/doctors/results — resolving
// every enabled goal once per request means switching goals client-side is
// instant (no fetch waterfall, no new API route needed for that part).
// quizConfig is fetched the same way so the goal-filtered intake questions
// (see concernTags on JourneyConfig.goals) come from the same admin-
// configured Clinical Intake engine skin-quiz uses — not a duplicate.
export const revalidate = 300;

export default async function PlanMyJourneyPage() {
  const [{ goals, bundles }, siteConfig, quizConfig, journeyConfig] = await Promise.all([
    resolveJourneyGoals(),
    getSiteConfig(),
    getCachedQuizConfig(),
    getJourneyConfig(),
  ]);

  return (
    <PlanMyJourneyClient
      goals={goals}
      bundles={bundles}
      siteConfig={siteConfig}
      quizConfig={quizConfig}
      enablePhotoCapture={journeyConfig.enablePhotoCapture}
    />
  );
}
