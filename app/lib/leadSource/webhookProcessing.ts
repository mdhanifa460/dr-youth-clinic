import Booking from "@/app/models/Booking";
import Connector from "@/app/models/Connector";
import ConnectorFieldMapping from "@/app/models/ConnectorFieldMapping";
import { applyFieldMapping, type MappingFieldDef } from "@/app/lib/crm/fieldMapping";
import { normalizePhone } from "@/app/lib/phone";
import { qualifyAndPersist } from "@/app/lib/leadQualification/persist";
import { resolveBranchForLead } from "@/app/lib/leadSourceMapping/resolveBranch";
import { getClinicNotifyNumber } from "@/app/lib/clinicNotify";
import { getEffectiveBranchConfig } from "@/app/lib/branchConfig";
import { sendWhatsAppText } from "@/app/lib/whatsapp";

// The generic bridge for EVERY third-party lead channel — JustDial,
// IndiaMART, WhatsApp, and whatever comes after them. Onboarding a new
// provider is: (1) create a Connector (type: "lead_source", provider:
// "justdial"), (2) configure its field mapping once (capability:
// "intake") so THEIR payload's field names translate to ours, (3) give
// them this connector's webhook URL, (4) add LeadSourceMapping row(s) so
// each of their listings/numbers routes to the right branch. No new code
// for any of that — this file and the route below are the only code, and
// they're provider-agnostic by construction. That's the whole point: this
// gets built once, not re-built per integration.

export interface LeadSourceWebhookResult {
  processed: boolean;
  reason?: string;
  bookingId?: unknown;
  branch?: string | null;
}

// Pure, DB-free — the exact idempotency key described in the review:
// source + sourceAccount + externalId together, never externalId alone
// (two different provider accounts can independently produce the same
// externalId string). Returns null when there's no externalId to key on
// at all, meaning "don't attempt dedup for this lead" — see the longer
// comment at the call site for why that's a deliberate choice, not a gap
// waiting to be filled in blindly. Separated from the DB call itself so
// the actual query-shape logic is unit-testable without a database, same
// reasoning as pickBestMapping in resolveBranch.ts.
export function buildDedupQuery(source: string, sourceAccount: string, externalId: string): Record<string, string> | null {
  if (!externalId) return null;
  return { externalCrmId: externalId, source, sourceAccount };
}

// Pure — whether a branch-specific WhatsApp staff alert should even be
// attempted. Never true for an unresolved branch: there's no
// branch-specific number to send to, and picking some other number would
// be exactly the kind of guess resolveBranchForLead() already refuses to
// make.
export function shouldNotifyBranch(resolvedBranch: string | null): boolean {
  return !!resolvedBranch;
}

async function getIntakeMapping(connectorId: string): Promise<MappingFieldDef[]> {
  const doc = await (ConnectorFieldMapping as any)
    .findOne({ connectorId, capability: "intake", direction: "pull" })
    .lean();
  return doc?.fields || [];
}

