import { getSiteConfig } from "@/app/lib/siteConfig";
import { resolveAllJourneyGoalBundles } from "@/app/lib/journeyGoals.server";
import PlanMyJourneyClient from "./PlanMyJourneyClient";

// Unlike skin-quiz (fully client-driven against an admin-config API), this
// page's core differentiator IS real services/doctors/results — resolving
// all 4 goals once per request means switching goals client-side is
// instant (no fetch waterfall, no new API route needed for that part).
export const revalidate = 300;

export default async function PlanMyJourneyPage() {
  const [bundles, siteConfig] = await Promise.all([
    resolveAllJourneyGoalBundles(),
    getSiteConfig(),
  ]);

  return <PlanMyJourneyClient bundles={bundles} siteConfig={siteConfig} />;
}
