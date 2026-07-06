import mongoose from "mongoose";

export type AppointmentStatus =
  | "new_lead"
  | "requested"
  | "confirmed"
  | "reminder_sent"
  | "checked_in"
  | "consultation_started"
  | "treatment_completed"
  | "follow_up_scheduled"
  | "closed"
  | "cancelled"
  | "no_show";

export type AppointmentType = "consultation" | "treatment" | "follow_up" | "patch_test";
export type BookingSource   = "walk_in" | "website" | "phone" | "whatsapp" | "instagram" | "referral" | "other";
export type RescheduleReason = "patient_requested" | "doctor_unavailable" | "clinic_holiday" | "emergency" | "equipment_maintenance" | "weather" | "other";

const AppointmentSchema = new mongoose.Schema(
  {
    appointmentId: { type: String, unique: true, sparse: true },

    // Patient
    patientName:  { type: String, required: true },
    patientPhone: { type: String, required: true },
    patientEmail: { type: String, default: "" },

    // Clinic
    branch: { type: String, required: true },

    // Doctor
    doctorId:   { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    doctorName: { type: String, required: true },

    // Treatment
    service:            { type: String, required: true },
    appointmentType:    { type: String, enum: ["consultation", "treatment", "follow_up", "patch_test"], default: "consultation" },
    durationMinutes:    { type: Number, default: 30, min: 5, max: 480 },
    skinConcern:        { type: String, default: "" },
    treatmentArea:      { type: String, default: "" },

    // Package / session tracking (aesthetic clinic specific)
    sessionNumber:  { type: Number, default: null },
    totalSessions:  { type: Number, default: null },
    packageName:    { type: String, default: "" },

    // Time
    date:      { type: String, required: true },   // YYYY-MM-DD
    startTime: { type: String, required: true },   // HH:MM
    endTime:   { type: String, required: true },   // HH:MM (startTime + durationMinutes)

    // Status
    status: {
      type:    String,
      enum:    ["new_lead", "requested", "confirmed", "reminder_sent", "checked_in", "consultation_started", "treatment_completed", "follow_up_scheduled", "closed", "cancelled", "no_show"],
      default: "requested",
      index:   true,
    },

    // Source
    bookingSource: {
      type:    String,
      enum:    ["walk_in", "website", "phone", "whatsapp", "instagram", "referral", "other"],
      default: "phone",
    },

    // Pre-treatment checklist (aesthetic clinic specific)
    patchTestRequired: { type: Boolean, default: false },
    patchTestDate:     { type: Date,    default: null },
    patchTestDone:     { type: Boolean, default: false },
    consentFormSigned: { type: Boolean, default: false },
    preInstructions:   { type: String,  default: "" },

    // Post-treatment
    postNotes:         { type: String,  default: "" },
    followUpDate:      { type: String,  default: "" }, // YYYY-MM-DD

    // Reschedule history (last reschedule stored here; full history in AuditLog)
    rescheduleCount: { type: Number, default: 0 },
    lastRescheduledAt: { type: Date, default: null },

    // Cancellation / no-show
    cancellationReason: { type: String, default: "" },
    noShowReason:       { type: String, default: "" },

    // Room (for multi-room clinics)
    roomNumber: { type: String, default: "" },

    // Timestamps of key events
    checkedInAt:            { type: Date, default: null },
    consultationStartedAt:  { type: Date, default: null },
    treatmentCompletedAt:   { type: Date, default: null },

    // Internal notes
    internalNotes: { type: String, default: "" },

    // Notification tracking
    notificationsSent: [{ type: { type: String }, channel: String, sentAt: Date }],

    // Audit
    createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser" },
    lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser" },

    // Link from old Booking form (optional migration bridge)
    sourceBookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
  },
  { timestamps: true }
);

// Indexes for conflict detection and common queries
AppointmentSchema.index({ doctorId: 1, date: 1 });
AppointmentSchema.index({ branch: 1, date: 1 });
AppointmentSchema.index({ status: 1, date: 1 });

export default mongoose.models.Appointment ||
  mongoose.model("Appointment", AppointmentSchema);
