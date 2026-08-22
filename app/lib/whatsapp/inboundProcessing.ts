import Booking from "@/app/models/Booking";
import { resolveBranchForLead } from "@/app/lib/leadSourceMapping/resolveBranch";
import { buildDedupQuery } from "@/app/lib/leadSource/webhookProcessing";
import { extractAttributionTokenFromMessage, decodeAttributionToken } from "@/app/lib/whatsappAttribution";
import { normalizePhone } from "@/app/lib/phone";
import { qualifyAndPersist } from "@/app/lib/leadQualification/persist";

// Closes the WhatsApp attribution loop: Google Ads → Website → WhatsApp
// CTA (token embedded, see whatsappAttribution.ts) → this inbound webhook
// → the SAME Lead/Booking pipeline every other source uses. Deliberately
// no separate WhatsApp lead model and no separate branch-routing system —
// resolveBranchForLead() and Booking are reused exactly as they already
// are for JustDial/IndiaMART and the website itself.

export interface InboundWhatsAppMessage {
  phoneNumberId: string; // Meta's metadata.phone_number_id — WHICH of our branch numbers received this
  from: string;           // sender's wa_id (phone number, no '+')
  messageId: string;      // Meta's own message id (wamid...) — our idempotency key
  text: string;
  contactName?: string;
}

// Pure — parses Meta's actual WhatsApp Cloud API webhook payload shape
// (documented at developers.facebook.com/docs/whatsapp/cloud-api/webhooks/
// payload-examples) into the flat shape above. The same endpoint also
// delivers non-message "changes" (status callbacks — sent/delivered/read
// receipts, and changes with `field !== "messages"`) — those are silently
// skipped here, not errors. Only `type: "text"` messages are extracted:
// every other message type (image, audio, location, button reply, ...)
// has no text body to carry our attribution token in, so there is nothing
// for this module to attribute differently — its branch still gets
// created via the same Booking pipeline if a future extension adds
// non-text handling, but that's explicitly out of scope here.
export function extractInboundMessages(payload: unknown): InboundWhatsAppMessage[] {
  const out: InboundWhatsAppMessage[] = [];
  const entries = Array.isArray((payload as any)?.entry) ? (payload as any).entry : [];
  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      if (change?.field !== "messages") continue;
      const value = change?.value || {};
      const phoneNumberId = String(value?.metadata?.phone_number_id || "");
      const messages = Array.isArray(value?.messages) ? value.messages : [];
      const contacts = Array.isArray(value?.contacts) ? value.contacts : [];
      for (const msg of messages) {
        if (msg?.type !== "text") continue;
        const contact = contacts.find((c: any) => c?.wa_id === msg?.from);
        out.push({
          phoneNumberId,
          from: String(msg?.from || ""),
          messageId: String(msg?.id || ""),
          text: String(msg?.text?.body || ""),
          contactName: contact?.profile?.name ? String(contact.profile.name) : undefined,
        });
      }
    }
  }
  return out;
}

export interface ProcessInboundResult {
  processed: boolean;
  reason?: string;
  bookingId?: unknown;
  branch?: string | null;
  // True only when a valid attribution token was found and decoded —
  // false covers BOTH "no token present" and "token present but
  // unparseable" (edited/truncated by the customer). Either way the
  // conversion is still recorded, just as conversionChannel="whatsapp"
  // with source="whatsapp" itself rather than a guessed campaign — see
  // this function's fieldsToSet comment below.
  attributed: boolean;
}

export async function processInboundWhatsAppMessage(msg: InboundWhatsAppMessage): Promise<ProcessInboundResult> {
  if (!msg.messageId) return { processed: false, reason: "Missing message id", attributed: false };

  const phone = normalizePhone(msg.from);
  if (!phone) return { processed: false, reason: "Missing/invalid sender phone", attributed: false };

  // Branch resolution — the EXISTING multi-branch WhatsApp routing
  // (resolveBranchForLead's whatsappPhoneNumberId priority, see
  // app/lib/leadSourceMapping/resolveBranch.ts), the same function
  // outbound sending and JustDial/IndiaMART already use. Never guesses:
  // an unresolved branch still saves the lead, flagged for manual
  // assignment, exactly like every other lead-source path.
  const resolved = await resolveBranchForLead({ source: "whatsapp", whatsappPhoneNumberId: msg.phoneNumberId });

  // Attribution token — see whatsappAttribution.ts's contract in full. A
  // missing or unparseable token is NOT an error condition; it means this
  // conversation carries no recoverable campaign attribution, which is
  // recorded honestly (source stays "whatsapp" itself) rather than guessed.
  const token = extractAttributionTokenFromMessage(msg.text);
  const decoded = token ? decodeAttributionToken(token) : null;

  const fieldsToSet: Record<string, unknown> = {
    name: msg.contactName || "WhatsApp Lead",
    phone,
    source: decoded?.s || "whatsapp",
    sourceAccount: msg.phoneNumberId,
    conversionChannel: "whatsapp",
    location: resolved.branch || "",
    branchUnresolved: !resolved.branch,
    utmMedium: decoded?.m || "",
    utmCampaign: decoded?.c || "",
    clickId: decoded?.ci || "",
    clickIdType: decoded?.cit || "",
    attributionId: decoded?.a || "",
    notes: msg.text ? `Inbound WhatsApp message: "${msg.text.replace(/\(ref:\s*[A-Za-z0-9_-]+\)/, "").trim()}"` : "",
    externalCrmId: msg.messageId,
  };

  // Idempotency — reuses the EXISTING {externalCrmId, source, sourceAccount}
  // shape (buildDedupQuery, already established for JustDial/IndiaMART and
  // covered by its own tests) rather than inventing a WhatsApp-specific
  // rule. sourceAccount here is the receiving phone_number_id — the
  // WhatsApp-specific "account" identity, exactly matching how a JustDial
  // listing ID scopes dedup for that provider. A duplicate delivery of the
  // same message (Meta retries webhooks that don't 200 quickly enough)
  // updates the existing Booking in place rather than creating a second one.
  const dedupQuery = buildDedupQuery("whatsapp", msg.phoneNumberId, msg.messageId);
  const existing = dedupQuery ? await (Booking as any).findOne(dedupQuery) : null;

  let bookingId: unknown;
  if (existing) {
    await (Booking as any).findByIdAndUpdate(existing._id, { $set: fieldsToSet });
    bookingId = existing._id;
  } else {
    const created = await (Booking as any).create(fieldsToSet);
    bookingId = created._id;
  }

  qualifyAndPersist({ ...fieldsToSet, _id: bookingId }, { reason: "auto:initial" }).catch(() => {});

  return { processed: true, bookingId, branch: resolved.branch, attributed: !!decoded };
}
