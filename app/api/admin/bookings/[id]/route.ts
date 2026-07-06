import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission, getAdminUser } from "@/app/lib/adminAuth";
import Booking from "@/app/models/Booking";
import { getSettings } from "@/app/models/Settings";
import { maskPhone } from "@/app/lib/phoneMask";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("bookings", "view");
  if (denied) return denied;

  await connectDB();
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ success: false }, { status: 401 });

  const booking = await (Booking as any).findById(params.id).lean() as any;
  if (!booking) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

  const settings = await getSettings();
  const allowedPhoneRoles: string[] = settings.contactPrivacy?.showPatientPhoneRoles
    ?? ["super_admin", "clinic_owner", "receptionist", "customer_support"];

  return NextResponse.json({
    success: true,
    data: {
      ...booking,
      phone: maskPhone(booking.phone || "", user.role, allowedPhoneRoles),
    },
  });
}

const ALLOWED_STATUSES = new Set([
  "new","contacted","follow_up","confirmed","arrived","completed","no_show","cancelled",
]);

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("bookings", "full");
  if (denied) return denied;

  await connectDB();
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ success: false }, { status: 401 });

  const body = await req.json();
  const {
    status, internalNote, treatmentValue, assignedTo,
    name, phone, email, service, location, date, time, concern, source,
  } = body;

  if (status && !ALLOWED_STATUSES.has(status)) {
    return NextResponse.json({ success: false, message: "Invalid status" }, { status: 400 });
  }

  const $set: Record<string, any> = {};
  if (status       !== undefined) {
    $set.status = status;
    if (status === "contacted" && body.setContactedAt) {
      $set.contactedAt = new Date();
    }
  }
  if (internalNote  !== undefined) $set.internalNote  = internalNote;
  if (treatmentValue !== undefined) $set.treatmentValue = treatmentValue;
  if (assignedTo    !== undefined) $set.assignedTo    = assignedTo;
  if (name          !== undefined) $set.name          = name;
  if (phone         !== undefined) $set.phone         = phone;
  if (email         !== undefined) $set.email         = email;
  if (service       !== undefined) $set.service       = service;
  if (location      !== undefined) $set.location      = location;
  if (date          !== undefined) $set.date          = date;
  if (time          !== undefined) $set.time          = time;
  if (concern       !== undefined) $set.concern       = concern;
  if (source        !== undefined) $set.source        = source;

  const updated = await (Booking as any).findByIdAndUpdate(
    params.id,
    { $set },
    { new: true }
  ).lean();

  if (!updated) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, data: updated });
}
