import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission, getAdminUser } from "@/app/lib/adminAuth";
import { branchCondition } from "@/app/lib/branchAccess";
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

  const user = await getAdminUser();
  if (!user) return NextResponse.json({ success: false }, { status: 401 });

  // Only leads in this user's branches are deleted; any other ids are skipped
  // (deletedCount tells the caller how many actually went).
  const query: Record<string, any> = { _id: { $in: ids } };
  const scope = branchCondition(user);
  if (scope) query.location = scope;

  const result = await (Booking as any).deleteMany(query);
  return NextResponse.json({ success: true, deletedCount: result.deletedCount });
}
