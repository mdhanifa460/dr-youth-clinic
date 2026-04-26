import { connectDB } from "@/app/lib/mongodb";
import Booking from "@/app/models/Booking";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { id, status } = await req.json();

  await connectDB();

  await Booking.findByIdAndUpdate(id, { status });

  return NextResponse.json({ success: true });
}