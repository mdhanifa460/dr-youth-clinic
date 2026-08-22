import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { checkRateLimit, tooManyRequestsResponse } from "@/app/lib/rateLimit";
import { verifyMetaSignature, verifyMetaChallenge } from "@/app/lib/whatsapp/inboundSecurity";
import { extractInboundMessages, processInboundWhatsAppMessage } from "@/app/lib/whatsapp/inboundProcessing";

export const dynamic = "force-dynamic";

// Meta's one-time verification handshake, performed whenever this URL is
// (re-)registered as the webhook callback in the Meta App dashboard. See
// app/lib/whatsapp/inboundSecurity.ts for what WHATSAPP_VERIFY_TOKEN is.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (challenge && verifyMetaChallenge(mode, token)) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ success: false }, { status: 403 });
}

// Inbound WhatsApp messages — closes the Google Ads → Website → WhatsApp
// CTA → CRM attribution loop (see app/lib/whatsappAttribution.ts and
// app/lib/whatsapp/inboundProcessing.ts). Resolves branch via the EXISTING
// multi-branch phone_number_id routing and creates/updates a Booking
// through the SAME Lead/Booking pipeline every other source already uses —
// never a separate WhatsApp lead model or a second branch-routing system.
//
// Signature verification is Meta-specific (X-Hub-Signature-256 over a
// fixed App Secret) and deliberately kept isolated from the generic
// lead-source Connector HMAC verification JustDial/IndiaMART use — see
// inboundSecurity.ts's own comment for why.
export async function POST(req: NextRequest) {
  const rl = await checkRateLimit("whatsapp-inbound-webhook", 300, 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  const rawBody = await req.text();
  const signatureValid = verifyMetaSignature(rawBody, req.headers.get("x-hub-signature-256"));

  if (!signatureValid) {
    // 200, not 401/403 — Meta retries aggressively on a non-2xx response.
    // A misconfigured WHATSAPP_APP_SECRET should be debuggable from
    // server logs, not amplify retry noise. Nothing is processed.
    console.error("Inbound WhatsApp webhook: invalid or missing X-Hub-Signature-256");
    return NextResponse.json({ success: true, processed: 0, reason: "invalid signature" });
  }

  let payload: unknown = null;
  try {
    payload = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    return NextResponse.json({ success: true, processed: 0, reason: "invalid JSON payload" });
  }
  if (!payload) return NextResponse.json({ success: true, processed: 0, reason: "empty payload" });

  await connectDB();

  const messages = extractInboundMessages(payload);
  const results = [];
  for (const msg of messages) {
    try {
      results.push(await processInboundWhatsAppMessage(msg));
    } catch (err: any) {
      console.error("Inbound WhatsApp message processing failed:", err?.message || err);
      results.push({ processed: false, reason: err?.message || "Unexpected error", attributed: false });
    }
  }

  // Always 200 once signature-valid — Meta doesn't need per-message detail
  // in the response, and a non-2xx here would trigger unnecessary retries
  // of already-logged failures.
  return NextResponse.json({ success: true, processed: results.length, results });
}
