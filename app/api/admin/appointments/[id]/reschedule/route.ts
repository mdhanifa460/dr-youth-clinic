import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { getAdminUser, requirePermission } from "@/app/lib/adminAuth";
import Appointment from "@/app/models/Appointment";
import AppointmentAuditLog from "@/app/models/AppointmentAuditLog";
import DoctorSlotBlock from "@/app/models/DoctorSlotBlock";
import { addMinutes, canReschedule, RESCHEDULE_REASONS } from "@/app/lib/appointmentFlow";
import { queueNotification } from "@/app/lib/appointmentQueue";
import type { RescheduleReason } from "@/app/models/Appointment";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("bookings", "full");
  if (denied) return denied;

  await connectDB();
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ success: false }, { status: 401 });

  const appt = await (Appointment as any).findById(params.id).lean() as any;
  if (!appt) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

  // Permission check
  if (!canReschedule(user.role, appt.status)) {
    return NextResponse.json({
      success: false,
      message: "You do not have permission to reschedule this appointment at its current stage.",
    }, { status: 403 });
  }

  // Branch / doctor scoping
  if (user.role === "doctor") {
    const linkedId = (user as any).linkedDoctorId;
    if (String(appt.doctorId) !== String(linkedId)) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }
  }

  const body = await req.json();
  const { newDate, newStartTime, reason, reasonDetail } = body as {
    newDate: string;
    newStartTime: string;
    reason: RescheduleReason;
    reasonDetail?: string;
  };

  if (!newDate || !newStartTime || !reason) {
    return NextResponse.json({ success: false, message: "New date, time, and reason are required." }, { status: 400 });
  }
  if (!RESCHEDULE_REASONS[reason]) {
    return NextResponse.json({ success: false, message: "Invalid reschedule reason." }, { status: 400 });
  }

  const newEndTime = addMinutes(newStartTime, appt.durationMinutes);

  // Double-booking check (exclude current appointment)
  const apptConflict = await (Appointment as any).findOne({
    doctorId:  appt.doctorId,
    date:      newDate,
    status:    { $nin: ["cancelled", "no_show"] },
    _id:       { $ne: appt._id },
    startTime: { $lt: newEndTime },
    endTime:   { $gt: newStartTime },
  }).lean();

  if (apptConflict) {
    return NextResponse.json({
      success: false,
      conflict: true,
      message: `Conflict: doctor already has an appointment at ${(apptConflict as any).startTime}–${(apptConflict as any).endTime}.`,
    }, { status: 409 });
  }

  const blockConflict = await (DoctorSlotBlock as any).findOne({
    doctorId:  appt.doctorId,
    date:      newDate,
    startTime: { $lt: newEndTime },
    endTime:   { $gt: newStartTime },
  }).lean();

  if (blockConflict) {
    return NextResponse.json({
      success: false,
      conflict: true,
      message: `Doctor has blocked this slot (${(blockConflict as any).blockType.replace(/_/g, " ")}).`,
    }, { status: 409 });
  }

  const reasonLabel = `${RESCHEDULE_REASONS[reason]}${reasonDetail ? ` — ${reasonDetail}` : ""}`;

  await (Appointment as any).findByIdAndUpdate(appt._id, {
    $set: {
      date:              newDate,
      startTime:         newStartTime,
      endTime:           newEndTime,
      status:            "confirmed",
      rescheduleCount:   (appt.rescheduleCount || 0) + 1,
      lastRescheduledAt: new Date(),
      lastUpdatedBy:     user._id,
    },
  });

  await AppointmentAuditLog.create({
    appointmentId: appt._id,
    action: "rescheduled",
    performedBy: { userId: user._id, name: user.name, email: user.email, role: user.role },
    details: {
      oldDate:      appt.date,
      oldStartTime: appt.startTime,
      newDate,
      newStartTime,
      reason:       RESCHEDULE_REASONS[reason],
      reasonDetail: reasonDetail || "",
    },
  });

  await queueNotification(
    { ...appt, date: newDate, startTime: newStartTime },
    "rescheduled",
    user._id
  );

  return NextResponse.json({ success: true });
}
