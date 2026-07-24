import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission, getAdminUser } from "@/app/lib/adminAuth";
import Appointment from "@/app/models/Appointment";
import AppointmentAuditLog from "@/app/models/AppointmentAuditLog";

export const dynamic = "force-dynamic";

// GET — single appointment with audit log
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("bookings", "view");
  if (denied) return denied;

  await connectDB();
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ success: false }, { status: 401 });

  const appt = await (Appointment as any).findById(params.id)
    .populate("createdBy", "name role")
    .populate("lastUpdatedBy", "name role")
    .lean() as any;
  if (!appt) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

  // Branch / doctor scoping
  if (user.role === "doctor") {
    const linkedId = (user as any).linkedDoctorId;
    if (String(appt.doctorId) !== String(linkedId)) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }
  } else if (!user.assignedClinics.includes("all") && !user.assignedClinics.includes(appt.branch)) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const auditLog = await (AppointmentAuditLog as any)
    .find({ appointmentId: appt._id })
    .sort({ performedAt: 1 })
    .lean();

  return NextResponse.json({ success: true, data: appt, auditLog });
}

// PUT — update non-status fields (notes, pre-treatment checklist, etc.)
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("bookings", "full");
  if (denied) return denied;

  await connectDB();
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ success: false }, { status: 401 });

  const appt = await (Appointment as any).findById(params.id).lean() as any;
  if (!appt) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

  const body   = await req.json();
  const allowed = [
    "internalNotes", "postNotes", "preInstructions",
    "consentFormSigned", "patchTestDone", "patchTestDate",
    "roomNumber", "followUpDate",
  ];
  const update: Record<string, any> = { lastUpdatedBy: user._id };
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  await (Appointment as any).findByIdAndUpdate(params.id, { $set: update });

  await AppointmentAuditLog.create({
    appointmentId: appt._id,
    action: "note_added",
    performedBy: { userId: user._id, name: user.name, email: user.email, role: user.role },
    details: { fields: Object.keys(update).filter((k) => k !== "lastUpdatedBy") },
  });

  return NextResponse.json({ success: true });
}
