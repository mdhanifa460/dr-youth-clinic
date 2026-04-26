import { connectDB } from "@/app/lib/mongodb";
import Booking from "@/app/models/Booking";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  await connectDB();

  await Booking.findByIdAndUpdate(body._id, body);

  return NextResponse.json({ success: true });
}