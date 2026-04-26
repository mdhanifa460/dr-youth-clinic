import { connectDB } from "@/app/lib/mongodb";
import { requireAdminSession, unauthorized } from "@/app/lib/adminAuth";
import Booking from "@/app/models/Booking";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const allowedStatuses = new Set(["new", "confirmed", "done"]);
const BookingModel = Booking as {
  findById: (id: string) => Promise<{
    name: string;
    phone: string;
    service?: string;
    location?: string;
    date: string;
    time: string;
    concern?: string;
    status: string;
    save: () => Promise<unknown>;
  } | null>;
};

export async function POST(req: Request) {
  try {
    const session = await requireAdminSession();
    if (!session) return unauthorized();

    const body = await req.json();
    const { _id, name, phone, service, location, date, time, concern, status } =
      body;

    if (!_id || !name || !phone || !date || !time) {
      return NextResponse.json(
        { success: false, message: "Missing required booking fields" },
        { status: 400 }
      );
    }

    if (status && !allowedStatuses.has(status)) {
      return NextResponse.json(
        { success: false, message: "Invalid booking status" },
        { status: 400 }
      );
    }

    await connectDB();

    const updates = {
      name,
      phone,
      service,
      location,
      date,
      time,
      concern,
      status: status || "new",
    };

    const booking = await BookingModel.findById(_id);

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found" },
        { status: 404 }
      );
    }

    Object.assign(booking, updates);
    await booking.save();

    return NextResponse.json({ success: true, booking });
  } catch {
    return NextResponse.json(
      { success: false, message: "Could not update booking" },
      { status: 500 }
    );
  }
}