export async function processLeadSourceWebhookEvent(
  connectorId: string,
  payload: Record<string, unknown> | null
): Promise<LeadSourceWebhookResult> {
  if (!payload) return { processed: false, reason: "Empty payload" };

  const connector = await (Connector as any).findById(connectorId).lean();
  if (!connector || connector.type !== "lead_source") {
    return { processed: false, reason: "Not a lead_source connector" };
  }
  const source = String(connector.provider || "").trim().toLowerCase();
  if (!source) {
    return { processed: false, reason: 'This connector has no "provider" set (e.g. "justdial", "indiamart") — set it before leads can route.' };
  }

  const fields = await getIntakeMapping(connectorId);
  if (!fields.length) {
    return { processed: false, reason: `No "Intake" field mapping configured yet for this connector — set it before it can receive leads.` };
  }

  // "pull" direction: reads THEIR field names (externalField) out of the
  // raw payload, writes OUR field names (platformField) — the exact same
  // translation applyFieldMapping() already does for inbound CRM leads,
  // reused as-is. Platform fields an admin can map here: name, phone,
  // email, service, notes, providerAccountId, providerPhone, externalId.
  const { mapped, missingRequired } = applyFieldMapping(payload, fields, "pull");
  if (missingRequired.length) {
    return { processed: false, reason: `Missing required field(s): ${missingRequired.join(", ")}` };
  }

  const phone = normalizePhone(String(mapped.phone ?? ""));
  if (!phone) {
    return { processed: false, reason: "phone is required to record a lead (map it in Field Mapping)." };
  }

  const providerAccountId = String(mapped.providerAccountId ?? "");
  const providerPhone = String(mapped.providerPhone ?? "");
  const externalId = String(mapped.externalId ?? "");

  // Branch resolution — see resolveBranch.ts's own comment for the full
  // priority order. Never guesses: an unresolved lead still gets saved
  // (a lead a staff member has to manually route is infinitely better
  // than one silently dropped), just flagged for a human to assign.
  const resolved = await resolveBranchForLead({ source, providerAccountId, providerPhone });

  // Booking.name is a required field — a provider payload that genuinely
  // has no name (rare, but some listing sites only pass a phone number)
  // still gets saved rather than dropped; "Unknown Lead" is a visible,
  // honest placeholder a staff member will immediately want to fix, not
  // a guess presented as real data.
  const name = String(mapped.name ?? "").trim() || "Unknown Lead";

  const fieldsToSet: Record<string, unknown> = {
    name,
    phone,
    email: String(mapped.email ?? ""),
    service: String(mapped.service ?? ""),
    notes: String(mapped.notes ?? ""),
    source,
    sourceAccount: providerAccountId,
    sourcePhone: providerPhone,
    location: resolved.branch || "",
    branchUnresolved: !resolved.branch,
  };
  if (externalId) fieldsToSet.externalCrmId = externalId;

  // Idempotency: externalId ALONE is not a safe dedup key — two different
  // accounts on the same provider (Chennai's JustDial listing and
  // Bangalore's) each run their own ID sequence and could independently
  // produce the same externalId string. The stable identity is
  // source + sourceAccount + externalId together, matching exactly what
  // was asked for: a retry of the SAME event from the SAME account
  // updates in place; the same externalId from a DIFFERENT account is
  // correctly treated as a different lead.
  //
  // No dedup at all happens when a provider supplies no externalId (and
  // none is mapped) — a deliberate choice, not an oversight: a phone +
  // time-window merge was considered and rejected for now. Two different
  // enquiries from the same phone number close together (a real, common
  // case — someone calls back, or two family members share a phone) would
  // be silently merged into one lead, and neither JustDial's nor
  // IndiaMART's actual webhook payload shape has been inspected to know
  // whether they reliably supply a stable ID in practice. That fallback
  // needs a real sample payload from each provider before it's designed,
  // not a guess baked in now — every provider without a mapped externalId
  // is un-deduplicated (each webhook call creates a new Booking) until
  // that's done deliberately.
  let bookingId: unknown;
  const dedupQuery = buildDedupQuery(source, providerAccountId, externalId);
  const existing = dedupQuery ? await (Booking as any).findOne(dedupQuery) : null;
  if (existing) {
    await (Booking as any).findByIdAndUpdate(existing._id, { $set: fieldsToSet });
    bookingId = existing._id;
  } else {
    const created = await (Booking as any).create(fieldsToSet);
    bookingId = created._id;
  }

  // Lead Qualification Engine — same fire-and-forget scoring every other
  // booking-creating flow gets; no-ops if the engine isn't enabled.
  qualifyAndPersist({ ...fieldsToSet, _id: bookingId }, { reason: "auto:initial" }).catch(() => {});

  // Staff WhatsApp alert, branch-specific — reuses the exact same two
  // resolution calls app/api/booking/route.ts already uses for the
  // website's own booking flow (getEffectiveBranchConfig for which number
  // to SEND FROM, getClinicNotifyNumber for which number to alert), never
  // a separate WhatsApp config path for lead-source leads. Only sent once
  // a branch actually resolved — an unresolved lead has no branch-specific
  // number to send to; sending SOMETHING (e.g. a global fallback) here
  // would be exactly the kind of guess resolveBranchForLead() already
  // refuses to make, so this refuses too. Fire-and-forget: a WhatsApp
  // failure is logged and never affects whether the Booking above was
  // already successfully created.
  if (shouldNotifyBranch(resolved.branch)) {
    notifyBranchOfLeadSourceBooking(resolved.branch as string, {
      bookingId, name, phone, source, sourceAccount: providerAccountId, service: String(mapped.service ?? ""),
    }).catch((err) => {
      console.error(`Lead-source WhatsApp notify failed for booking ${bookingId} (branch ${resolved.branch}):`, err);
    });
  }

  return { processed: true, bookingId, branch: resolved.branch };
}

async function notifyBranchOfLeadSourceBooking(
  branch: string,
  info: { bookingId: unknown; name: string; phone: string; source: string; sourceAccount: string; service: string }
): Promise<void> {
  const branchConfig = await getEffectiveBranchConfig(branch).catch(() => null);
  const sendOpts = branchConfig?.whatsappSenderPhoneNumberId
    ? { senderPhoneNumberId: branchConfig.whatsappSenderPhoneNumberId }
    : undefined;
  const clinicNotifyNumber = await getClinicNotifyNumber(branch);
  const result = await sendWhatsAppText(
    clinicNotifyNumber,
    `🆕 New Lead — ${info.source.toUpperCase()}

Name: ${info.name}
Phone: ${info.phone}
Service: ${info.service || "N/A"}
Branch: ${branch}
Source Account: ${info.sourceAccount || "N/A"}`,
    sendOpts
  );
  if (!result.success) {
    console.error(`Lead-source WhatsApp alert failed for booking ${info.bookingId}:`, result.error);
  }
}
