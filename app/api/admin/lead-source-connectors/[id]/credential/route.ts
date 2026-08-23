import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import Connector from "@/app/models/Connector";
import ConnectorCredential from "@/app/models/ConnectorCredential";
import { encryptCredential, last4 } from "@/app/lib/crm/encryption";

export const dynamic = "force-dynamic";

// Write-only by design, same as /api/admin/integrations/crm/credentials —
// GET returns only last4 for display ("••••••••4a2f"), never the secret
// itself. Re-saving is how you "view" it: paste it again. Reuses
// ConnectorCredential exactly as-is (no new model, no new encryption
// code) — the one thing this route adds is scoping it by connector _id
// instead of the CRM route's hardcoded `type: "crm"` lookup, since a
// lead_source connector (Meta, and any future provider that also needs an
// outbound-authenticated Graph/API call) can have more than one.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("integrations", "view");
  if (denied) return denied;

  await connectDB();
  const connector = await (Connector as any).findOne({ _id: params.id, type: "lead_source" }).lean();
  if (!connector) return NextResponse.json({ success: false, message: "Connector not found" }, { status: 404 });

  const cred = await (ConnectorCredential as any)
    .findOne({ connectorId: connector._id })
    .select("authType last4 rotatedAt")
    .lean();

  return NextResponse.json({ success: true, data: cred || null });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("integrations", "full");
  if (denied) return denied;

  await connectDB();
  const body = await req.json();
  // Meta specifically needs all three together (Graph API calls need the
  // access token; the webhook needs the app secret to verify
  // X-Hub-Signature-256 and the verify token to answer the GET handshake)
  // — stored as one encrypted JSON blob, same shape the CRM credentials
  // route already uses for its own provider-specific field sets.
  const { accessToken, appSecret, verifyToken } = body || {};
  if (!accessToken || typeof accessToken !== "string") {
    return NextResponse.json({ success: false, message: "accessToken is required" }, { status: 400 });
  }

  const connector = await (Connector as any).findOne({ _id: params.id, type: "lead_source" });
  if (!connector) return NextResponse.json({ success: false, message: "Connector not found" }, { status: 404 });

  const payload = { accessToken, appSecret: appSecret || "", verifyToken: verifyToken || "" };
  const { encrypted, iv, authTag } = encryptCredential(JSON.stringify(payload));

  await (ConnectorCredential as any).findOneAndUpdate(
    { connectorId: connector._id },
    {
      connectorId: connector._id,
      authType: "bearer",
      encrypted,
      iv,
      authTag,
      last4: last4(accessToken),
      rotatedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  return NextResponse.json({ success: true });
}
