import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { QrCode } from "@/app/models/QrCode";
import { requirePermission } from "@/app/lib/adminAuth";

export async function GET() {
  const denied = await requirePermission("ai-assessment", "view");
  if (denied) return denied;

  try {
    await connectDB();
    const codes = await (QrCode as any).find({}).sort({ createdAt: -1 }).limit(100).lean();
    return NextResponse.json({ success: true, data: codes });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to load QR codes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requirePermission("ai-assessment", "full");
  if (denied) return denied;

  try {
    const { name, clinicLocation, channel, campaign, targetUrl } = await req.json();
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ success: false, message: "Name is required" }, { status: 400 });
    }
    if (!targetUrl || typeof targetUrl !== "string") {
      return NextResponse.json({ success: false, message: "Target URL is required" }, { status: 400 });
    }

    await connectDB();
    const code = await QrCode.create({
      name: name.trim(),
      clinicLocation: clinicLocation || "",
      channel: channel || "",
      campaign: campaign || "",
      targetUrl,
    });
    return NextResponse.json({ success: true, data: code });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Failed to save QR code" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requirePermission("ai-assessment", "full");
  if (denied) return denied;

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ success: false, message: "id is required" }, { status: 400 });

    await connectDB();
    await (QrCode as any).findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Failed to delete QR code" }, { status: 500 });
  }
}
