import mongoose from "mongoose";
import { CONVERSION_CHANNELS } from "@/app/lib/attribution/conversionChannel";

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
    // Standard UTM campaign attribution — distinct from `campaign` above
    // (that field is a bespoke ?campaign= param used only by the
    // assessment flow's own QR/link system). These come from middleware's
    // utm_last cookie (see app/lib/utmAttribution.ts) at submission time:
    // whichever utm_source/medium/campaign/term/content was on the URL of
    // the visit that actually led to this lead being captured.
    utmSource:   { type: String, default: "" },
    utmMedium:   { type: String, default: "" },
    utmCampaign: { type: String, default: "" },
    utmTerm:     { type: String, default: "" },
    utmContent:  { type: String, default: "" },
    // Path of the page the last-touch UTM'd visit landed on — not
    // necessarily where the lead form itself was submitted.
    landingPage: { type: String, default: "" },
    // The path of the visit that set utm_first — this visitor's actual
    // first entry point into the site, vs. `landingPage` above (the most
    // recent campaign visit). See app/lib/utmAttribution.ts's
    // AttributionFields comment — this value existed there already but
    // was silently discarded until now.
    originalLandingPage: { type: String, default: "" },
    // Compact "source/medium" strings (e.g. "google/cpc") from the
    // utm_first / utm_last cookies — the very first tracked campaign that
    // ever brought this visitor, and the most recent one, respectively.
    // Can differ: a visitor might first arrive via an Instagram ad weeks
    // ago, then convert today after clicking a Google search ad.
    firstTouchSource: { type: String, default: "" },
    lastTouchSource:  { type: String, default: "" },

    // ── Marketing Attribution (Phase 2) ────────────────────────────────
    // Same four fields, same reasoning, as Booking.ts's Marketing
    // Attribution block — see that schema's comment for the full context.
    clickId:     { type: String, default: "" },
    clickIdType: { type: String, default: "" },
    conversionChannel: { type: String, enum: CONVERSION_CHANNELS, default: "" },
    attributionId: { type: String, default: "" },

    // Domain Migration dashboard — 'old' only when this lead's very first
    // recorded touch carried the old domain's redirect marker (see
    // app/lib/migrationAttribution.ts); 'new' otherwise. Deliberately NOT
    // given a schema `default` — a Lead created before this field existed
    // must read back as undefined ("historical — unavailable" in the
    // dashboard), never silently as 'new'. Every Lead created going
    // forward gets an explicit value from app/api/leads/route.ts.
    originDomain: { type: String, enum: ["old", "new"] },
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

    // Pre-Consultation Assessment (Hair/Skin/Body redesign) — additive,
    // only populated by the new /skin-quiz flow. Deliberately never a
    // treatment name/price — that stays in `recommendations` above,
    // doctor-facing only via Doctor Review Mode, never returned to the
    // patient. Absent on every lead created before this shipped; every
    // reader (analytics, admin UI) must treat that as "legacy," not an error.
    // "journey" = Plan My Journey (goal-based flow, reuses this same field/
    // AssessmentResult shape via scoreJourneyConcern() so the AI-explanation
    // branch in /api/patient-report and the doctor-dashboard insights apply
    // to it too, without a parallel set of Lead fields).
    assessmentType: { type: String, enum: ["hair", "skin", "body", "journey", ""], default: "" },
    assessmentResult: {
      categoryScores:       { type: mongoose.Schema.Types.Mixed, default: [] }, // [{key,label,percent}]
      overallConcern:       { type: Number, default: null },
      severity:             { type: String, default: "" },
      riskScore:            { type: Number, default: null },
      riskLevel:            { type: String, default: "" },
      contributingFactors:  { type: mongoose.Schema.Types.Mixed, default: [] }, // [{tag,label,detail}]
      // AI's only job here — explain in plain language, never re-decide the
      // score (architecture review §10). Optional: absent if AI isn't
      // configured or the call fails, which the result screen degrades
      // gracefully around (deterministic content is already complete
      // without it).
      aiExplanation: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

LeadSchema.index({ assessmentType: 1, "assessmentResult.severity": 1 });

export const Lead = mongoose.models.Lead || mongoose.model("Lead", LeadSchema);
