import mongoose from "mongoose";

// 8-stage lead pipeline — tracks inquiry through to treatment
export type BookingStatus =
  | "new"          // just submitted the form
  | "contacted"    // team reached out (called/WhatsApp'd)
  | "follow_up"    // interested but needs more info / follow-up later
  | "confirmed"    // slot locked in, attending
  | "arrived"      // patient physically walked in
  | "completed"    // treatment done
  | "no_show"      // confirmed but didn't show
  | "cancelled";   // explicitly cancelled

// Admin-configurable (Settings.booking.sources) — not a fixed union.
export type BookingSource = string;

// Lead Temperature — deliberately a DIFFERENT axis from BookingStatus above.
// Status is lifecycle ("where is this lead in our process"); temperature is
// current intent ("how promising does this lead look right now"), computed
// by app/lib/leadQualification/computeQualification.ts from admin-configured
// rules (Settings.leadQualification). Kept as a small FIXED enum on purpose —
// admin-facing customization (labels, colors, thresholds) lives entirely in
// Settings.leadQualification.thresholds[].label, never written in here, so a
// label edit in the admin UI can never trip this schema's validation (see
// the templateType enum-sync bug this project already shipped once).
// "unclassified" is a real, distinct resting state — not a stand-in for
// "cold". It means "never scored" (pre-existing bookings, or the engine is
// disabled), same reasoning as originDomain's missing default below: don't
// fake a value for data the engine never actually evaluated.
export type LeadTemperature = "unclassified" | "cold" | "warm" | "hot" | "very_hot";

