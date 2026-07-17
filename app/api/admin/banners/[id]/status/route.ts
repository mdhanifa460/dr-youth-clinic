import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { Banner } from "@/app/models/Banner";
import { requirePermission } from "@/app/lib/adminAuth";
import { revalidateBannerPaths } from "@/app/lib/banners/revalidate";

// Lightweight endpoint for the admin list's Enable/Disable toggle — avoids
// re-validating/re-saving the whole banner document just to flip one field.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("banners", "full");
  if (denied) return denied;

  try {
    const { status } = await req.json();
    if (!["draft", "active", "disabled"].includes(status)) {
      return NextResponse.json({ success: false, message: "Invalid status" }, { status: 400 });
    }

    await connectDB();
    const banner = await (Banner as any).findByIdAndUpdate(params.id, { $set: { status } }, { new: true });
    if (!banner) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    revalidateBannerPaths(banner);

    return NextResponse.json({ success: true, data: banner });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to update status" }, { status: 500 });
  }
}
