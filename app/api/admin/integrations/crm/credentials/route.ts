import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import Connector from "@/app/models/Connector";
import ConnectorCredential from "@/app/models/ConnectorCredential";
import { encryptCredential, last4 } from "@/app/lib/crm/encryption";

export const dynamic = "force-dynamic";

// Write-only by design (architecture review §07/§13) — GET returns only
// authType + last4 for display ("••••••••4a2f"), never the secret itself,
// even to an admin who's already authenticated. Re-saving is how you
// "view" a credential: paste it again.
export async function GET() {
  const denied = await requirePermission("integrations", "view");
  if (denied) return denied;

  await connectDB();
  const connector = await (Connector as any).findOne({ type: "crm" });
  if (!connector) return NextResponse.json({ success: true, data: null });

  const cred = await (ConnectorCredential as any)
    .findOne({ connectorId: connector._id })
    .select("authType last4 rotatedAt")
    .lean();

  return NextResponse.json({ success: true, data: cred || null });
}

export async function PUT(req: NextRequest) {
  const denied = await requirePermission("integrations", "full");
  if (denied) return denied;

  await connectDB();
  const body = await req.json();
  const { authType, ...secretFields } = body;

  if (!authType || !["api_key", "bearer", "oauth2", "jwt", "basic", "custom_header"].includes(authType)) {
    return NextResponse.json({ success: false, message: "Invalid or missing authType" }, { status: 400 });
  }

  const connector = await (Connector as any).findOne({ type: "crm" });
  if (!connector) {
    return NextResponse.json({ success: false, message: "Create the CRM connector before saving credentials." }, { status: 404 });
  }

  const primarySecret =
    secretFields.key || secretFields.token || secretFields.password || secretFields.accessToken || "";
  const { encrypted, iv, authTag } = encryptCredential(JSON.stringify(secretFields));

  await (ConnectorCredential as any).findOneAndUpdate(
    { connectorId: connector._id },
    {
      connectorId: connector._id,
      authType,
      encrypted,
      iv,
      authTag,
      last4: primarySecret ? last4(String(primarySecret)) : "",
      rotatedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  return NextResponse.json({ success: true });
}
