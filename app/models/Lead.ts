import mongoose from "mongoose";

// Assessment leads — previously an inline schema defined directly inside
// app/api/leads/route.ts with no way for admin to see them at all. Now a
// real model so a dedicated admin analytics/list view can query it.
const LeadSchema = new mongoose.Schema(
  {
    name:  { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, required: true },
    city:  { type: String, default: "" },
    source: { type: String, default: "skin-quiz" },
    // Which concern the scoring engine ranked highest for this visitor —
    // stored denormalized so analytics ("Most Common Concern") doesn't have
    // to re-run the scoring engine over every lead's raw answers.
    primaryConcern: { type: String, default: "" },
    // Marketing attribution — set from ?campaign= on the assessment URL,
    // e.g. a specific landing page or ad campaign.
    campaign: { type: String, default: "" },
    // True when the visitor arrived via a QR code (?qr=1) — lets the QR
    // Generator's in-clinic kiosk flow be distinguished from organic web traffic.
    qrSource: { type: Boolean, default: false },
    answers: { type: mongoose.Schema.Types.Mixed, default: {} },
    recommendations: { type: mongoose.Schema.Types.Mixed, default: [] },
    emailSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Lead = mongoose.models.Lead || mongoose.model("Lead", LeadSchema);
