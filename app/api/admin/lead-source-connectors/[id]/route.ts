import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import Connector from "@/app/models/Connector";
import ConnectorFieldMapping from "@/app/models/ConnectorFieldMapping";
import ConnectorWebhookEvent from "@/app/models/ConnectorWebhookEvent";
import ConnectorCredential from "@/app/models/ConnectorCredential";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("integrations", "full");
  if (denied) return denied;

  await connectDB();
  const body = await req.json();
  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") patch.name = body.name;
  if (typeof body.provider === "string") patch.provider = body.provider.trim().toLowerCase();
  if (typeof body.status === "string" && ["active", "paused", "error", "draft"].includes(body.status)) patch.status = body.status;

  const connector = await (Connector as any).findOneAndUpdate(
    { _id: params.id, type: "lead_source" },
    { $set: patch },
    { new: true }
  );
  if (!connector) return NextResponse.json({ success: false, message: "Connector not found" }, { status: 404 });

  return NextResponse.json({ success: true, data: connector });
}

// Removing a lead-source connector doesn't touch any Booking it already
// created — those stay exactly as they are, same as deleting any other
// admin-configured source. Only its own config/mapping/logs go with it.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("integrations", "full");
  if (denied) return denied;

  await connectDB();
  const connector = await (Connector as any).findOneAndDelete({ _id: params.id, type: "lead_source" });
  if (!connector) return NextResponse.json({ success: false, message: "Connector not found" }, { status: 404 });

  await (ConnectorFieldMapping as any).deleteMany({ connectorId: params.id });
  await (ConnectorWebhookEvent as any).deleteMany({ connectorId: params.id });
  // Additive — no lead_source provider used ConnectorCredential before
  // Meta (JustDial/IndiaMART/WhatsApp are inbound-receive-only, no
  // outbound-authenticated call, so this was never previously reachable
  // for this route). Meta's Graph API access token/App Secret/verify
  // token now live here (see app/api/admin/lead-source-connectors/[id]/
  // credential/route.ts) — leaving it behind on delete would silently
  // orphan an encrypted credential forever.
  await (ConnectorCredential as any).deleteMany({ connectorId: params.id });

  return NextResponse.json({ success: true });
}
