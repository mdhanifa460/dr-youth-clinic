import crypto from "crypto";
import type { NextRequest } from "next/server";
import { decryptCredential } from "@/app/lib/crm/encryption";

// Shared HMAC signature verification for any inbound webhook receiver —
// extracted from app/api/webhooks/crm/[connectorId]/route.ts (originally
// CRM-only) so the same logic doesn't get re-typed for every new webhook
// receiver this codebase adds (lead-source connectors, and whatever comes
// after them). `secretPayload` is a Connector's own encrypted
// webhookSecret — the caller looks that up, this just verifies against it.
export function verifyWebhookSignature(
  req: NextRequest,
  rawBody: string,
  secretPayload: { encrypted: string; iv: string; authTag: string } | undefined | null
): boolean {
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
