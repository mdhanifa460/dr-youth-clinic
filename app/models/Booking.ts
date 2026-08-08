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
  },
  { timestamps: true }
);

// Index for fast patient history lookups by phone
BookingSchema.index({ phone: 1 });
BookingSchema.index({ status: 1, createdAt: -1 });
BookingSchema.index({ location: 1, createdAt: -1 });
BookingSchema.index({ doctorId: 1, createdAt: -1 });
BookingSchema.index({ pendingSync: 1, createdAt: -1 });

export default mongoose.models.Booking || mongoose.model("Booking", BookingSchema);
