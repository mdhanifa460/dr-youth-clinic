import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import Connector from "@/app/models/Connector";
import ConnectorWebhookEvent from "@/app/models/ConnectorWebhookEvent";
import { checkRateLimit, tooManyRequestsResponse } from "@/app/lib/rateLimit";
import {
  getMetaCredential,
  verifyMetaLeadSignature,
  verifyMetaLeadChallenge,
  extractLeadgenEvents,
  processMetaLeadEvent,
} from "@/app/lib/leadSource/metaWebhookProcessing";

export const dynamic = "force-dynamic";

// Meta Lead Ads webhook — ONE connector receives every form/campaign/ad
// Meta ever sends here (see Connector.ts's own comment: a Connector is a
// provider/account, never a form; formId travels as metadata on the
// individual lead, not as a routing key here — see metaWebhookProcessing.ts).
// Deliberately a SEPARATE route from /api/webhooks/lead-source/[connectorId]
// (the generic JustDial/IndiaMART receiver) for the same reason
// /api/webhooks/whatsapp already isn't merged into it: Meta's protocol is
// genuinely different in shape (GET handshake, X-Hub-Signature-256, a
// batch entry[].changes[] envelope), not a stylistic preference.

// Meta's one-time verification handshake, performed whenever this URL is
// (re-)registered as a webhook subscription in the Meta App dashboard —
// mirrors app/api/webhooks/whatsapp/route.ts's own GET handler exactly,
// except the verify_token is THIS connector's own stored credential
// (getMetaCredential), not a global env var, since Meta Lead Ads is a real
// Connector row and WhatsApp inbound isn't.
export async function GET(req: NextRequest, { params }: { params: { connectorId: string } }) {
  await connectDB();
  const connector = await (Connector as any).findOne({ _id: params.connectorId, type: "lead_source" }).lean();
  if (!connector) return NextResponse.json({ success: false }, { status: 404 });

  const credential = await getMetaCredential(params.connectorId);
  if (!credential?.verifyToken) return NextResponse.json({ success: false }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (challenge && verifyMetaLeadChallenge(mode, token, credential.verifyToken)) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ success: false }, { status: 403 });
}

// Inbound leadgen events. Signature verification is Meta-specific
// (X-Hub-Signature-256 over this connector's own App Secret) — deliberately
// NOT the generic lead-source Connector HMAC (app/lib/webhookSignature.ts,
// which reads a different header name and a different secret concept) —
// same isolation app/lib/whatsapp/inboundSecurity.ts already establishes
// for exactly this reason.
export async function POST(req: NextRequest, { params }: { params: { connectorId: string } }) {
  const rl = await checkRateLimit(`meta-leads-webhook:${params.connectorId}`, 120, 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  await connectDB();

  const connector = await (Connector as any).findOne({ _id: params.connectorId, type: "lead_source" }).lean();
  if (!connector) {
    return NextResponse.json({ success: false, message: "Unknown Meta lead-source connector" }, { status: 404 });
  }

  const rawBody = await req.text();
  let payload: any = null;
  try { payload = rawBody ? JSON.parse(rawBody) : null; } catch { /* stored raw below regardless */ }

  const credential = await getMetaCredential(params.connectorId);
  const signatureValid = !!credential?.appSecret && verifyMetaLeadSignature(rawBody, req.headers.get("x-hub-signature-256"), credential.appSecret);

  // Every request is logged as a ConnectorWebhookEvent regardless of
  // signature validity — same reasoning as the generic lead-source
  // receiver: a misconfigured App Secret needs to be debuggable from the
  // connector's own Logs, never silently dropped.
  const logDoc = await (ConnectorWebhookEvent as any).create({
    connectorId: connector._id,
    event: "meta.leadgen",
    signatureValid,
    payload: payload ?? { raw: rawBody.slice(0, 5000) },
    status: signatureValid ? "received" : "ignored",
  });

  if (!signatureValid) {
    // 200, not 401/403 — Meta retries aggressively on a non-2xx response;
    // amplifying that noise from a misconfigured secret helps no one. The
    // event is still logged above for an admin to see why.
    console.error(`Meta leads webhook: invalid or missing X-Hub-Signature-256 for connector ${params.connectorId}`);
    return NextResponse.json({ success: true, processed: false, reason: "invalid signature" });
  }

  const events = extractLeadgenEvents(payload);
  const results = [];
  for (const change of events) {
    try {
      results.push(await processMetaLeadEvent(params.connectorId, change));
    } catch (err: any) {
      // Never let one malformed/failing leadgen event in a batch stop the
      // rest of that same POST's events from being processed.
      console.error(`Meta leadgen event processing failed (leadgen_id present, not logged):`, err?.message || err);
      results.push({ processed: false, reason: err?.message || "Unexpected error processing lead" });
    }
  }

  await (ConnectorWebhookEvent as any).findByIdAndUpdate(logDoc._id, {
    status: results.some((r) => r.processed) ? "processed" : (events.length ? "failed" : "ignored"),
    processedAt: new Date(),
    errorMessage: results.find((r) => !r.processed)?.reason || "",
  });

  // Always 200 once signature-valid — same reasoning as the WhatsApp
  // receiver: Meta doesn't need per-lead detail in the response, and a
  // non-2xx here would trigger unnecessary retries of already-logged
  // failures.
  return NextResponse.json({ success: true, processed: results.length, results });
}
