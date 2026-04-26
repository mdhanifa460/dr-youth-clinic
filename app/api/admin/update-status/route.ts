import { connectDB } from "@/app/lib/mongodb";
import { requireAdminSession, unauthorized } from "@/app/lib/adminAuth";
import Booking from "@/app/models/Booking";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const allowedStatuses = new Set(["new", "confirmed", "done"]);
const BookingModel = Booking as {
  findById: (id: string) => Promise<{
    status: string;
    save: () => Promise<unknown>;
  } | null>;
};

export async function POST(req: Request) {
  try {
    const session = await requireAdminSession();
    if (!session) return unauthorized();

    const { id, status } = await req.json();

    if (!id || !allowedStatuses.has(status)) {
      return NextResponse.json(
        { success: false, message: "Invalid booking status" },
        { status: 400 }
      );
    }

    await connectDB();

    const booking = await BookingModel.findById(id);

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
