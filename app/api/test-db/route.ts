import { connectDB } from "../../lib/mongodb";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  await connectDB();
  return NextResponse.json({ message: "DB Connected ✅" });
}
