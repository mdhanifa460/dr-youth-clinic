import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import Appointment from "@/app/models/Appointment";
import DoctorSlotBlock from "@/app/models/DoctorSlotBlock";
import { addMinutes } from "@/app/lib/appointmentFlow";

export const dynamic = "force-dynamic";

// GET ?doctorId=X&date=YYYY-MM-DD&startTime=HH:MM&durationMinutes=N&excludeId=Y
export async function GET(req: NextRequest) {
  const denied = await requirePermission("bookings", "view");
  if (denied) return denied;

  await connectDB();

  const { searchParams } = new URL(req.url);
  const doctorId        = searchParams.get("doctorId") || "";
  const date            = searchParams.get("date") || "";
  const startTime       = searchParams.get("startTime") || "";
  const durationMinutes = Number(searchParams.get("durationMinutes") || 30);
  const excludeId       = searchParams.get("excludeId") || "";

  if (!doctorId || !date || !startTime) {
    return NextResponse.json({ success: false, message: "doctorId, date, and startTime are required." }, { status: 400 });
  }

  const endTime = addMinutes(startTime, durationMinutes);

  const apptQuery: Record<string, any> = {
    doctorId,
    date,
    status:    { $nin: ["cancelled", "no_show"] },
    startTime: { $lt: endTime },
    endTime:   { $gt: startTime },
  };
  if (excludeId) apptQuery._id = { $ne: excludeId };

  const [apptConflict, blockConflict] = await Promise.all([
    (Appointment as any).findOne(apptQuery).lean(),
    (DoctorSlotBlock as any).findOne({
      doctorId,
      date,
      startTime: { $lt: endTime },
      endTime:   { $gt: startTime },
    }).lean(),
  ]);

  const available = !apptConflict && !blockConflict;

  return NextResponse.json({
    success: true,
    available,
    conflict: available ? null : {
      type:    apptConflict ? "appointment" : "slot_block",
      from:    apptConflict ? (apptConflict as any).startTime : (blockConflict as any).startTime,
      to:      apptConflict ? (apptConflict as any).endTime   : (blockConflict as any).endTime,
      reason:  apptConflict
        ? `Patient: ${(apptConflict as any).patientName}`
        : `Blocked: ${(blockConflict as any).blockType.replace(/_/g, " ")}`,
    },
  });
}
