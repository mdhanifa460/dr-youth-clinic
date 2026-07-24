import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import Appointment from "@/app/models/Appointment";

export const dynamic = "force-dynamic";

const CONVERTED_STATUSES = ["treatment_completed", "closed"];

// Counts-only breakdowns — every dimension here comes straight off fields
// that already exist and are reliably populated. Deliberately does NOT
// report revenue: Appointment has no price field, and `service` is
// free-text (not a ref to the Service model), so any revenue number here
// would be a guess dressed up as a fact. Add a real price field first.
export async function GET(req: NextRequest) {
  const denied = await requirePermission("bookings", "view");
  if (denied) return denied;

  await connectDB();

  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo   = searchParams.get("dateTo") || "";

  const match: Record<string, any> = {};
  if (dateFrom || dateTo) {
    match.date = {};
    if (dateFrom) match.date.$gte = dateFrom;
    if (dateTo)   match.date.$lte = dateTo;
  }

  async function groupBy(field: string, lookup?: { from: string; as: string }) {
    const pipeline: any[] = [{ $match: match }];
    pipeline.push({ $group: { _id: `$${field}`, count: { $sum: 1 } } });
    if (lookup) {
      pipeline.push(
        { $lookup: { from: lookup.from, localField: "_id", foreignField: "_id", as: lookup.as } },
        { $unwind: { path: `$${lookup.as}`, preserveNullAndEmptyArrays: true } },
        { $project: { count: 1, name: { $ifNull: [`$${lookup.as}.name`, "Unassigned"] } } }
      );
    }
    pipeline.push({ $sort: { count: -1 } });
    return (Appointment as any).aggregate(pipeline);
  }

  const [byReceptionist, byDoctor, byBranch, bySource, byService, byStatus, byCounselor] = await Promise.all([
    groupBy("createdBy", { from: "adminusers", as: "user" }),
    groupBy("doctorId", { from: "doctors", as: "doctor" }),
    groupBy("branch"),
    groupBy("bookingSource"),
    groupBy("service"),
    groupBy("status"),
    groupBy("assignedCounselorId", { from: "adminusers", as: "user" }),
  ]);

  const total = byStatus.reduce((sum: number, s: any) => sum + s.count, 0);
  const convertedCount = byStatus.filter((s: any) => CONVERTED_STATUSES.includes(s._id)).reduce((sum: number, s: any) => sum + s.count, 0);
  const noShowCount = byStatus.find((s: any) => s._id === "no_show")?.count || 0;
  const cancelledCount = byStatus.find((s: any) => s._id === "cancelled")?.count || 0;

  return NextResponse.json({
    success: true,
    data: {
      total, convertedCount, noShowCount, cancelledCount,
      byReceptionist: byReceptionist.map((r: any) => ({ label: r.name || "Unassigned", count: r.count })),
      byCounselor: byCounselor.map((r: any) => ({ label: r.name || "Unassigned", count: r.count })),
      byDoctor: byDoctor.map((r: any) => ({ label: r.name || "Unknown", count: r.count })),
      byBranch: byBranch.map((r: any) => ({ label: r._id || "—", count: r.count })),
      bySource: bySource.map((r: any) => ({ label: r._id || "—", count: r.count })),
      byService: byService.map((r: any) => ({ label: r._id || "—", count: r.count })),
      byStatus: byStatus.map((r: any) => ({ label: r._id || "—", count: r.count })),
    },
  });
}
