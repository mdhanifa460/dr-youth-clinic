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
  },
  { timestamps: true }
);

export const AssessmentEvent =
  mongoose.models.AssessmentEvent || mongoose.model("AssessmentEvent", AssessmentEventSchema);
