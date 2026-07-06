import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { getSettings } from "@/app/models/Settings";

export const dynamic = "force-dynamic";

export async function GET() {
  await connectDB();
  const settings = await getSettings();
  return NextResponse.json({
    phone:    settings.contact?.publicPhone    || "",
    whatsapp: settings.contact?.publicWhatsApp || "",
    email:    settings.contact?.publicEmail    || "",
  });
}
