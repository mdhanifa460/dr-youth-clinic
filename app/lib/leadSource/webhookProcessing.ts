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
import { reserveCapacitySlot, isRealAppointment } from "@/app/lib/bookingCapacity";

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
// channel + sourceAccount + externalId together, never externalId alone
// (two different provider accounts can independently produce the same
// externalId string). Returns null when there's no externalId to key on
// at all, meaning "don't attempt dedup for this lead" — see the longer
// comment at the call site for why that's a deliberate choice, not a gap
// waiting to be filled in blindly. Separated from the DB call itself so
// the actual query-shape logic is unit-testable without a database, same
// reasoning as pickBestMapping in resolveBranch.ts.
//
// IMPORTANT (Marketing Attribution, Phase 2): this queries
// `conversionChannel`, NOT `source` — a real bug caught by live
// end-to-end verification, not just a naming preference. Since Phase 2,
// `Booking.source` holds the corrected ACQUISITION source (e.g. a
// Google Lead Form lead is written with source="google", an attributed
// WhatsApp conversation with source="google" too) rather than the raw
// provider/channel key. Querying on `source` would silently fail to find
// a lead-source webhook's own previously-created Booking on a retry
// (source="google" in the DB vs. the raw provider "google_lead_form"
// passed in here), creating a duplicate instead of updating in place.
// `conversionChannel` is written unconditionally to the same fixed
// channel identity ("justdial"/"indiamart"/"google_lead_form"/"whatsapp")
// every single time, regardless of what acquisition source got decoded —
// exactly the stable identity idempotency needs.
export function buildDedupQuery(channel: string, sourceAccount: string, externalId: string): Record<string, string> | null {
  if (!externalId) return null;
  return { externalCrmId: externalId, conversionChannel: channel, sourceAccount };
}

// Pure — whether a branch-specific WhatsApp staff alert should even be
// attempted. Never true for an unresolved branch: there's no
// branch-specific number to send to, and picking some other number would
// be exactly the kind of guess resolveBranchForLead() already refuses to
// make.
export function shouldNotifyBranch(resolvedBranch: string | null): boolean {
  return !!resolvedBranch;
}

export interface LeadSourceAttribution {
  attributionSource: string;
  conversionChannel: string;
  isGoogleLeadForm: boolean;
}

// Pure, DB-free — Marketing Attribution (Phase 2): separates WHERE a
// lead_source lead came from (attributionSource, written to Booking.source)
// from HOW it converted (conversionChannel). Google Lead Form is the one
// provider whose real-world acquisition source is "google" even though the
// connector's own provider key is "google_lead_form" (that raw key stays
// the dedup/branch-routing identity — see the call site's comment); every
// other lead_source provider today (JustDial, IndiaMART) has its provider
// key and its acquisition source be the same string, so conversionChannel
// just mirrors source for them. "other" is the deliberate fallback for any
// future lead_source provider this list hasn't been extended for yet —
// never a reason to reject the lead.
export function deriveLeadSourceAttribution(provider: string): LeadSourceAttribution {
  const isGoogleLeadForm = provider === "google_lead_form";
  return {
    isGoogleLeadForm,
    attributionSource: isGoogleLeadForm ? "google" : provider,
    conversionChannel: isGoogleLeadForm
      ? "google_lead_form"
      : (provider === "justdial" || provider === "indiamart" ? provider : "other"),
  };
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
  // Deliberately keyed on the RAW connector provider (e.g.
  // "google_lead_form"), not the display-friendly acquisition source
  // below — branch mappings and dedup are configured per-connector, and
  // must never accidentally collide with an unrelated organic "google"
  // Booking that happens to share the display source string.
  const resolved = await resolveBranchForLead({ source, providerAccountId, providerPhone });

  // Booking.name is a required field — a provider payload that genuinely
  // has no name (rare, but some listing sites only pass a phone number)
  // still gets saved rather than dropped; "Unknown Lead" is a visible,
  // honest placeholder a staff member will immediately want to fix, not
  // a guess presented as real data.
  const name = String(mapped.name ?? "").trim() || "Unknown Lead";

  const { attributionSource, conversionChannel, isGoogleLeadForm } = deriveLeadSourceAttribution(source);

  const fieldsToSet: Record<string, unknown> = {
    name,
    phone,
    email: String(mapped.email ?? ""),
    service: String(mapped.service ?? ""),
    notes: String(mapped.notes ?? ""),
    source: attributionSource,
    sourceAccount: providerAccountId,
    sourcePhone: providerPhone,
    location: resolved.branch || "",
    branchUnresolved: !resolved.branch,
    conversionChannel,
    // Campaign/click-id fields — ONLY populated when the admin has
    // actually mapped them from a real field in this provider's payload
    // (applyFieldMapping simply won't produce these keys otherwise, so
    // they default to "" here exactly like every other optional mapped
    // field above). Never invented for a provider whose payload doesn't
    // carry them — e.g. JustDial/IndiaMART have no campaign/click-id
    // concept at all, so these stay blank for those two.
    utmCampaign: String(mapped.campaign ?? ""),
    // "cpc" for Google Lead Form isn't a guess — a Lead Form extension can
    // only ever run on a paid Google Ads campaign (there's no organic
    // equivalent), so medium is knowable by definition even when the
    // provider's own payload doesn't literally say so. An explicit mapped
    // value still always wins if the payload does carry one.
    utmMedium: String(mapped.medium ?? (isGoogleLeadForm ? "cpc" : "")),
    clickId: String(mapped.clickId ?? ""),
    clickIdType: String(mapped.clickIdType ?? ""),
  };
  if (externalId) fieldsToSet.externalCrmId = externalId;

  // Booking Capacity — date/time are ONLY set here if the admin has
  // actually mapped them from a real field in this provider's payload
  // (same "never invented" rule as campaign/click-id above). Most
  // JustDial/IndiaMART leads have no chosen appointment slot at all — a
  // directory enquiry, not a booked time — and stay a Lead exactly as
  // today; only a provider whose payload genuinely carries a preferred
  // date/time (mapped explicitly by an admin) is treated as a real,
  // capacity-consuming appointment. See isRealAppointment()'s own comment
  // for the exact "Lead vs. Appointment" distinction this reuses.
  const mappedDate = mapped.date ? String(mapped.date) : "";
  const mappedTime = mapped.time ? String(mapped.time) : "";
  if (mappedDate) fieldsToSet.date = mappedDate;
  if (mappedTime) fieldsToSet.time = mappedTime;

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
  // conversionChannel here, not the raw `source`/provider key — see
  // buildDedupQuery's own comment for exactly why this distinction matters.
  const dedupQuery = buildDedupQuery(conversionChannel, providerAccountId, externalId);
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

  // Booking Capacity accounting — only when this lead genuinely became a
  // real, dated appointment (see the mappedDate/mappedTime comment above)
  // AND a branch actually resolved (capacity is inherently per-branch;
  // there's nothing to charge it against otherwise). Deliberately
  // fire-and-forget and NEVER blocking/rejecting: a webhook delivering a
  // real third-party lead must never be dropped because the branch is
  // already busy — it still gets recorded (and still counts toward the
  // SAME shared counter app/api/booking/route.ts's interactive gate
  // checks), just without refusing the third party's webhook call itself.
  if (resolved.branch && isRealAppointment(mappedDate, mappedTime)) {
    getEffectiveBranchConfig(resolved.branch)
      .then((cfg) => reserveCapacitySlot(resolved.branch as string, mappedDate, cfg.timezone))
      .catch((err) => console.error(`Booking capacity accounting failed for lead-source booking ${bookingId}:`, err));
  }

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
