import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/app/lib/mongodb";
import Connector from "@/app/models/Connector";
import ConnectorWebhookEvent from "@/app/models/ConnectorWebhookEvent";
import { decryptCredential } from "@/app/lib/crm/encryption";
import { checkRateLimit, tooManyRequestsResponse } from "@/app/lib/rateLimit";
import { processCrmWebhookEvent } from "@/app/lib/crm/webhookProcessing";

export const dynamic = "force-dynamic";

// Single receiver for every inbound CRM event — most CRMs let you register
// only one callback URL, not one per event type, so `event` is read from
// the payload body (falling back to a query param for CRMs that do encode
// it in the URL) rather than being a route segment. There is no existing
// inbound-webhook pattern anywhere else in this codebase to generalize
// from (flagged in the architecture review, §08) — this is genuinely new
// surface area.
//
// Every request is logged as a ConnectorWebhookEvent regardless of
// signature validity — a misconfigured secret needs to be debuggable from
// the Sync Manager's Logs tab, not silently dropped.
export async function POST(req: NextRequest, { params }: { params: { connectorId: string } }) {
  // Rate-limited per connector, not per IP — a legitimate CRM can burst-send
  // many events from one address, and IP-based limiting would throttle the
  // CRM itself rather than an attacker.
  const rl = await checkRateLimit(`crm-webhook:${params.connectorId}`, 120, 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  await connectDB();

  const connector = await (Connector as any).findById(params.connectorId).lean();
  if (!connector) {
    return NextResponse.json({ success: false, message: "Unknown connector" }, { status: 404 });
  }

  const rawBody = await req.text();
  let payload: any = null;
  try { payload = rawBody ? JSON.parse(rawBody) : null; } catch { /* stored raw below regardless */ }

  const signatureValid = verifySignature(req, rawBody, connector);
  const event = payload?.event || payload?.type || req.nextUrl.searchParams.get("event") || "unknown";

  const logDoc = await (ConnectorWebhookEvent as any).create({
    connectorId: connector._id,
    event,
    signatureValid,
    payload: payload ?? { raw: rawBody.slice(0, 5000) },
    status: signatureValid ? "received" : "ignored",
  });

  if (!signatureValid) {
    // 200, not 401/403 — most webhook senders retry aggressively on
    // non-2xx, which would just multiply the noise from a misconfigured
    // secret. The event is logged either way for an admin to investigate.
    return NextResponse.json({ success: true, processed: false, reason: "invalid signature" });
  }

  let result: { processed: boolean; reason?: string };
  try {
    result = await processCrmWebhookEvent(String(connector._id), event, payload);
  } catch (e: any) {
    result = { processed: false, reason: e?.message || "Processing failed" };
  }

  await (ConnectorWebhookEvent as any).findByIdAndUpdate(logDoc._id, {
    status: result.processed ? "processed" : "failed",
    processedAt: new Date(),
    errorMessage: result.reason || "",
  });

  return NextResponse.json({ success: true, ...result });
}

function verifySignature(req: NextRequest, rawBody: string, connector: any): boolean {
  const secretPayload = connector.webhookSecret;
  if (!secretPayload?.encrypted) return false;

  const header = req.headers.get("x-webhook-signature") || req.headers.get("x-signature") || "";
  if (!header) return false;

  try {
    const secret = decryptCredential({
      encrypted: secretPayload.encrypted,
      iv: secretPayload.iv,
      authTag: secretPayload.authTag,
    });
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    const provided = header.replace(/^sha256=/, "");
    return provided.length === expected.length && crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}
