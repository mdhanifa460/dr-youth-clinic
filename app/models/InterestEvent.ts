import mongoose from "mongoose";

// Homepage Personalization Engine — Phase 1 (foundation only; nothing
// reads this yet, see app/lib/personalization.ts). Raw, PII-free
// behavioral signal per anonymous visitor, tagged by category (Hair/Skin/
// Body/Weight Loss, etc.) and event type. A later phase computes each
// visitor's per-category Interest Score from these rows (time-decayed —
// an event from today should count more than one from 3 months ago —
// which is why individual timestamped rows are kept rather than a single
// running total per visitor+category: decay needs the original timestamp
// to compute against at read time, not just an accumulated sum).
//
// `weight` is deliberately NOT stored here — it's a property of the admin-
// configurable event-type registry (Phase 2), resolved at score-computation
// time. Storing it at write time would mean an admin changing a weight
// later couldn't retroactively affect already-collected events.
//
// `category` is a free string, not an enum — Phase 2 introduces the
// admin-configurable category registry (Hair/Skin/Body/Weight Loss, etc.)
// that defines the valid set; this model doesn't hard-couple to it so the
// registry can change without a schema migration here.
const InterestEventSchema = new mongoose.Schema(
  {
    // Random UUID from the visitor_id cookie (middleware.ts) — never tied
    // to a name/phone/email. If a visitor later becomes a Lead, nothing
    // here is retroactively linked to that Lead; this is behavioral signal
    // only, consumed anonymously by the homepage's own personalization pass.
    visitorId: { type: String, required: true, index: true },
    category: { type: String, required: true },
    // e.g. "page_view", "blog_read", "video_watch", "assessment_completed",
    // "doctor_view", "booking_started" — see app/lib/personalization.ts's
    // EVENT_TYPES for the current valid set.
    eventType: { type: String, required: true },
    // Optional extra context an event type might carry — e.g. video_watch's
    // percent-watched, so a future weighting pass could treat a 90%-watched
    // video differently from a 20%-watched one without a schema change.
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

InterestEventSchema.index({ visitorId: 1, category: 1, createdAt: -1 });
// TTL — auto-expires rows after 180 days. A decayed-to-near-zero event from
// 6 months ago contributes nothing to a score anyway (see the decay note
// above), so this keeps the collection bounded without a cron job.
InterestEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

export const InterestEvent =
  mongoose.models.InterestEvent || mongoose.model("InterestEvent", InterestEventSchema);
