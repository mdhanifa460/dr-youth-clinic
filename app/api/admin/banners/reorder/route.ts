import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { Banner } from "@/app/models/Banner";
import { requirePermission } from "@/app/lib/adminAuth";
import { revalidateTag } from "next/cache";

// Bulk-updates admin-list display `order` only — never touches `priority`,
// which drives banner selection, not list position (see app/models/Banner.ts).
export async function PATCH(req: NextRequest) {
  const denied = await requirePermission("banners", "full");
  if (denied) return denied;

  try {
    await connectDB();
    const { order } = (await req.json()) as { order: { id: string; order: number }[] };
    if (!Array.isArray(order) || order.length === 0) {
      return NextResponse.json({ success: false, message: "order array is required" }, { status: 400 });
    }

    await (Banner as any).bulkWrite(
      order.map(({ id, order: pos }) => ({
        updateOne: { filter: { _id: id }, update: { $set: { order: pos } } },
      }))
    );

    revalidateTag("banners");
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to reorder banners" }, { status: 500 });
  }
}
