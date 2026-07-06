import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission, getAdminUser } from "@/app/lib/adminAuth";
import Booking from "@/app/models/Booking";
import Appointment from "@/app/models/Appointment";
import AppointmentAuditLog from "@/app/models/AppointmentAuditLog";
import DoctorSlotBlock from "@/app/models/DoctorSlotBlock";
import { addMinutes } from "@/app/lib/appointmentFlow";
import { queueNotification } from "@/app/lib/appointmentQueue";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("bookings", "full");
  if (denied) return denied;

  await connectDB();
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ success: false }, { status: 401 });

  const booking = await (Booking as any).findById(params.id).lean() as any;
  if (!booking) return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });

  if (booking.convertedToAppointmentId) {
    return NextResponse.json({
      success: false,
      message: "This booking has already been converted to an appointment.",
      appointmentId: booking.convertedToAppointmentId,
    }, { status: 409 });
  }

  const body = await req.json();
  const {
    doctorId, doctorName,
    date, startTime, durationMinutes,
    appointmentType, branch,
  } = body;

  if (!doctorId || !doctorName || !date || !startTime) {
    return NextResponse.json({ success: false, message: "doctorId, doctorName, date and startTime are required." }, { status: 400 });
  }

  const duration  = Number(durationMinutes) || 30;
  const endTime   = addMinutes(startTime, duration);
  const useBranch = branch || booking.location || "";

  // Double-booking check
  const apptConflict = await (Appointment as any).findOne({
    doctorId,
    date,
    status: { $nin: ["cancelled","no_show"] },
    startTime: { $lt: endTime },
    endTime:   { $gt: startTime },
  }).lean();
  if (apptConflict) {
    return NextResponse.json({
      success: false,
      conflict: true,
      message: `Doctor has a conflict at ${(apptConflict as any).startTime}–${(apptConflict as any).endTime}.`,
    }, { status: 409 });
  }

  const blockConflict = await (DoctorSlotBlock as any).findOne({
    doctorId,
    date,
    startTime: { $lt: endTime },
    endTime:   { $gt: startTime },
  }).lean();
  if (blockConflict) {
    return NextResponse.json({
      success: false,
      conflict: true,
      message: `Doctor blocked this slot (${(blockConflict as any).blockType}).`,
    }, { status: 409 });
  }

  const dateStr = date.replace(/-/g, "");
  const rand    = Math.random().toString(36).slice(2, 6).toUpperCase();

  const appointment = await (Appointment as any).create({
    appointmentId:    `DRY-${dateStr}-${rand}`,
    patientName:      booking.name,
    patientPhone:     booking.phone,
    patientEmail:     booking.email || "",
    branch:           useBranch,
    doctorId,
    doctorName,
    service:          booking.service || "",
    appointmentType:  appointmentType || "consultation",
    durationMinutes:  duration,
    date,
    startTime,
    endTime,
    skinConcern:      booking.concern || "",
    bookingSource:    "website",
    status:           "confirmed",
    createdBy:        user._id,
    lastUpdatedBy:    user._id,
    sourceBookingId:  booking._id,
  });

  await AppointmentAuditLog.create({
    appointmentId: appointment._id,
    action: "created",
    performedBy: { userId: user._id, name: user.name, email: user.email, role: user.role },
    details: { status: "confirmed", branch: useBranch, doctorName, date, startTime, convertedFromBooking: booking.bookingId },
  });

  // Mark the booking as converted
  await (Booking as any).findByIdAndUpdate(params.id, {
    $set: {
      convertedToAppointmentId: appointment._id,
      status: "confirmed",
    },
  });

  await queueNotification(appointment, "booking_confirmed", user._id);

  return NextResponse.json({
    success: true,
    appointment: {
      _id: appointment._id,
      appointmentId: appointment.appointmentId,
    },
  }, { status: 201 });
}
