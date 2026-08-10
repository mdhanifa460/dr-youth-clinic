import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import Connector from "@/app/models/Connector";
import ConnectorWebhookEvent from "@/app/models/ConnectorWebhookEvent";

export const dynamic = "force-dynamic";

// Read-only list for the CRM Sync page's "Recent activity from your CRM"
// panel — every inbound lead.created/invoice.created/updated call the CRM
// makes, whether it processed successfully or not, so a non-technical
// admin can see "did the CRM actually call us" without reading server logs.
export async function GET(req: NextRequest) {
  const denied = await requirePermission("integrations", "view");
  if (denied) return denied;

  await connectDB();
  const connector = await (Connector as any).findOne({ type: "crm" }).lean();
  if (!connector) return NextResponse.json({ success: true, data: [] });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(50, Number(searchParams.get("limit") || 20));

  const data = await (ConnectorWebhookEvent as any)
    .find({ connectorId: connector._id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return NextResponse.json({ success: true, data });
}
