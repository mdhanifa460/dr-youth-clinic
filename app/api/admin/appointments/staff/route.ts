import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import AdminUser from "@/app/models/AdminUser";

export const dynamic = "force-dynamic";

// Narrow, name-only staff list for the Assign Receptionist/Counselor
// picker. Deliberately scoped to the 'bookings' permission (not 'team') —
// a receptionist creating appointments needs this list but has no access
// to full Team management, so reusing /api/admin/team here would lock them
// out of their own New Appointment modal.
export async function GET() {
  const denied = await requirePermission("bookings", "view");
  if (denied) return denied;

  try {
    await connectDB();
    const users = await (AdminUser as any)
      .find({ isActive: { $ne: false } })
      .select("name role")
      .sort({ name: 1 })
      .lean();
    return NextResponse.json({ success: true, data: users });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to fetch staff" }, { status: 500 });
  }
}
