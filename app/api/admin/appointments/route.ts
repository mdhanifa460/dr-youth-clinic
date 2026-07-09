import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission, getAdminUser } from "@/app/lib/adminAuth";
import Appointment from "@/app/models/Appointment";
import AppointmentAuditLog from "@/app/models/AppointmentAuditLog";
import DoctorSlotBlock from "@/app/models/DoctorSlotBlock";
import { addMinutes } from "@/app/lib/appointmentFlow";
import { queueNotification } from "@/app/lib/appointmentQueue";
import { getSettings } from "@/app/models/Settings";
import { maskPhone } from "@/app/lib/phoneMask";

export const dynamic = "force-dynamic";

// ─── GET — list appointments ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const denied = await requirePermission("bookings", "view");
  if (denied) return denied;

  await connectDB();
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ success: false }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page         = Math.max(1, Number(searchParams.get("page") || 1));
  const limit        = Math.min(50, Number(searchParams.get("limit") || 20));
  const date         = searchParams.get("date") || "";
  const dateFrom     = searchParams.get("dateFrom") || "";
  const dateTo       = searchParams.get("dateTo") || "";
  const status       = searchParams.get("status") || "";
  const doctorId     = searchParams.get("doctorId") || "";
  const branch       = searchParams.get("branch") || "";
  const type         = searchParams.get("type") || "";
  const search       = searchParams.get("search") || "";
  const todayOnly    = searchParams.get("todayOnly") === "true";

  const query: Record<string, any> = {};

  // Role-based scoping
  if (user.role === "doctor") {
    const linkedId = (user as any).linkedDoctorId;
    if (!linkedId) return NextResponse.json({ success: false, message: "Doctor profile not linked. Contact your admin." }, { status: 403 });
    query.doctorId = linkedId;
  } else if (!user.assignedClinics.includes("all")) {
    query.branch = { $in: user.assignedClinics };
  }

  if (branch && user.role !== "doctor") query.branch = branch;
  if (doctorId && user.role !== "doctor") query.doctorId = doctorId;
  if (status)  query.status  = status;
  if (type)    query.appointmentType = type;

  if (todayOnly) {
    query.date = new Date().toISOString().slice(0, 10);
  } else if (date) {
    query.date = date;
  } else if (dateFrom || dateTo) {
    query.date = {};
    if (dateFrom) query.date.$gte = dateFrom;
    if (dateTo)   query.date.$lte = dateTo;
  }

  if (search) {
    query.$or = [
      { patientName:  { $regex: search, $options: "i" } },
      { patientPhone: { $regex: search, $options: "i" } },
      { service:      { $regex: search, $options: "i" } },
    ];
  }

  const [rawData, total, settings] = await Promise.all([
    (Appointment as any).find(query).sort({ date: 1, startTime: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    (Appointment as any).countDocuments(query),
    getSettings(),
  ]);

  const allowedPhoneRoles: string[] = settings.contactPrivacy?.showPatientPhoneRoles ?? ["super_admin", "clinic_owner", "receptionist", "customer_support"];
  const phoneMaskEnabled = settings.contactPrivacy?.phoneMaskEnabled ?? true;
  const data = rawData.map((appt: any) => ({
    ...appt,
    patientPhone: maskPhone(appt.patientPhone || "", user.role, allowedPhoneRoles, phoneMaskEnabled),
  }));

  return NextResponse.json({ success: true, data, total, page, totalPages: Math.ceil(total / limit) });
}

// ─── POST — create appointment ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const denied = await requirePermission("bookings", "full");
  if (denied) return denied;

  await connectDB();
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ success: false }, { status: 401 });

  // Reception and content_editor cannot create appointments — only booking-full roles
  if (user.role === "doctor") {
    return NextResponse.json({ success: false, message: "Doctors cannot create appointments." }, { status: 403 });
  }

  const body = await req.json();
  const {
    patientName, patientPhone, patientEmail,
    branch, doctorId, doctorName,
    service, appointmentType, durationMinutes,
    date, startTime,
    skinConcern, treatmentArea, bookingSource,
    patchTestRequired, consentFormSigned,
    sessionNumber, totalSessions, packageName,
    roomNumber, internalNotes,
  } = body;

  if (!patientName || !patientPhone || !branch || !doctorId || !service || !date || !startTime) {
    return NextResponse.json({ success: false, message: "Missing required fields." }, { status: 400 });
  }

  // Branch restriction check
  if (!user.assignedClinics.includes("all") && !user.assignedClinics.includes(branch)) {
    return NextResponse.json({ success: false, message: "You do not have access to this branch." }, { status: 403 });
  }

  const duration = Number(durationMinutes) || 30;
  const endTime  = addMinutes(startTime, duration);

  // ── Double-booking check: doctor appointments ──
  const doctorConflict = await (Appointment as any).findOne({
    doctorId,
    date,
    status: { $nin: ["cancelled", "no_show"] },
    startTime: { $lt: endTime },
    endTime:   { $gt: startTime },
  }).lean();

  if (doctorConflict) {
    return NextResponse.json({
      success: false,
      message: `Doctor has an existing appointment at ${(doctorConflict as any).startTime}–${(doctorConflict as any).endTime}. Please choose a different time.`,
      conflict: true,
    }, { status: 409 });
  }

  // ── Double-booking check: doctor slot blocks ──
  const blockConflict = await (DoctorSlotBlock as any).findOne({
    doctorId,
    date,
    startTime: { $lt: endTime },
    endTime:   { $gt: startTime },
  }).lean();

  if (blockConflict) {
    return NextResponse.json({
      success: false,
      message: `Doctor has blocked this slot (${(blockConflict as any).blockType.replace(/_/g, " ")}). Please choose a different time.`,
      conflict: true,
    }, { status: 409 });
  }

  // Generate appointment ID
  const dateStr = date.replace(/-/g, "");
  const rand    = Math.random().toString(36).slice(2, 6).toUpperCase();
  const appointmentId = `DRY-${dateStr}-${rand}`;

  const appointment = await (Appointment as any).create({
    appointmentId,
    patientName, patientPhone, patientEmail: patientEmail || "",
    branch, doctorId, doctorName,
    service, appointmentType: appointmentType || "consultation",
    durationMinutes: duration,
    date, startTime, endTime,
    skinConcern: skinConcern || "",
    treatmentArea: treatmentArea || "",
    bookingSource: bookingSource || "phone",
    patchTestRequired: patchTestRequired ?? false,
    consentFormSigned: consentFormSigned ?? false,
    sessionNumber: sessionNumber ?? null,
    totalSessions: totalSessions ?? null,
    packageName: packageName || "",
    roomNumber: roomNumber || "",
    internalNotes: internalNotes || "",
    status: "requested",
    createdBy: user._id,
    lastUpdatedBy: user._id,
  });

  // Audit log
  await AppointmentAuditLog.create({
    appointmentId: appointment._id,
    action: "created",
    performedBy: { userId: user._id, name: user.name, email: user.email, role: user.role },
    details: { status: "requested", branch, doctorName, date, startTime },
  });

  // Queue notification
  await queueNotification(appointment, "booking_confirmed", user._id);

  return NextResponse.json({ success: true, data: appointment }, { status: 201 });
}

