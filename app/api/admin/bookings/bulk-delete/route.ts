import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import Booking from "@/app/models/Booking";

export const dynamic = "force-dynamic";

// Bulk delete for clearing test/junk leads at once — separate from the
// single DELETE on [id] rather than overloading it with an optional body,
// since "delete everything you send me" deserves its own explicit,
// harder-to-fat-finger endpoint.
export async function POST(req: NextRequest) {
  const denied = await requirePermission("bookings", "full");
  if (denied) return denied;

  await connectDB();
  const { ids } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ success: false, message: "ids[] is required" }, { status: 400 });
  }

  const result = await (Booking as any).deleteMany({ _id: { $in: ids } });
  return NextResponse.json({ success: true, deletedCount: result.deletedCount });
}
