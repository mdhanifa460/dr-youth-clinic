import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { Banner } from "@/app/models/Banner";
import { requirePermission } from "@/app/lib/adminAuth";
import { revalidateBannerPaths } from "@/app/lib/banners/revalidate";
import { spotlightPublishError } from "@/app/lib/banners/spotlight";

// Lightweight endpoint for the admin list's Enable/Disable toggle — avoids
// re-validating/re-saving the whole banner document just to flip one field.
export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const denied = await requirePermission("banners", "full");
  if (denied) return denied;

  try {
    const { status } = await req.json();
    if (!["draft", "active", "disabled"].includes(status)) {
      return NextResponse.json({ success: false, message: "Invalid status" }, { status: 400 });
    }

    await connectDB();
    // The list's Enable toggle must not slip a spotlight past the doctor-check gate.
    if (status === "active") {
      const current = await (Banner as any).findById(params.id).select("templateType headline spotlight").lean();
      const publishError = current && spotlightPublishError({ ...current, status });
      if (publishError) return NextResponse.json({ success: false, message: publishError }, { status: 400 });
    }
    const banner = await (Banner as any).findByIdAndUpdate(params.id, { $set: { status } }, { returnDocument: 'after' });
    if (!banner) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    revalidateBannerPaths(banner);

    return NextResponse.json({ success: true, data: banner });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to update status" }, { status: 500 });
  }
}
