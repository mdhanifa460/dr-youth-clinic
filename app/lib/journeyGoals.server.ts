// Server-only DB resolution for "Plan My Journey" / the AI Beauty Journey —
// split out of journeyGoals.ts specifically so this file's Mongoose/mongodb
// imports (which transitively need Node builtins like "net") never end up
// in a client bundle. Only import this from server components
// (app/(public)/plan-my-journey/page.tsx), never from PlanMyJourneyClient.tsx.
//
// Goal metadata now comes from JourneyConfig (admin-editable via
// /admin/journey) instead of the old hardcoded JOURNEY_GOAL_META constant
// — see app/models/JourneyConfig.ts for why. journeyGoals.ts's
// JOURNEY_GOALS/JOURNEY_GOAL_META/GOAL_CONCERN_TAGS constants still exist
// as the DEFAULT values a fresh JourneyConfig doc is seeded with, but are
// no longer read directly by any resolution path — resolveJourneyGoals()
// below is the new single source of truth.
import { connectDB } from "@/app/lib/mongodb";
import { Service } from "@/app/models/Service";
import { Doctor } from "@/app/models/Doctor";
import { Result } from "@/app/models/Result";
import { getJourneyConfig, type IJourneyGoal } from "@/app/models/JourneyConfig";
import type { JourneyGoalBundle } from "@/app/lib/journeyGoals";

function toRegex(source: string): RegExp | null {
  if (!source) return null;
  try {
    return new RegExp(source, "i");
  } catch {
    // An admin-entered regex that fails to compile shouldn't 500 the page
    // — treat it as "no filter" rather than breaking goal resolution.
    return null;
  }
}

// Highest-priced-first as the auto-pick proxy for "flagship" service —
// Service has no bookingCount/featured field to rank by instead.
export async function resolveServicesForGoal(meta: IJourneyGoal) {
  const query: Record<string, any> = { status: "active", category: meta.category };
  const nameFilter = toRegex(meta.nameFilterSource);
  if (nameFilter) query.name = { $regex: nameFilter };
  return (Service as any).find(query).sort({ price: -1 }).limit(3).lean();
}

// location is optional — omitted for the initial server render (the page
// doesn't yet know the visitor's clinic), same "pull a wider pool,
// narrow client-side" approach the service/category pages already use for
// banners. Once the client detects a clinic (see useClinicLocation in
// PlanMyJourneyClient.tsx), it re-fetches through /api/journey-doctors
// with a location, which calls this same function — the query shape here
// (`locations: { $in: [location, 'all'] }`) matches the existing
// precedent in getLocationDoctors (app/(public)/page.tsx) and the service
// detail page's doctor lookup.
export async function resolveDoctorsForGoal(meta: IJourneyGoal, location?: string) {
  const doctorRegex = toRegex(meta.doctorRegexSource);
  const locationFilter = location ? { locations: { $in: [location, "all"] } } : {};
  const matched = doctorRegex
    ? await (Doctor as any)
        .find({ active: true, specializations: { $regex: doctorRegex }, ...locationFilter })
        .sort({ order: 1 })
        .limit(6)
        .lean()
    : [];
  if (matched.length > 0) return matched;
  // specializations is admin free-text with no controlled taxonomy — a
  // goal with no textual match falls back to the general top-doctors list
  // (still location-filtered when a location is known) rather than
  // showing nothing.
  return (Doctor as any).find({ active: true, ...locationFilter }).sort({ order: 1 }).limit(6).lean();
}

export async function resolveResultsForGoal(meta: IJourneyGoal, serviceIds: string[]) {
  if (serviceIds.length > 0) {
    const bySvc = await (Result as any)
      .find({ active: true, service: { $in: serviceIds } })
      .sort({ order: 1, createdAt: -1 })
      .limit(6)
      .lean();
    if (bySvc.length > 0) return bySvc;
  }
  // Fall back to a category-label text match — realistic for niche goals
  // (e.g. weight-loss), which likely have no Result docs tagged to their
  // exact _id yet.
  return (Result as any)
    .find({ active: true, category: { $regex: meta.label, $options: "i" } })
    .sort({ order: 1, createdAt: -1 })
    .limit(6)
    .lean();
}

export async function resolveJourneyGoalBundle(meta: IJourneyGoal): Promise<JourneyGoalBundle> {
  await connectDB();
  const services = await resolveServicesForGoal(meta);
  const [doctors, results] = await Promise.all([
    resolveDoctorsForGoal(meta),
    resolveResultsForGoal(meta, services.map((s: any) => String(s._id))),
  ]);
  return { goal: meta.slug, services, doctors, results };
}

// The new single entry point: resolves the admin-configured, enabled goals
// (JourneyConfig) alongside their service/doctor/result bundles in one
// call. Replaces resolveAllJourneyGoalBundles() — callers now get both the
// goal metadata (label/icon/heroGrad/ctaLabel/concernTags, all
// admin-editable) and the resolved bundles together, since the goal list
// itself is no longer a fixed compile-time constant the client can import.
export async function resolveJourneyGoals(): Promise<{
  goals: IJourneyGoal[];
  bundles: Record<string, JourneyGoalBundle>;
}> {
  await connectDB();
  const config = await getJourneyConfig();
  const goals = [...config.goals].filter((g) => g.enabled).sort((a, b) => a.order - b.order);
  const entries = await Promise.all(goals.map((g) => resolveJourneyGoalBundle(g)));
  const bundles = Object.fromEntries(entries.map((b) => [b.goal, b]));
  return { goals, bundles };
}
