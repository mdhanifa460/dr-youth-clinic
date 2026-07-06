import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import Booking from "@/app/models/Booking";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const allowedStatuses = new Set([
  "new","contacted","follow_up","confirmed","arrived","completed","no_show","cancelled",
  "done", // legacy — kept for backward compat
]);
const BookingModel = Booking as {
  findById: (id: string) => Promise<{
    status: string;
    save: () => Promise<unknown>;
  } | null>;
};

export async function POST(req: Request) {
  const denied = await requirePermission('bookings', 'full');
  if (denied) return denied;

  try {

    const { id, status } = await req.json();

    if (!id || !allowedStatuses.has(status)) {
      return NextResponse.json(
        { success: false, message: "Invalid booking status" },
        { status: 400 }
      );
    }

    await connectDB();

    const booking = await (BookingModel as any).findById(id);

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found" },
        { status: 404 }
      );
    }

    booking.status = status;
    await booking.save();

    return NextResponse.json({ success: true, booking });
  } catch {
    return NextResponse.json(
      { success: false, message: "Could not update booking status" },
      { status: 500 }
    );
  }
}
