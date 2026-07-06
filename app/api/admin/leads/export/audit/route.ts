import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import LeadExportAuditLog from "@/app/models/LeadExportAuditLog";

export const dynamic = "force-dynamic";

// Only super_admin and clinic_owner may view the full audit log
export async function GET(req: NextRequest) {
  const denied = await requirePermission("leads", "full");
  if (denied) return denied;

  await connectDB();

  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = 20;

  const [logs, total] = await Promise.all([
    (LeadExportAuditLog as any)
      .find({})
      .sort({ exportedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    (LeadExportAuditLog as any).countDocuments({}),
  ]);

  return NextResponse.json({ success: true, logs, total, page, totalPages: Math.ceil(total / limit) });
}