const BookingSchema = new mongoose.Schema(
  {
    bookingId:    { type: String },
    name:         { type: String, required: true },
    phone:        { type: String, required: true },
    formattedPhone: { type: String },
    email:        { type: String, default: "" },
    service:      { type: String, default: "" },
    location:     { type: String, default: "" },
    date:         { type: String, default: "" },
    time:         { type: String, default: "" },
    // Additive — Booking (the lead-capture model) never had a doctor field,
    // which is the actual reason the admin Intelligence dashboard's Doctor
    // Performance panel had to *estimate* per-doctor numbers by splitting
    // branch totals evenly instead of measuring them. Optional, since
    // existing/legacy bookings won't have it and a doctor isn't always
    // chosen at the lead-capture stage.
    doctorId:     { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", default: null },
    consultationMode: { type: String, enum: ["in_clinic", "video", "phone"], default: "in_clinic" },
    language:     { type: String, default: "" },
    appointmentType: { type: String, default: "" },
    notes:        { type: String, default: "" },
    concern:      { type: String, default: "" },
    promoCode:    { type: String, default: "" },
    promoDiscount:{ type: Number, default: 0 },

    // Lead pipeline status
    status: {
      type: String,
      enum: ["new","contacted","follow_up","confirmed","arrived","completed","no_show","cancelled"],
      default: "new",
    },

    // Where did this lead come from? Not an enum — the list of valid
    // sources is admin-configurable (Settings.booking.sources), not fixed
    // in code.
    source: {
      type: String,
      default: "website",
    },

    // Additive — set when source === "landing-page", so a lead captured
    // through an LP's Hero/Form section can still be traced back to which
    // campaign page and A/B variant it came from, without needing a
    // separate lead-capture collection (see app/api/lp/[slug]/lead/route.ts).
    lpSlug:    { type: String, default: "" },
    lpVariant: { type: String, default: "" },

    // Third-party lead-source attribution — set on leads ingested through
    // a "lead_source" Connector (JustDial, IndiaMART, WhatsApp, ...; see
    // app/lib/leadSource/webhookProcessing.ts). Deliberately kept SEPARATE
    // from `location` (branch attribution, below) — a multi-branch clinic
    // has one JustDial listing per branch, so "source = JustDial" alone
    // never tells you which branch a lead belongs to; sourceAccount/
    // sourcePhone are the provider's own identifiers (listing/account/
    // campaign ID and phone number) that a LeadSourceMapping row resolves
    // into a branch — see app/lib/leadSourceMapping/resolveBranch.ts.
    sourceAccount: { type: String, default: "" },
    sourcePhone:   { type: String, default: "" },
    // True only for a third-party-sourced lead where resolveBranchForLead()
    // found no matching LeadSourceMapping — `location` is left blank
    // rather than guessed, and this flag is what a staff member sees to
    // manually assign the right branch. Never true for a website-sourced
    // booking (the visitor always picks their own location directly).
    branchUnresolved: { type: Boolean, default: false },

    // Standard UTM campaign attribution, captured the same way as on Lead
    // (see app/lib/utmAttribution.ts / Lead.ts) — populated from the
    // utm_last/utm_first middleware cookies at booking-submission time.
    utmSource:   { type: String, default: "" },
    utmMedium:   { type: String, default: "" },
    utmCampaign: { type: String, default: "" },
    utmTerm:     { type: String, default: "" },
    utmContent:  { type: String, default: "" },
    landingPage: { type: String, default: "" },
    // The path of the visit that set utm_first — this visitor's actual
    // first entry point, vs. `landingPage` above (most recent campaign
    // visit). See app/lib/utmAttribution.ts's AttributionFields comment.
    originalLandingPage: { type: String, default: "" },
    firstTouchSource: { type: String, default: "" },
    lastTouchSource:  { type: String, default: "" },
    // Domain Migration dashboard — same rules as Lead.originDomain above:
    // 'old' only when this booking's very first recorded touch carried
    // the old domain's redirect marker (app/lib/migrationAttribution.ts),
    // 'new' otherwise, and deliberately no schema `default` so a Booking
    // created before this field existed reads back undefined
    // ("historical — unavailable"), never silently 'new'.
    originDomain: { type: String, enum: ["old", "new"] },

    // VPN/proxy/datacenter risk signal (app/lib/ipIntelligence.ts) — a flag
    // for staff visibility, never a submission gate (see that file's
    // comment for why). Written asynchronously right after creation, not
    // in the create() call itself, so a slow/failed IP-lookup can never
    // delay or break a real visitor's booking confirmation. No schema
    // `default`, same convention as originDomain above: a Booking created
    // before this field existed, or one whose lookup never completed,
    // reads back undefined ("never checked"), never silently "clean."
    ipRiskFlagged: { type: Boolean },

    // CRM fields
    internalNote:   { type: String, default: "" },
    assignedTo:     { type: String, default: "" },  // staff member handling this lead
    treatmentValue: { type: Number, default: null }, // estimated treatment value (INR)
    isReturnVisit:  { type: Boolean, default: false },

    // Timestamps for SLA tracking
    contactedAt: { type: Date, default: null },

    // Bridge to the full Appointment system
    convertedToAppointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },

    // Set by the patient-facing /my-appointments portal (phone + bookingId
    // lookup, no separate auth system) — a request, not a direct edit, so a
    // patient can't unilaterally move their own slot. null once there's no
    // pending request (either never requested, or an admin has actioned it).
    rescheduleRequest: {
      type: {
        requestedDate: String,
        requestedTime: String,
        note: { type: String, default: "" },
        requestedAt: Date,
      },
      default: null,
    },

    // Uploaded from the Booking Success page's "Prepare for Your
    // Consultation" checklist — lets the doctor review prior reports before
    // the patient even walks in. Same Cloudinary upload pattern as
    // assessment-photos (app/api/assessment-photo-upload), separate field
    // since these are documents/PDFs, not skin/hair photos.
    preVisitReports: {
      type: [{ url: String, publicId: String, name: String, uploadedAt: Date }],
      default: [],
    },

    // Additive — CRM Connector push tracking (Enterprise Connector
    // Framework, Phase 2). A booking is always saved locally first;
    // pushWebsiteBooking() to the CRM happens after, non-blocking.
    // pendingSync stays true until the push succeeds, so a failed/retrying
    // push is visible and retryable without ever affecting the booking
    // itself.
    externalCrmId: { type: String, default: "" },
    crmPushedAt:   { type: Date, default: null },
    pendingSync:   { type: Boolean, default: true },
    // Capped at Connector.config.retryCount by the sync cron — once
    // exceeded, the row stops being retried automatically (still
    // pendingSync: true, still visible/retryable from Sync Manager Logs)
    // rather than being hammered forever against a CRM that keeps
    // rejecting it.
    syncAttempts:  { type: Number, default: 0 },

    // Lead Qualification Engine — see app/lib/leadQualification/. Computed
    // (never hand-entered) on create and on every status-affecting PATCH by
    // computeQualification(), against Settings.leadQualification's admin
    // rules/thresholds. Deliberately separate from `status` above.
    leadScore: { type: Number, default: null }, // 0-100, null = never scored
    leadTemperature: {
      type: String,
      enum: ["unclassified", "cold", "warm", "hot", "very_hot"],
      default: "unclassified",
    },
    leadTemperatureUpdatedAt: { type: Date, default: null },
    // Snapshot of Settings.leadQualification.version at scoring time, so a
    // later rule/threshold edit is visibly distinguishable from "this lead's
    // score reflects the current rules" without needing a recompute to tell.
    qualificationVersion: { type: String, default: "" },
    // Which rules actually matched and why — the "why is this lead Hot?"
    // breakdown shown in admin. A live snapshot of the CURRENT score, not a
    // growing log (see LeadQualificationHistory for the audit trail).
    qualificationBreakdown: {
      type: [
        {
          ruleId: String,
          label: String,
          points: Number,
          matchedAt: Date,
        },
      ],
      default: [],
    },
    // Staff can override the auto-computed temperature (Phase 2 UI) without
    // losing the original computed score — both are preserved so an override
    // is always visibly distinguishable from a system-computed value.
    temperatureOverride: {
      type: {
        active: Boolean,
        temperature: { type: String, enum: ["cold", "warm", "hot", "very_hot"] },
        reason: String,
        setBy: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser", default: null },
        setAt: Date,
      },
      default: null,
    },
  },
  { timestamps: true }
);

// Index for fast patient history lookups by phone
BookingSchema.index({ phone: 1 });
BookingSchema.index({ status: 1, createdAt: -1 });
BookingSchema.index({ location: 1, createdAt: -1 });
BookingSchema.index({ doctorId: 1, createdAt: -1 });
BookingSchema.index({ pendingSync: 1, createdAt: -1 });
BookingSchema.index({ leadTemperature: 1, createdAt: -1 });

export default mongoose.models.Booking || mongoose.model("Booking", BookingSchema);
