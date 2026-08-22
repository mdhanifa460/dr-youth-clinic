import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import Connector from "@/app/models/Connector";
import ConnectorWebhookEvent from "@/app/models/ConnectorWebhookEvent";
import { checkRateLimit, tooManyRequestsResponse } from "@/app/lib/rateLimit";
import { processLeadSourceWebhookEvent } from "@/app/lib/leadSource/webhookProcessing";
import { verifyWebhookSignature } from "@/app/lib/webhookSignature";

export const dynamic = "force-dynamic";

// Single, generic receiver for EVERY third-party lead source — JustDial,
// IndiaMART, WhatsApp, or any future provider. One Connector (type:
// "lead_source") = one URL here, keyed by connectorId exactly like the
// CRM webhook receiver this is mirrored from
// (app/api/webhooks/crm/[connectorId]/route.ts). A new provider is never
// a new route: it's a new Connector row + its own field mapping (Admin →
// Integrations → that connector → Field Mapping, capability "Intake") +
// registering THIS URL with them. See app/lib/leadSource/
// webhookProcessing.ts for the actual translation + branch-routing logic.
//
// Every request is logged as a ConnectorWebhookEvent regardless of
// signature validity, same reasoning as the CRM receiver: a misconfigured
// secret or an unmapped field needs to be debuggable from the connector's
// own Logs, not silently dropped.
export async function POST(req: NextRequest, { params }: { params: { connectorId: string } }) {
  const rl = await checkRateLimit(`lead-source-webhook:${params.connectorId}`, 120, 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  await connectDB();

  const connector = await (Connector as any).findById(params.connectorId).lean();
  if (!connector || connector.type !== "lead_source") {
    return NextResponse.json({ success: false, message: "Unknown lead-source connector" }, { status: 404 });
  }

  const rawBody = await req.text();
  let payload: any = null;
  try { payload = rawBody ? JSON.parse(rawBody) : null; } catch { /* stored raw below regardless */ }

  const signatureValid = verifyWebhookSignature(req, rawBody, connector.webhookSecret);

  const logDoc = await (ConnectorWebhookEvent as any).create({
    connectorId: connector._id,
    event: "lead.intake",
    signatureValid,
    payload: payload ?? { raw: rawBody.slice(0, 5000) },
    status: signatureValid ? "received" : "ignored",
  });

  if (!signatureValid) {
    // 200, not 401/403 — same reasoning as the CRM receiver: most senders
    // retry aggressively on non-2xx, which would just multiply noise from
    // a misconfigured secret. The event is logged for an admin to see why.
    return NextResponse.json({ success: true, processed: false, reason: "invalid signature" });
  }

  let result;
  try {
    result = await processLeadSourceWebhookEvent(params.connectorId, payload);
  } catch (err: any) {
    result = { processed: false, reason: err?.message || "Unexpected error processing lead" };
  }

  await (ConnectorWebhookEvent as any).findByIdAndUpdate(logDoc._id, {
    status: result.processed ? "processed" : "failed",
    processedAt: new Date(),
    errorMessage: result.reason || "",
  });

  return NextResponse.json({ success: true, ...result });
}
