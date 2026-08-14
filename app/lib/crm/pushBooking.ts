import Booking from "@/app/models/Booking";
import { CRMConnector } from "./CRMConnector";
import type { PlatformBooking, PlatformLead } from "./types";

// Shared by the booking/lead routes (fire-and-forget, right after the local
// save) and the sync cron's retry sweep (for anything that failed or had
// no active connector on first attempt). Never throws — a CRM push failure
// must never surface as a website-facing error; the record is already
// saved locally regardless of what happens here.
//
// A record with a real date/time is a scheduled booking (pushWebsiteBooking);
// one without (a landing-page inquiry, no slot picked yet) is a lead
// (pushWebsiteLead) — same Booking collection either way, so this decides
// per-record rather than needing the caller to know which push operation
// applies.
export async function pushBookingToCrm(bookingDoc: any): Promise<void> {
  try {
    const connector = await CRMConnector.loadActive();
    if (!connector) return; // no CRM configured yet — normal, silent no-op

    const isScheduled = Boolean(bookingDoc.date && bookingDoc.time);

    const lead: PlatformLead = {
      name: bookingDoc.name,
      phone: bookingDoc.phone,
      email: bookingDoc.email || "",
      service: bookingDoc.service || "",
      location: bookingDoc.location || "",
      source: bookingDoc.source || "website",
      notes: bookingDoc.notes || "",
      // Whatever the Lead Qualification Engine had computed as of this
      // push — null/"unclassified" on the very first push (it runs
      // concurrently, right after create), a real value on the cron's
      // later retry sweep. Only actually reaches the CRM if an admin has
      // mapped these fields in ConnectorFieldMapping.
      ...(bookingDoc.leadScore != null ? { leadScore: bookingDoc.leadScore } : {}),
      ...(bookingDoc.leadTemperature ? { leadTemperature: bookingDoc.leadTemperature } : {}),
    };

    const result = isScheduled
      ? await connector.pushWebsiteBooking({
          ...lead,
          bookingId: bookingDoc.bookingId,
          date: bookingDoc.date,
          time: bookingDoc.time,
          concern: bookingDoc.concern || "",
        } satisfies PlatformBooking)
      : await connector.pushWebsiteLead(lead);

    await (Booking as any).findByIdAndUpdate(bookingDoc._id, {
      $set: { externalCrmId: result.externalId, crmPushedAt: new Date(), pendingSync: false },
    });
  } catch {
    // Covers both a real request failure (already logged to ConnectorLog
    // inside CRMConnector) and ConnectorMappingMissingError (expected,
    // normal state until an admin configures the push field mapping).
    // Either way: leave pendingSync true, bump the attempt count, let the
    // cron sweep retry later.
    await (Booking as any).findByIdAndUpdate(bookingDoc._id, { $inc: { syncAttempts: 1 } }).catch(() => {});
  }
}
