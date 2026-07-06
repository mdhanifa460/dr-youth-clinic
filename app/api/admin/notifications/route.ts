import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import NotificationQueue from "@/app/models/NotificationQueue";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requirePermission("bookings", "view");
  if (denied) return denied;

  await connectDB();

  const { searchParams } = new URL(req.url);
  const appointmentId   = searchParams.get("appointmentId") || "";

  const query: Record<string, any> = {};
  if (appointmentId) query.appointmentId = appointmentId;

  const data = await (NotificationQueue as any)
    .find(query)
    .sort({ scheduledAt: -1 })
    .limit(20)
    .lean();

  return NextResponse.json({ success: true, data });
}
