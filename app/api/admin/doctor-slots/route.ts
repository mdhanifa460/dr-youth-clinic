import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission, getAdminUser } from "@/app/lib/adminAuth";
import DoctorSlotBlock from "@/app/models/DoctorSlotBlock";
import { SLOT_BLOCK_ROLES } from "@/app/lib/appointmentFlow";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requirePermission("bookings", "view");
  if (denied) return denied;

  await connectDB();
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ success: false }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const doctorId  = searchParams.get("doctorId") || "";
  const dateFrom  = searchParams.get("dateFrom") || "";
  const dateTo    = searchParams.get("dateTo") || "";

  const query: Record<string, any> = {};
  if (doctorId) query.doctorId = doctorId;

  // Doctors see only their own blocks
  if (user.role === "doctor") {
    const linkedId = (user as any).linkedDoctorId;
    if (!linkedId) return NextResponse.json({ success: false, message: "Doctor profile not linked." }, { status: 403 });
    query.doctorId = linkedId;
  }

  if (dateFrom || dateTo) {
    query.date = {};
    if (dateFrom) query.date.$gte = dateFrom;
    if (dateTo)   query.date.$lte = dateTo;
  }

  const blocks = await (DoctorSlotBlock as any).find(query).sort({ date: 1, startTime: 1 }).lean();
  return NextResponse.json({ success: true, data: blocks });
}

export async function POST(req: NextRequest) {
  const denied = await requirePermission("bookings", "full");
  if (denied) return denied;

  await connectDB();
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ success: false }, { status: 401 });

  if (!SLOT_BLOCK_ROLES.includes(user.role)) {
    return NextResponse.json({ success: false, message: "Only doctors, clinic owners, and super admins can block slots." }, { status: 403 });
  }

  const { doctorId, doctorName, branch, date, startTime, endTime, blockType, reason } = await req.json();

  if (!doctorId || !date || !startTime || !endTime) {
    return NextResponse.json({ success: false, message: "doctorId, date, startTime, and endTime are required." }, { status: 400 });
  }

  // Doctors can only block their own slots
  if (user.role === "doctor") {
    const linkedId = (user as any).linkedDoctorId;
    if (String(doctorId) !== String(linkedId)) {
      return NextResponse.json({ success: false, message: "You can only block your own slots." }, { status: 403 });
    }
  }

  if (startTime >= endTime) {
    return NextResponse.json({ success: false, message: "Start time must be before end time." }, { status: 400 });
  }

  const block = await (DoctorSlotBlock as any).create({
    doctorId, doctorName: doctorName || "", branch: branch || "",
    date, startTime, endTime,
    blockType: blockType || "other",
    reason:    reason || "",
    createdBy: user._id,
  });

  return NextResponse.json({ success: true, data: block }, { status: 201 });
}
