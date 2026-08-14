import mongoose from "mongoose";

// Append-only audit trail for the Lead Qualification Engine — every time a
// Booking's leadScore/leadTemperature is (re)computed or manually
// overridden, one row is written here. Booking.qualificationBreakdown holds
// only the CURRENT snapshot (for fast list rendering); this collection is
// the "how did we get here over time" history, queried on-demand (lead
// detail drawer's "view history"), same separation of concerns as
// LeadExportAuditLog for exports.
const LeadQualificationHistorySchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    score: { type: Number, default: null },
    temperature: { type: String, default: "unclassified" },
    // "auto:initial" (scored at booking creation) | "auto:status_change"
    // (recomputed after a status-affecting PATCH, only written when the
    // temperature actually changed) | "manual_override" (Phase 2 staff
    // override) | "rule_change_recalc" (explicit admin-triggered bulk
    // recompute after editing Settings.leadQualification).
    reason: { type: String, default: "auto:initial" },
    ruleId: { type: String, default: "" },
    qualificationVersion: { type: String, default: "" },
    // null for system-triggered rows (auto:*), set for manual_override.
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser", default: null },
  },
  { timestamps: true }
);

LeadQualificationHistorySchema.index({ leadId: 1, createdAt: -1 });

export default mongoose.models.LeadQualificationHistory ||
  mongoose.model("LeadQualificationHistory", LeadQualificationHistorySchema);
