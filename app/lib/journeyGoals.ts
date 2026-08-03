// Shared client-safe types for the AI Beauty Journey (formerly "Plan My
// Journey", app/(public)/plan-my-journey/). Deliberately has NO
// Mongoose/DB imports — this file is imported from PlanMyJourneyClient.tsx
// ("use client"), and pulling in app/lib/mongodb.ts (which transitively
// requires Node builtins like "net") from a client component breaks the
// browser bundle. The actual DB queries and goal metadata resolution live
// in journeyGoals.server.ts + app/models/JourneyConfig.ts, imported only
// from the server component (page.tsx), which passes the resolved
// IJourneyGoal[] + bundles down as props.
//
// Goal metadata (label/icon/heroGrad/doctor-matching/concern tags/CTA
// text) used to live here as hardcoded constants (JOURNEY_GOAL_META,
// GOAL_CONCERN_TAGS) — it's now admin-editable via JourneyConfig
// (app/models/JourneyConfig.ts, edited at /admin/journey), so a goal slug
// is just a string, not a fixed compile-time union anymore.
export type JourneyGoalSlug = string;

export interface JourneyGoalBundle {
  goal: JourneyGoalSlug;
  services: any[];
  doctors: any[];
  results: any[];
}
