// The one shared, atomic "create this booking exactly once per
// Idempotency-Key" primitive — used by every human-facing booking-creation
// route (website /api/booking, landing-page /api/lp/[slug]/lead; AI chat's
// own booking flow already posts through /api/booking, so it's covered for
// free). Deliberately NOT touching the webhook-driven sources' own existing
// dedup (JustDial/IndiaMART/Google Lead Form's buildDedupQuery, WhatsApp
// inbound, CRM-inbound) — those already work, are already tested, and key
// off a completely different identity (a provider's own event ID), not a
// client-generated header. Two different problems, two mechanisms, on
// purpose.

export interface BookingIdentity {
  name: string;
  phone: string;
  service: string;
  location: string;
  date: string;
  time: string;
}

// Deliberately narrow — only the fields that actually describe WHAT was
// booked. Marketing attribution (source/utmCampaign/clickId/...) is
// excluded on purpose: two submits of the same booking intent can
// legitimately carry slightly different attribution (a cookie that expired
// between the first attempt and a manual retry, for instance), and that
// must never be treated as "different data" worth rejecting.
export function extractIdentity(fields: Record<string, unknown>): BookingIdentity {
  return {
    name: String(fields.name ?? "").trim(),
    phone: String(fields.phone ?? "").trim(),
    service: String(fields.service ?? "").trim(),
    location: String(fields.location ?? "").trim().toLowerCase(),
    date: String(fields.date ?? "").trim(),
    time: String(fields.time ?? "").trim(),
  };
}

export function identitiesMatch(a: BookingIdentity, b: BookingIdentity): boolean {
  return (
    a.name === b.name &&
    a.phone === b.phone &&
    a.service === b.service &&
    a.location === b.location &&
    a.date === b.date &&
    a.time === b.time
  );
}

// A client-generated key is user-controllable input, not a trusted internal
// format — validated defensively rather than used as-is. Deliberately
// generous (8-100 chars, the shape any UUID/nanoid/etc. already satisfies)
// rather than requiring a specific format, since the contract with the
// frontend is only "opaque, unique per attempt," not a specific generator.
// Anything malformed degrades to "no key" (see createBookingIdempotent) —
// never a 400/500, per the explicit backward-compatibility requirement for
// old cached clients that might send something unexpected, or none at all.
const KEY_PATTERN = /^[A-Za-z0-9_-]{8,100}$/;

export function normalizeIdempotencyKey(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  return KEY_PATTERN.test(trimmed) ? trimmed : null;
}

export type IdempotentCreateResult =
  | { status: "created"; booking: any }
  | { status: "replayed"; booking: any }
  | { status: "conflict" };

// The actual atomic operation. Only reached once the caller has already
// confirmed (via its own upfront findOne — see the route's own comment for
// why that check happens separately, BEFORE the capacity gate) that no
// booking for this key was visible yet. This function's own findOne+upsert
// pair exists to correctly resolve the narrow remaining race: two requests
// carrying the SAME key, both passing that upfront check at nearly the same
// instant. `includeResultMetadata: true` on findOneAndUpdate is the only
// reliable way to know, atomically as part of the single write, whether
// THIS call performed the insert (lastErrorObject.upserted) or lost the
// race to a concurrent identical-key request — a plain "find, then create"
// pair (the thing explicitly ruled out) cannot tell the two apart safely.
//
// NOTE: this is `includeResultMetadata`, not the older `rawResult` option —
// confirmed directly against this project's actual Mongoose version
// (9.9.2), where `rawResult` no longer returns the {lastErrorObject, value}
// shape (it silently returns the plain document instead, which crashed on
// first attempt here) — `includeResultMetadata` is the option that still
// works, verified live before this was trusted.
export async function createBookingIdempotent(
  BookingModel: any,
  idempotencyKey: string | null,
  fieldsToSet: Record<string, unknown>
): Promise<IdempotentCreateResult> {
  const incomingIdentity = extractIdentity(fieldsToSet);

  if (!idempotencyKey) {
    // No key — an old cached client, or any caller this mechanism doesn't
    // apply to. Degrades to exactly today's behavior: a plain create,
    // never a 500, never blocked on a missing header.
    const created = await BookingModel.create(fieldsToSet);
    return { status: "created", booking: created };
  }

  try {
    const raw: any = await BookingModel.findOneAndUpdate(
      { idempotencyKey },
      { $setOnInsert: { idempotencyKey, ...fieldsToSet } },
      { upsert: true, returnDocument: "after", includeResultMetadata: true, setDefaultsOnInsert: true }
    );
    const wasInserted = !!raw?.lastErrorObject?.upserted;
    const booking = raw?.value;
    if (!booking) {
      // Defensive — should be unreachable given the shape confirmed above,
      // but never silently proceed with a missing document.
      throw new Error("createBookingIdempotent: upsert returned no document");
    }
    if (wasInserted) return { status: "created", booking };
    // Lost the race — another request with the same key already exists.
    // Same identity → this is just a slightly-later duplicate delivery of
    // the same logical attempt, treat it as a successful replay. Different
    // identity → the same key was reused for genuinely different booking
    // details, which must never silently create (or silently return) the
    // wrong booking.
    return identitiesMatch(extractIdentity(booking), incomingIdentity)
      ? { status: "replayed", booking }
      : { status: "conflict" };
  } catch (err: any) {
    // The narrowest possible remaining window: a duplicate-key error from
    // the unique index itself (two upserts attempting the true first
    // insert for the same key at almost exactly the same instant — a
    // documented MongoDB behavior, not a bug in this code). Whoever lost
    // simply re-reads and resolves the same way as the race-lost branch
    // above.
    if (err?.code === 11000) {
      const existing = await BookingModel.findOne({ idempotencyKey }).lean();
      if (existing) {
        return identitiesMatch(extractIdentity(existing), incomingIdentity)
          ? { status: "replayed", booking: existing }
          : { status: "conflict" };
      }
    }
    throw err;
  }
}
