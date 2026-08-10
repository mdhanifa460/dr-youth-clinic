import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import Invoice from "@/app/models/Invoice";

export const dynamic = "force-dynamic";

// Read-only list for the CRM Sync page's "Recent invoices" panel — invoices
// arrive exclusively via the CRM webhook (see webhookProcessing.ts), this
// route never writes.
export async function GET(req: NextRequest) {
  const denied = await requirePermission("integrations", "view");
  if (denied) return denied;

  await connectDB();
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(50, Number(searchParams.get("limit") || 20));

  const [data, total] = await Promise.all([
    (Invoice as any).find({}).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    (Invoice as any).countDocuments({}),
  ]);

  return NextResponse.json({ success: true, data, total, page, totalPages: Math.ceil(total / limit) });
}
