// Server-only DB resolution for "Plan My Journey" — split out of
// journeyGoals.ts specifically so this file's Mongoose/mongodb imports
// (which transitively need Node builtins like "net") never end up in a
// client bundle. Only import this from server components
// (app/(public)/plan-my-journey/page.tsx), never from PlanMyJourneyClient.tsx.
import { connectDB } from "@/app/lib/mongodb";
import { Service } from "@/app/models/Service";
import { Doctor } from "@/app/models/Doctor";
import { Result } from "@/app/models/Result";
import { JOURNEY_GOALS, JOURNEY_GOAL_META, type JourneyGoalSlug, type JourneyGoalBundle } from "@/app/lib/journeyGoals";

// Highest-priced-first as the auto-pick proxy for "flagship" service —
// Service has no bookingCount/featured field to rank by instead.
export async function resolveServicesForGoal(goal: JourneyGoalSlug) {
  const meta = JOURNEY_GOAL_META[goal];
  const query: Record<string, any> = { status: "active", category: meta.category };
  if (meta.nameFilter) query.name = { $regex: meta.nameFilter };
  return (Service as any).find(query).sort({ price: -1 }).limit(3).lean();
}

// No location filter at this stage — the client narrows to the visitor's
// clinic once known (matches skin-quiz's ?clinic= convention), same
// "pull a wider pool, narrow client-side" approach used there.
export async function resolveDoctorsForGoal(goal: JourneyGoalSlug) {
  const meta = JOURNEY_GOAL_META[goal];
  const matched = await (Doctor as any)
    .find({ active: true, specializations: { $regex: meta.doctorRegex } })
    .sort({ order: 1 })
    .limit(6)
    .lean();
  if (matched.length > 0) return matched;
  // specializations is admin free-text with no controlled taxonomy — a
  // goal with no textual match falls back to the general top-doctors list
  // rather than showing nothing.
  return (Doctor as any).find({ active: true }).sort({ order: 1 }).limit(6).lean();
}

export async function resolveResultsForGoal(goal: JourneyGoalSlug, serviceIds: string[]) {
  const meta = JOURNEY_GOAL_META[goal];
  if (serviceIds.length > 0) {
    const bySvc = await (Result as any)
      .find({ active: true, service: { $in: serviceIds } })
      .sort({ order: 1, createdAt: -1 })
      .limit(6)
      .lean();
    if (bySvc.length > 0) return bySvc;
  }
  // Fall back to a category-label text match — realistic for the two
  // niche weight-loss services, which likely have no Result docs tagged
  // to their exact _id yet.
  return (Result as any)
    .find({ active: true, category: { $regex: meta.label, $options: "i" } })
    .sort({ order: 1, createdAt: -1 })
    .limit(6)
    .lean();
}

export async function resolveJourneyGoalBundle(goal: JourneyGoalSlug): Promise<JourneyGoalBundle> {
  await connectDB();
  const services = await resolveServicesForGoal(goal);
  const [doctors, results] = await Promise.all([
    resolveDoctorsForGoal(goal),
    resolveResultsForGoal(goal, services.map((s: any) => String(s._id))),
  ]);
  return { goal, services, doctors, results };
}

export async function resolveAllJourneyGoalBundles(): Promise<Record<JourneyGoalSlug, JourneyGoalBundle>> {
  await connectDB();
  const entries = await Promise.all(JOURNEY_GOALS.map((g) => resolveJourneyGoalBundle(g)));
  return Object.fromEntries(entries.map((b) => [b.goal, b])) as Record<JourneyGoalSlug, JourneyGoalBundle>;
}
