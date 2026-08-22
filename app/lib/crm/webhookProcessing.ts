import Booking from "@/app/models/Booking";
import Invoice from "@/app/models/Invoice";
import ConnectorFieldMapping from "@/app/models/ConnectorFieldMapping";
import { applyFieldMapping, type MappingFieldDef } from "./fieldMapping";
import { normalizePhone } from "@/app/lib/phone";
import { qualifyAndPersist } from "@/app/lib/leadQualification/persist";
import { reserveCapacitySlot, isRealAppointment } from "@/app/lib/bookingCapacity";
import { getEffectiveBranchConfig } from "@/app/lib/branchConfig";

// Leads and invoices are event-driven (your CRM calls our webhook the
// moment one is created/updated), not polled — no "getLeads"/"getInvoices"
// pull method exists anywhere in CRMConnector.ts. This keeps the CRM
// developer's side to "call one URL when something happens" instead of
// building a paginated, filterable list endpoint we'd have to poll on a
// schedule. Doctors/Branches stay pull-based (see sync.ts) since those
// change rarely enough that a periodic check is simpler than a webhook.

export interface WebhookProcessResult {
  processed: boolean;
  reason?: string;
}

async function getMapping(connectorId: string, capability: string): Promise<MappingFieldDef[]> {
  const doc = await (ConnectorFieldMapping as any)
    .findOne({ connectorId, capability, direction: "pull" })
    .lean();
  return doc?.fields || [];
}

export async function processCrmWebhookEvent(
  connectorId: string,
  event: string,
  payload: Record<string, unknown> | null
): Promise<WebhookProcessResult> {
  if (!payload) return { processed: false, reason: "Empty payload" };

  if (event === "lead.created") return processInboundLead(connectorId, payload);
  if (event === "invoice.created" || event === "invoice.updated") return processInboundInvoice(connectorId, payload);

  return { processed: false, reason: `No handler for event "${event}" — Leads use "lead.created", invoices use "invoice.created"/"invoice.updated".` };
}

async function processInboundLead(connectorId: string, payload: Record<string, unknown>): Promise<WebhookProcessResult> {
  const fields = await getMapping(connectorId, "lead");
  if (!fields.length) {
    return { processed: false, reason: 'No "Leads coming in" field mapping configured yet — set it in CRM Sync → Field Mapping.' };
  }

  const { mapped, missingRequired } = applyFieldMapping(payload, fields, "pull");
  if (missingRequired.length) {
    return { processed: false, reason: `Missing required field(s): ${missingRequired.join(", ")}` };
  }

  const externalId = String(mapped.externalId ?? "");
  const phone = normalizePhone(String(mapped.phone ?? ""));
  if (!externalId || !phone) {
    return { processed: false, reason: "externalId and phone are both required to record a lead." };
  }

  const existing = await (Booking as any).findOne({ externalCrmId: externalId });
  const location = String(mapped.location ?? "");
  // Booking Capacity — a CRM-side lead has no appointment concept by
  // default (staff logging a phone enquiry directly in the CRM, not a
  // booked slot); date/time are only set here when the admin has actually
  // mapped them from a real CRM field ("Leads coming in" field mapping),
  // matching the exact same "never invented" rule the lead-source
  // connectors use. Only a genuinely dated CRM record consumes capacity —
  // see isRealAppointment()'s comment.
  const mappedDate = mapped.date ? String(mapped.date) : "";
  const mappedTime = mapped.time ? String(mapped.time) : "";
  const fieldsToSet: Record<string, unknown> = {
    name: String(mapped.name ?? existing?.name ?? ""),
    phone,
    email: String(mapped.email ?? ""),
    service: String(mapped.service ?? ""),
    location,
    notes: String(mapped.notes ?? ""),
    source: "crm",
    externalCrmId: externalId,
    pendingSync: false, // it already exists in the CRM — nothing to push back
  };
  if (mappedDate) fieldsToSet.date = mappedDate;
  if (mappedTime) fieldsToSet.time = mappedTime;

  let bookingId: unknown;
  if (existing) {
    await (Booking as any).findByIdAndUpdate(existing._id, { $set: fieldsToSet });
    bookingId = existing._id;
  } else {
    const created = await (Booking as any).create(fieldsToSet);
    bookingId = created._id;
  }

  // Lead Qualification Engine — score inbound CRM leads too, source is just
  // "crm" like any other; no-ops if the engine isn't enabled.
  qualifyAndPersist(
    { ...fieldsToSet, _id: bookingId, leadTemperature: existing?.leadTemperature },
    { reason: "auto:initial" }
  ).catch(() => {});

  // Booking Capacity accounting — fire-and-forget, never blocking/
  // rejecting the CRM's own webhook call (see the identical reasoning in
  // app/lib/leadSource/webhookProcessing.ts). Only when a branch is known
  // and this is a genuinely dated appointment, not a plain lead.
  if (location && isRealAppointment(mappedDate, mappedTime)) {
    getEffectiveBranchConfig(location)
      .then((cfg) => reserveCapacitySlot(location, mappedDate, cfg.timezone))
      .catch((err) => console.error(`Booking capacity accounting failed for CRM-inbound booking ${bookingId}:`, err));
  }

  return { processed: true };
}

async function processInboundInvoice(connectorId: string, payload: Record<string, unknown>): Promise<WebhookProcessResult> {
  const fields = await getMapping(connectorId, "invoice");
  if (!fields.length) {
    return { processed: false, reason: 'No "Billing / invoices" field mapping configured yet — set it in CRM Sync → Field Mapping.' };
  }

  const { mapped, missingRequired } = applyFieldMapping(payload, fields, "pull");
  if (missingRequired.length) {
    return { processed: false, reason: `Missing required field(s): ${missingRequired.join(", ")}` };
  }

  const externalId = String(mapped.externalId ?? "");
  const patientPhone = normalizePhone(String(mapped.patientPhone ?? ""));
  if (!externalId || !patientPhone) {
    return { processed: false, reason: "externalId and patientPhone are both required to record an invoice." };
  }

  const treatmentsRaw = mapped.treatments;
  const treatments = Array.isArray(treatmentsRaw)
    ? treatmentsRaw.map(String)
    : typeof treatmentsRaw === "string" && treatmentsRaw
    ? [treatmentsRaw]
    : [];

  const invoiceDateRaw = mapped.invoiceDate ? new Date(String(mapped.invoiceDate)) : null;
  const matchedBooking = await (Booking as any).findOne({ phone: patientPhone }).sort({ createdAt: -1 }).select("_id").lean();

  const fieldsToSet = {
    connectorId,
    invoiceNumber: String(mapped.invoiceNumber ?? ""),
    patientName: String(mapped.patientName ?? ""),
    patientPhone,
    patientEmail: String(mapped.patientEmail ?? ""),
    doctorName: String(mapped.doctorName ?? ""),
    branch: String(mapped.branch ?? ""),
    treatments,
    amount: Number(mapped.amount ?? 0),
    amountPaid: Number(mapped.amountPaid ?? 0),
    status: String(mapped.status ?? ""),
    invoiceDate: invoiceDateRaw && !isNaN(invoiceDateRaw.getTime()) ? invoiceDateRaw : null,
    matchedBookingId: matchedBooking?._id ?? null,
  };

  await (Invoice as any).findOneAndUpdate(
    { externalId },
    { $set: fieldsToSet, $setOnInsert: { externalId, receivedAt: new Date() } },
    { upsert: true }
  );

  return { processed: true };
}
