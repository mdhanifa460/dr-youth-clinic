import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { AnimationAsset } from "@/app/models/AnimationAsset";
import { Banner } from "@/app/models/Banner";
import { requirePermission } from "@/app/lib/adminAuth";

export async function GET(req: NextRequest) {
  const denied = await requirePermission("animation-library", "view");
  if (denied) return denied;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const query: Record<string, any> = {};
    if (category) query.category = category;

    const assets = await (AnimationAsset as any).find(query).sort({ createdAt: -1 }).lean();

    // usageCount is deliberately computed on read, not stored — see the
    // Enterprise Experience & Theme Engine design doc's Task 4 Limitations
    // section on why a stored counter risks drift (same reasoning already
    // applied to Banner.targetPages being derived, not hook-maintained).
    // Only lottie/rive-type assets are actually cross-referenceable today:
    // a banner records its animation choice as a raw lottieUrl/riveUrl
    // string (Banner.experienceOverrides doesn't yet carry an assetId —
    // that's later wiring), so usage is measured by URL match. image/video
    // assets aren't yet linked back to any banner field, so they honestly
    // report 0 rather than a fabricated number.
    const lottieUrls = assets.filter((a: any) => a.type === "lottie" && a.file?.url).map((a: any) => a.file.url);
    const riveUrls = assets.filter((a: any) => a.type === "rive" && a.file?.url).map((a: any) => a.file.url);
    const counts: Record<string, number> = {};
    if (lottieUrls.length > 0) {
      const agg = await (Banner as any).aggregate([
        { $match: { lottieUrl: { $in: lottieUrls } } },
        { $group: { _id: "$lottieUrl", count: { $sum: 1 } } },
      ]);
      for (const row of agg) counts[row._id] = row.count;
    }
    if (riveUrls.length > 0) {
      const agg = await (Banner as any).aggregate([
        { $match: { riveUrl: { $in: riveUrls } } },
        { $group: { _id: "$riveUrl", count: { $sum: 1 } } },
      ]);
      for (const row of agg) counts[row._id] = row.count;
    }

    const data = assets.map((a: any) => ({
      ...a,
      usageCount: (a.type === "lottie" || a.type === "rive") && a.file?.url ? counts[a.file.url] || 0 : 0,
    }));

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to fetch animation assets" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requirePermission("animation-library", "full");
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();
    const asset = await AnimationAsset.create(body);
    return NextResponse.json({ success: true, data: asset }, { status: 201 });
  } catch (error: any) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors ?? {}).map((e: any) => e.message);
      return NextResponse.json({ success: false, message: messages.join(", ") }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: "Failed to create animation asset" }, { status: 500 });
  }
}
