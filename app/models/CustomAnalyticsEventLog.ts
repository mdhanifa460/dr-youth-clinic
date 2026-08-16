import mongoose, { Schema, Document } from "mongoose";

// Firing-history for Custom Events (app/models/CustomAnalyticsEvent.ts) —
// Phase 2 of the Admin Event Manager. Same dual-write pattern already
// established by app/lib/bannerPopupAnalytics.ts (DB write + dataLayer
// push, both from the same client call site): CustomEventListener.tsx
// calls pushDataLayerEvent() as the primary, always-happens write, and
// fires a best-effort POST to log a row here alongside it — a failure to
// log must never block or affect the dataLayer push itself.
//
// This feeds the real volume numbers on the Admin Event Manager's
// Overview page (app/admin/analytics/page.tsx), replacing the Phase 1
// static "N enabled / M total" counts with actual firing counts.
//
// Deliberately a separate, append-only log — not a counter incremented
// on CustomAnalyticsEvent itself — same "don't risk the low-write config
// document's own write path with a high-write log" reasoning
// BookingSuccessEvent.ts already documents for its own equivalent split.
export interface ICustomAnalyticsEventLog extends Document {
  customEventId: string;
  name: string;
  params: Record<string, unknown>;
  page: string;
  createdAt: Date;
}

const CustomAnalyticsEventLogSchema = new Schema<ICustomAnalyticsEventLog>(
  {
    customEventId: { type: String, required: true, index: true },
    name: { type: String, required: true, index: true },
    params: { type: Schema.Types.Mixed, default: {} },
    page: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

CustomAnalyticsEventLogSchema.index({ name: 1, createdAt: -1 });
// TTL — auto-expires rows after 180 days, same window as InterestEvent's
// own precedent. This is a firing-volume log for recent-trend reporting,
// not a permanent audit trail.
CustomAnalyticsEventLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });

export const CustomAnalyticsEventLog =
  mongoose.models.CustomAnalyticsEventLog ||
  mongoose.model<ICustomAnalyticsEventLog>("CustomAnalyticsEventLog", CustomAnalyticsEventLogSchema);
