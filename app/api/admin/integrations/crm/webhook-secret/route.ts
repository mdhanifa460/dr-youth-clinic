import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import Connector from "@/app/models/Connector";
import { encryptCredential, last4 } from "@/app/lib/crm/encryption";

export const dynamic = "force-dynamic";

// Write-only, same handling as /credentials — the CRM-issued signing
// secret that verifies inbound webhook requests. GET returns only last4.
export async function GET() {
  const denied = await requirePermission("integrations", "view");
  if (denied) return denied;

  await connectDB();
  const connector = await (Connector as any).findOne({ type: "crm" }).select("webhookSecret.last4 _id").lean();
  return NextResponse.json({
    success: true,
    data: connector
      ? { last4: connector.webhookSecret?.last4 || "", webhookUrl: `/api/webhooks/crm/${connector._id}` }
      : null,
  });
}

export async function PUT(req: NextRequest) {
  const denied = await requirePermission("integrations", "full");
  if (denied) return denied;

  await connectDB();
  const { secret } = await req.json();
  if (!secret || typeof secret !== "string") {
    return NextResponse.json({ success: false, message: "secret is required" }, { status: 400 });
  }

  const connector = await (Connector as any).findOne({ type: "crm" });
  if (!connector) {
    return NextResponse.json({ success: false, message: "Create the CRM connector before saving a webhook secret." }, { status: 404 });
  }

  const { encrypted, iv, authTag } = encryptCredential(secret);
  connector.webhookSecret = { encrypted, iv, authTag, last4: last4(secret) };
  await connector.save();

  return NextResponse.json({ success: true, webhookUrl: `/api/webhooks/crm/${connector._id}` });
}
