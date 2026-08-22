import Booking from "@/app/models/Booking";
import Connector from "@/app/models/Connector";
import ConnectorFieldMapping from "@/app/models/ConnectorFieldMapping";
import { applyFieldMapping, type MappingFieldDef } from "@/app/lib/crm/fieldMapping";
import { normalizePhone } from "@/app/lib/phone";
import { qualifyAndPersist } from "@/app/lib/leadQualification/persist";
import { resolveBranchForLead } from "@/app/lib/leadSourceMapping/resolveBranch";

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

  let bookingId: unknown;
  const existing = externalId ? await (Booking as any).findOne({ externalCrmId: externalId, source }) : null;
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

  return { processed: true, bookingId, branch: resolved.branch };
}
