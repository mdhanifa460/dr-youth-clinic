import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { CustomAnalyticsEventLog } from "@/app/models/CustomAnalyticsEventLog";
import { requirePermission } from "@/app/lib/adminAuth";

// Real firing-volume counts for the Overview page's chart — aggregates
// app/models/CustomAnalyticsEventLog.ts by event name over a recent
// window (default 30 days). Separate from the CRUD list route
// (app/api/admin/analytics/custom-events/route.ts) since this reads a
// different, much higher-write collection.
export async function GET(req: NextRequest) {
  const denied = await requirePermission("analytics", "view");
  if (denied) return denied;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const days = Math.min(90, Math.max(1, Number(searchParams.get("days")) || 30));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const rows = await (CustomAnalyticsEventLog as any).aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: "$name", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);

    const data = rows.map((r: any) => ({ name: r._id, count: r.count }));
    return NextResponse.json({ success: true, data, days });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to fetch event volume" }, { status: 500 });
  }
}
