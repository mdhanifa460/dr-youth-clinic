import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { getAdminUser, requirePermission } from "@/app/lib/adminAuth";
import Appointment from "@/app/models/Appointment";
import AppointmentAuditLog from "@/app/models/AppointmentAuditLog";
import AdminUser from "@/app/models/AdminUser";

export const dynamic = "force-dynamic";

// Sets who is WORKING this lead (receptionist/counselor) — distinct from
// createdBy, which is immutable and set once at creation. Either field can
// be reassigned any number of times; each change gets its own audit entry.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("bookings", "full");
  if (denied) return denied;

  await connectDB();
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ success: false }, { status: 401 });

  const { receptionistId, counselorId } = await req.json() as { receptionistId?: string | null; counselorId?: string | null };

  const appt = await (Appointment as any).findById(params.id).lean() as any;
  if (!appt) return NextResponse.json({ success: false, message: "Appointment not found" }, { status: 404 });

  if (user.role === "doctor") {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  } else if (!user.assignedClinics.includes("all") && !user.assignedClinics.includes(appt.branch)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const update: Record<string, any> = { lastUpdatedBy: user._id };
  const changes: Record<string, any> = {};

  if (receptionistId !== undefined) {
    if (receptionistId) {
      const staff = await (AdminUser as any).findById(receptionistId).select("name").lean();
      if (!staff) return NextResponse.json({ success: false, message: "Receptionist not found" }, { status: 400 });
      update.assignedReceptionistId = receptionistId;
      update.assignedReceptionistName = staff.name;
    } else {
      update.assignedReceptionistId = null;
      update.assignedReceptionistName = "";
    }
    changes.receptionist = update.assignedReceptionistName || "Unassigned";
  }

  if (counselorId !== undefined) {
    if (counselorId) {
      const staff = await (AdminUser as any).findById(counselorId).select("name").lean();
      if (!staff) return NextResponse.json({ success: false, message: "Counselor not found" }, { status: 400 });
      update.assignedCounselorId = counselorId;
      update.assignedCounselorName = staff.name;
    } else {
      update.assignedCounselorId = null;
      update.assignedCounselorName = "";
    }
    changes.counselor = update.assignedCounselorName || "Unassigned";
  }

  if (Object.keys(changes).length === 0) {
    return NextResponse.json({ success: false, message: "Nothing to assign" }, { status: 400 });
  }

  await (Appointment as any).findByIdAndUpdate(appt._id, { $set: update });

  await AppointmentAuditLog.create({
    appointmentId: appt._id,
    action: "assigned",
    performedBy: { userId: user._id, name: user.name, email: user.email, role: user.role },
    details: changes,
  });

  return NextResponse.json({ success: true, data: update });
}
