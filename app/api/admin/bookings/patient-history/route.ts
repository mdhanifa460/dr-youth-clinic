import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import Booking from "@/app/models/Booking";
import Appointment from "@/app/models/Appointment";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requirePermission("bookings", "view");
  if (denied) return denied;

  const phone = new URL(req.url).searchParams.get("phone") || "";
  if (!phone) return NextResponse.json({ success: false, message: "Phone required" }, { status: 400 });

  await connectDB();

  // Normalize — strip all non-digits then match last 10 digits
  const digits = phone.replace(/\D/g, "");
  const last10 = digits.slice(-10);
  const phoneRegex = new RegExp(last10 + "$");

  const [bookings, appointments] = await Promise.all([
    (Booking as any).find({ phone: phoneRegex }).sort({ createdAt: -1 }).limit(20).lean(),
    (Appointment as any).find({ patientPhone: phoneRegex }).sort({ date: -1 }).limit(20).lean(),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      bookings,
      appointments,
      totalVisits: bookings.length + appointments.length,
    },
  });
}
