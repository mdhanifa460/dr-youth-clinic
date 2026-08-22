import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import Connector from "@/app/models/Connector";
import { encryptCredential, last4 } from "@/app/lib/crm/encryption";

export const dynamic = "force-dynamic";

// Same write-only pattern as /api/admin/integrations/crm/webhook-secret,
// scoped to one connector by _id — this is the value the sender (JustDial/
// IndiaMART/WhatsApp/etc.) HMAC-signs its requests with, verified by
// verifyWebhookSignature() in the receiver route.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("integrations", "view");
  if (denied) return denied;

  await connectDB();
  const connector = await (Connector as any)
    .findOne({ _id: params.id, type: "lead_source" })
    .select("webhookSecret.last4 _id")
    .lean();
  if (!connector) return NextResponse.json({ success: false, message: "Connector not found" }, { status: 404 });

  return NextResponse.json({
    success: true,
    data: { last4: connector.webhookSecret?.last4 || "", webhookUrl: `/api/webhooks/lead-source/${connector._id}` },
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("integrations", "full");
  if (denied) return denied;

  await connectDB();
  const { secret } = await req.json();
  if (!secret || typeof secret !== "string") {
    return NextResponse.json({ success: false, message: "secret is required" }, { status: 400 });
  }

  const connector = await (Connector as any).findOne({ _id: params.id, type: "lead_source" });
  if (!connector) return NextResponse.json({ success: false, message: "Connector not found" }, { status: 404 });

  const { encrypted, iv, authTag } = encryptCredential(secret);
  connector.webhookSecret = { encrypted, iv, authTag, last4: last4(secret) };
  await connector.save();

  return NextResponse.json({ success: true, webhookUrl: `/api/webhooks/lead-source/${connector._id}` });
}
