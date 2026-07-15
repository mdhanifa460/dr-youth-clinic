import mongoose from "mongoose";

// Assessment leads — previously an inline schema defined directly inside
// app/api/leads/route.ts with no way for admin to see them at all. Now a
// real model so a dedicated admin analytics/list view can query it.
const LeadSchema = new mongoose.Schema(
  {
    name:  { type: String, default: "" },
    phone: { type: String, default: "" },
    // No longer collected at the moment of lead capture (Clinical Intake's
    // Step 2 asks only name/phone/preferred clinic) — email stays optional,
    // gathered later as a non-blocking "email me a copy" affordance at
    // Results. Format is still validated (EMAIL_RE) whenever it IS supplied.
    email: { type: String, default: "" },
    city:  { type: String, default: "" },
    source: { type: String, default: "skin-quiz" },
    // Which concern the scoring engine ranked highest for this visitor —
    // stored denormalized so analytics ("Most Common Concern") doesn't have
    // to re-run the scoring engine over every lead's raw answers.
    primaryConcern: { type: String, default: "" },
    // The patient's own choice of clinic branch, collected directly in Step 2
    // — distinct from `clinicLocation` below (QR/link attribution) and `city`
    // (legacy free text); this is a normalized dropdown of the 4 real
    // branches (see app/data/locations.ts) and is what the Doctor Dashboard
    // uses to route a patient to the right clinic.
    preferredClinic: { type: String, default: "" },
    // Marketing attribution — set from ?campaign= on the assessment URL,
    // e.g. a specific landing page or ad campaign.
    campaign: { type: String, default: "" },
    // True when the visitor arrived via a QR code (?qr=1) — lets the QR
    // Generator's in-clinic kiosk flow be distinguished from organic web traffic.
    qrSource: { type: Boolean, default: false },
    // Which clinic the QR/link was printed for (?clinic= on the assessment
    // URL) — separate from `city`, which is free text the visitor typed
    // themselves in the lead form and may not match the QR's branch.
    clinicLocation: { type: String, default: "" },
    // Which physical/digital placement the QR was printed on (?channel= on
    // the URL, e.g. "reception", "instagram", "standee").
    channel: { type: String, default: "" },
    answers: { type: mongoose.Schema.Types.Mixed, default: {} },
    recommendations: { type: mongoose.Schema.Types.Mixed, default: [] },
    emailSent: { type: Boolean, default: false },
    // Doctor Review Mode (Phase 4) — an AI-drafted clinical summary that a
    // doctor edits and must explicitly (re-)approve before a care plan can
    // be generated from it. Schema lands now so later phases don't need
    // another migration; fields stay empty/unused until Phase 4 wires up
    // the generate/edit/approve UI and the server-side approval gate.
    aiSummary: {
      draftText:   { type: String, default: "" },
      editedText:  { type: String, default: "" },
      status:      { type: String, enum: ["none", "draft", "approved"], default: "none" },
      approvedAt:  { type: Date, default: null },
      approvedBy:  { type: String, default: "" },
      generatedAt: { type: Date, default: null },
    },
    carePlan: {
      text:        { type: String, default: "" },
      generatedAt: { type: Date, default: null },
    },
    // Patient Report (Phase 5) — AI-generated at Results time.
    patientReport: {
      summary:                    { type: String, default: "" },
      contributingFactors:        { type: [String], default: [] },
      lifestyleFindings:          { type: [String], default: [] },
      questionsForDoctor:         { type: [String], default: [] },
      treatmentOptionsDiscussed:  { type: [String], default: [] },
      generatedAt:                { type: Date, default: null },
    },
    // Doctor Dashboard (Phase 3) fields — free text the doctor fills in
    // directly, independent of any AI generation.
    doctorNotes:         { type: String, default: "" },
    finalRecommendation: { type: String, default: "" },
    treatmentPlan:       { type: String, default: "" },
  },
  { timestamps: true }
);

export const Lead = mongoose.models.Lead || mongoose.model("Lead", LeadSchema);
