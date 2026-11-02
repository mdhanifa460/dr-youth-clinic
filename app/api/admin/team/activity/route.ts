import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import AdminActivityLog from "@/app/models/AdminActivityLog";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const denied = await requirePermission("team", "view");
  if (denied) return denied;

  try {
    await connectDB();
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
    const email = req.nextUrl.searchParams.get("email");
    const filter = email ? { actorEmail: email } : {};

    const [logs, total, people] = await Promise.all([
      (AdminActivityLog as any)
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .lean(),
      (AdminActivityLog as any).countDocuments(filter),
      (AdminActivityLog as any).distinct("actorEmail"),
    ]);

    return NextResponse.json({
      success: true,
      data: logs,
      people: [...people].sort(),
      page,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to load activity" }, { status: 500 });
  }
}
