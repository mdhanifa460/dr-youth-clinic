import { connectDB } from "../../../lib/mongodb";
import Booking from "../../../models/Booking";
import { NextResponse } from "next/server";

export async function GET() {
  await connectDB();

  const bookings = await Booking.find().sort({ createdAt: -1 });

  return NextResponse.json(bookings);
}