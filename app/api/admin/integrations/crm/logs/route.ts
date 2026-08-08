import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import Connector from "@/app/models/Connector";
import ConnectorLog from "@/app/models/ConnectorLog";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requirePermission("integrations", "view");
  if (denied) return denied;

  await connectDB();
  const connector = await (Connector as any).findOne({ type: "crm" }).lean();
  if (!connector) return NextResponse.json({ success: true, data: [], total: 0, page: 1, totalPages: 0 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(50, Number(searchParams.get("limit") || 20));
  const status = searchParams.get("status") || "";

  const query: Record<string, any> = { connectorId: connector._id };
  if (status) query.status = status;

  const [data, total] = await Promise.all([
    (ConnectorLog as any).find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    (ConnectorLog as any).countDocuments(query),
  ]);

  return NextResponse.json({ success: true, data, total, page, totalPages: Math.ceil(total / limit) });
}
