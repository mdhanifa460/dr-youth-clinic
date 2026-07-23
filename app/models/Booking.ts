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
  },
  { timestamps: true }
);

// Index for fast patient history lookups by phone
BookingSchema.index({ phone: 1 });
BookingSchema.index({ status: 1, createdAt: -1 });
BookingSchema.index({ location: 1, createdAt: -1 });

export default mongoose.models.Booking || mongoose.model("Booking", BookingSchema);
