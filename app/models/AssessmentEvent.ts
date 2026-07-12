import mongoose from "mongoose";

// Minimal, PII-free funnel tracking so "Assessments Started / Completed /
// Conversion" in Analytics is real data, not estimated — a Lead document
// alone can't answer this since a Lead is only created when someone submits
// contact info, which happens after they've already seen their results.
const AssessmentEventSchema = new mongoose.Schema(
  {
    event: { type: String, enum: ["started", "completed"], required: true },
    primaryConcern: { type: String, default: "" },
    campaign: { type: String, default: "" },
    qrSource: { type: Boolean, default: false },
    // Which clinic the QR/link was printed for (?clinic= on the assessment
    // URL, e.g. "anna-nagar") — lets Analytics break scans/completions down
    // by branch, not just campaign.
    clinicLocation: { type: String, default: "" },
    // Which physical/digital placement the QR was printed on (?channel= on
    // the URL, e.g. "reception", "instagram") — separate from campaign,
    // which names the specific print run rather than the channel type.
    channel: { type: String, default: "" },
  },
  { timestamps: true }
);

export const AssessmentEvent =
  mongoose.models.AssessmentEvent || mongoose.model("AssessmentEvent", AssessmentEventSchema);
