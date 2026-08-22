import crypto from "crypto";

// Meta's inbound WhatsApp webhook uses a COMPLETELY DIFFERENT verification
// mechanism from the generic lead-source Connector webhooks
// (app/lib/webhookSignature.ts, used by JustDial/IndiaMART): a single,
// account-level App Secret — an env var, same as WHATSAPP_TOKEN/
// PHONE_NUMBER_ID already are (WhatsApp isn't onboarded as a Connector row
// in this codebase, so there's no per-connector encrypted
// ConnectorCredential to verify against here) — checked via
// X-Hub-Signature-256, plus a one-time GET handshake Meta performs when a
// webhook URL is registered. Deliberately NOT reusing
// verifyWebhookSignature(): per explicit requirement, these two signature
// mechanisms stay isolated, since they are genuinely different provider
// protocols (HMAC over a connector-specific rotatable secret vs. HMAC over
// a fixed Meta App Secret).
//
// Required env vars (not yet configured in this environment — see the
// Phase 2 report's "Remaining provider configuration" section):
//   WHATSAPP_APP_SECRET  — from Meta App Dashboard → Settings → Basic
//   WHATSAPP_VERIFY_TOKEN — any string YOU choose, entered again in the
//                           Meta dashboard's webhook subscription screen

export function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret || !signatureHeader) return false;
  const provided = signatureHeader.replace(/^sha256=/, "");
  try {
    const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
    return provided.length === expected.length && crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

// Meta's GET verification handshake — performed once (and again any time
// the subscription is re-saved) when this URL is registered as the
// webhook callback in the Meta App dashboard. Echoes hub.challenge back
// only when hub.verify_token matches the value configured server-side.
export function verifyMetaChallenge(mode: string | null, token: string | null): boolean {
  return mode === "subscribe" && !!token && !!process.env.WHATSAPP_VERIFY_TOKEN && token === process.env.WHATSAPP_VERIFY_TOKEN;
}
