import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { Banner } from "@/app/models/Banner";
import { requirePermission } from "@/app/lib/adminAuth";
import { deleteImage } from "@/app/lib/cloudinary";
import { deriveTargetPages } from "@/app/lib/banners/resolveBanner";
import { revalidateBannerPaths } from "@/app/lib/banners/revalidate";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("banners", "view");
  if (denied) return denied;

  try {
    await connectDB();
    const banner = await (Banner as any).findById(params.id).lean();
    if (!banner) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: banner });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to fetch banner" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("banners", "full");
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();
    body.targetPages = deriveTargetPages(body);
    const banner = await (Banner as any).findByIdAndUpdate(params.id, body, { new: true, runValidators: true });
    if (!banner) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    revalidateBannerPaths(banner);

    return NextResponse.json({ success: true, data: banner });
  } catch (error: any) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors ?? {}).map((e: any) => e.message);
      return NextResponse.json({ success: false, message: messages.join(", ") }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: "Failed to update banner" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("banners", "full");
  if (denied) return denied;

  try {
    await connectDB();
    const banner = await (Banner as any).findByIdAndDelete(params.id);
    if (!banner) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    // Fire-and-forget Cloudinary cleanup — never block the delete response
    // on it, matching how the rest of the admin treats media cleanup as
    // best-effort (ImageUpload.tsx's client-side deleteFromCloudinary does
    // the same).
    const publicIds = [banner.desktopImage?.publicId, banner.mobileImage?.publicId, banner.beforeImage?.publicId, banner.video?.publicId].filter(Boolean);
    Promise.all(publicIds.map((id: string) => deleteImage(id).catch(() => {}))).catch(() => {});

    revalidateBannerPaths(banner);

    return NextResponse.json({ success: true, message: "Banner deleted" });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to delete banner" }, { status: 500 });
  }
}
