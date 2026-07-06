import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { getAdminUser, requirePermission } from "@/app/lib/adminAuth";
import Appointment from "@/app/models/Appointment";
import AppointmentAuditLog from "@/app/models/AppointmentAuditLog";
import type { AppointmentStatus } from "@/app/models/Appointment";
import { getAllowedTransitions, STATUS_META, TRANSITION_NOTIFICATIONS } from "@/app/lib/appointmentFlow";
import { queueNotification } from "@/app/lib/appointmentQueue";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("bookings", "full");
  if (denied) return denied;

  await connectDB();
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ success: false }, { status: 401 });

  const { toStatus, note } = await req.json() as { toStatus: AppointmentStatus; note?: string };

  const appt = await (Appointment as any).findById(params.id).lean() as any;
  if (!appt) return NextResponse.json({ success: false, message: "Appointment not found" }, { status: 404 });

  // Branch / doctor scoping
  if (user.role === "doctor") {
    const linkedId = (user as any).linkedDoctorId;
    if (String(appt.doctorId) !== String(linkedId)) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }
  } else if (!user.assignedClinics.includes("all") && !user.assignedClinics.includes(appt.branch)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  // Validate transition is allowed for this role
  const allowed = getAllowedTransitions(appt.status, user.role);
  const transition = allowed.find((t) => t.to === toStatus);
  if (!transition) {
    return NextResponse.json({
      success: false,
      message: `Your role (${user.role}) cannot transition from '${appt.status}' to '${toStatus}'.`,
    }, { status: 403 });
  }

  // Build timestamp fields for key events
  const timestamps: Record<string, Date | null> = {};
  const now = new Date();
  if (toStatus === "checked_in")            timestamps.checkedInAt           = now;
  if (toStatus === "consultation_started")  timestamps.consultationStartedAt = now;
  if (toStatus === "treatment_completed")   timestamps.treatmentCompletedAt  = now;

  await (Appointment as any).findByIdAndUpdate(appt._id, {
    $set: {
      status: toStatus,
      lastUpdatedBy: user._id,
      ...(note ? { internalNotes: [appt.internalNotes, note].filter(Boolean).join("\n\n") } : {}),
      ...timestamps,
    },
  });

  await AppointmentAuditLog.create({
    appointmentId: appt._id,
    action: "status_changed",
    performedBy: { userId: user._id, name: user.name, email: user.email, role: user.role },
    details: { oldStatus: appt.status, newStatus: toStatus, note },
  });

  // Queue WhatsApp notification if this transition triggers one
  const trigger = TRANSITION_NOTIFICATIONS[toStatus];
  if (trigger) await queueNotification({ ...appt, status: toStatus }, trigger, user._id);

  return NextResponse.json({
    success: true,
    newStatus: toStatus,
    label: STATUS_META[toStatus].label,
  });
}
