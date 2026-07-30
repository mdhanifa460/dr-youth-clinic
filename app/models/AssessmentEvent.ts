import mongoose from "mongoose";

// Minimal, PII-free funnel tracking so "Assessments Started / Completed /
// Conversion" in Analytics is real data, not estimated — a Lead document
// alone can't answer this since a Lead is only created when someone submits
// contact info, which happens after they've already seen their results.
//
// Extended for the Journey Engine merge (Phase 4): goal_selected/
// step_completed/branch_selected/service_selected/consultation_booked let
// Plan My Journey and skin-quiz's shared question flow (see
// app/lib/assessmentFlow.ts's postAssessmentEvent) instrument per-step
// drop-off and goal-level funnels, not just the old start/complete pair.
const AssessmentEventSchema = new mongoose.Schema(
  {
    event: {
      type: String,
      enum: ["started", "completed", "goal_selected", "step_completed", "branch_selected", "service_selected", "consultation_booked"],
      required: true,
    },
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
    // Plan My Journey's goal slug ("hair"/"skin"/"laser"/"weight-loss") —
    // empty for skin-quiz, which has no goal concept of its own.
    goal: { type: String, default: "" },
    // Which question was just answered, for "step_completed" — lets
    // Analytics compute real per-step drop-off instead of only a single
    // start/complete pair.
    stepId: { type: String, default: "" },
    // Client-generated (sessionStorage, no PII — see getOrCreateSessionId in
    // assessmentFlow.ts), constant for one visitor's one visit. Lets
    // Analytics group a visitor's own events (e.g. count distinct steps
    // reached, or pair a "started" with its "completed") without needing
    // any identifying information.
    sessionId: { type: String, default: "" },
  },
  { timestamps: true }
);

export const AssessmentEvent =
  mongoose.models.AssessmentEvent || mongoose.model("AssessmentEvent", AssessmentEventSchema);
