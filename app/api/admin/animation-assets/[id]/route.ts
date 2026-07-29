import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { AnimationAsset } from "@/app/models/AnimationAsset";
import { requirePermission } from "@/app/lib/adminAuth";
import { deleteImage } from "@/app/lib/cloudinary";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("animation-library", "view");
  if (denied) return denied;

  try {
    await connectDB();
    const asset = await (AnimationAsset as any).findById(params.id).lean();
    if (!asset) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: asset });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to fetch animation asset" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("animation-library", "full");
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();
    const asset = await (AnimationAsset as any).findById(params.id);
    if (!asset) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    // A re-upload of the underlying file bumps the version — banners
    // reference the URL directly today (see the route.ts GET comment), so
    // this is metadata-only for now, but keeps the field meaningful once
    // Phase 3+ wiring resolves assets by id instead of raw URL.
    if (body.file?.url && body.file.url !== asset.file?.url) {
      body.version = (asset.version || 1) + 1;
    }

    Object.assign(asset, body);
    await asset.save();

    return NextResponse.json({ success: true, data: asset });
  } catch (error: any) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors ?? {}).map((e: any) => e.message);
      return NextResponse.json({ success: false, message: messages.join(", ") }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: "Failed to update animation asset" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("animation-library", "full");
  if (denied) return denied;

  try {
    await connectDB();
    const asset = await (AnimationAsset as any).findByIdAndDelete(params.id);
    if (!asset) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    const publicIds = [asset.file?.publicId, asset.previewImage?.publicId].filter(Boolean);
    Promise.all(publicIds.map((id: string) => deleteImage(id).catch(() => {}))).catch(() => {});

    return NextResponse.json({ success: true, message: "Animation asset deleted" });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to delete animation asset" }, { status: 500 });
  }
}
