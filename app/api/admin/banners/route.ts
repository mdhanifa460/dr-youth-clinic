import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { Banner } from "@/app/models/Banner";
import { requirePermission } from "@/app/lib/adminAuth";
import { deriveTargetPages } from "@/app/lib/banners/resolveBanner";
import { revalidateBannerPaths } from "@/app/lib/banners/revalidate";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requirePermission("banners", "view");
  if (denied) return denied;

  try {
    await connectDB();
    const banners = await (Banner as any).find({}).sort({ order: 1, createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: banners });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to fetch banners" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requirePermission("banners", "full");
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();
    body.targetPages = deriveTargetPages(body);
    const banner = await Banner.create(body);
    revalidateBannerPaths(banner);
    return NextResponse.json({ success: true, data: banner }, { status: 201 });
  } catch (error: any) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors ?? {}).map((e: any) => e.message);
      return NextResponse.json({ success: false, message: messages.join(", ") }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: "Failed to create banner" }, { status: 500 });
  }
}
