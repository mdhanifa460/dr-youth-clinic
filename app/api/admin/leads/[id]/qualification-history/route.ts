import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import LeadQualificationHistory from "@/app/models/LeadQualificationHistory";

export const dynamic = "force-dynamic";

// "Why is this lead Hot?" — the current score/temperature and its
// breakdown live directly on the Booking (fast, no extra request, see
// LeadsClient.tsx). This route is only for the on-demand audit trail —
// how the score/temperature moved over time, including manual overrides
// and rule-change recalculations.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("leads", "view");
  if (denied) return denied;

  await connectDB();

  const history = await (LeadQualificationHistory as any)
    .find({ leadId: params.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("actor", "name email")
    .lean();

  return NextResponse.json({ success: true, data: history });
}
