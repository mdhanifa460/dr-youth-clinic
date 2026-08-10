import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import { InterestEvent } from "@/app/models/InterestEvent";
import { getPersonalizationConfig } from "@/app/models/PersonalizationConfig";

export const dynamic = "force-dynamic";

// Read-only reporting over the raw InterestEvent collection — answers "how
// much interest signal have we actually collected, and in which
// categories" now that Phase 1/2 track and score it. No time window filter:
// data volume is bounded by the model's own 180-day TTL index, so "all of
// it" is already a reasonable, small range.
export async function GET() {
  const denied = await requirePermission("settings", "view");
  if (denied) return denied;

  await connectDB();

  const [byCategory, byEventType, visitorIds, config] = await Promise.all([
    (InterestEvent as any).aggregate([
      { $group: { _id: "$category", count: { $sum: 1 }, visitors: { $addToSet: "$visitorId" } } },
      { $project: { _id: 0, category: "$_id", count: 1, visitorCount: { $size: "$visitors" } } },
      { $sort: { count: -1 } },
    ]),
    (InterestEvent as any).aggregate([
      { $group: { _id: "$eventType", count: { $sum: 1 } } },
      { $project: { _id: 0, eventType: "$_id", count: 1 } },
      { $sort: { count: -1 } },
    ]),
    (InterestEvent as any).distinct("visitorId"),
    getPersonalizationConfig(),
  ]);

  // Label categories using the admin's configured list where possible —
  // an event's category is a free string, so one with no matching config
  // entry (e.g. a category since renamed or removed) still shows up
  // labeled with its raw key rather than silently disappearing.
  const labelByKey = new Map(config.categories.map((c) => [c.key, c.label]));
  const categories = byCategory.map((c: any) => ({
    key: c.category,
    label: labelByKey.get(c.category) || c.category,
    count: c.count,
    visitorCount: c.visitorCount,
  }));

  return NextResponse.json({
    success: true,
    data: {
      totalEvents: byCategory.reduce((sum: number, c: any) => sum + c.count, 0),
      totalVisitorsTracked: visitorIds.length,
      categories,
      eventTypes: byEventType,
    },
  });
}
