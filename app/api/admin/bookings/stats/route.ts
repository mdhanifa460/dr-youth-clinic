import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission, getAdminUser } from "@/app/lib/adminAuth";
import Booking from "@/app/models/Booking";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const denied = await requirePermission("bookings", "view");
  if (denied) return denied;

  await connectDB();
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ success: false }, { status: 401 });

  const locationFilter: Record<string, any> = {};
  if (!user.assignedClinics.includes("all")) {
    locationFilter.location = { $in: user.assignedClinics };
  }

  const today = new Date().toISOString().slice(0, 10);
  const todayStart = new Date(today);
  const todayEnd   = new Date(today + "T23:59:59.999Z");

  const [statusCounts, todayNew, pipelineAgg, sourceAgg, responseTimeAgg] = await Promise.all([
    // Count by status (all time)
    (Booking as any).aggregate([
      { $match: locationFilter },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),

    // New bookings today
    (Booking as any).countDocuments({
      ...locationFilter,
      status: "new",
      createdAt: { $gte: todayStart, $lte: todayEnd },
    }),

    // Pipeline value (sum of treatmentValue for confirmed + arrived bookings)
    (Booking as any).aggregate([
      { $match: { ...locationFilter, status: { $in: ["confirmed", "arrived"] }, treatmentValue: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$treatmentValue" }, count: { $sum: 1 } } },
    ]),

    // Lead source breakdown
    (Booking as any).aggregate([
      { $match: locationFilter },
      { $group: { _id: "$source", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),

    // Avg response time (hours from createdAt to contactedAt)
    (Booking as any).aggregate([
      { $match: { ...locationFilter, contactedAt: { $ne: null } } },
      {
        $group: {
          _id: null,
          avgResponseMs: {
            $avg: { $subtract: ["$contactedAt", "$createdAt"] },
          },
        },
      },
    ]),
  ]);

  const byStatus: Record<string, number> = {};
  for (const row of statusCounts) {
    byStatus[row._id || "new"] = row.count;
  }

  const pipeline = pipelineAgg[0] || { total: 0, count: 0 };
  const avgResponseMs = responseTimeAgg[0]?.avgResponseMs || null;
  const avgResponseHours = avgResponseMs ? Math.round(avgResponseMs / (1000 * 60 * 60) * 10) / 10 : null;

  const sourceBreakdown: Record<string, number> = {};
  for (const row of sourceAgg) {
    sourceBreakdown[row._id || "other"] = row.count;
  }

  return NextResponse.json({
    success: true,
    data: {
      byStatus,
      todayNew,
      pipelineValue: pipeline.total,
      pipelineCount: pipeline.count,
      avgResponseHours,
      sourceBreakdown,
      total: Object.values(byStatus).reduce((a, b) => a + b, 0),
    },
  });
}
