import mongoose from "mongoose";

// Every write action on an appointment produces one audit log entry.
const AppointmentAuditLogSchema = new mongoose.Schema(
  {
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", required: true, index: true },
    action: {
      type: String,
      enum: ["created", "status_changed", "rescheduled", "cancelled", "doctor_changed", "note_added", "notification_sent"],
      required: true,
    },
    performedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser" },
      name:   String,
      email:  String,
      role:   String,
    },
    // Flexible payload — varies by action type
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    performedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

export default mongoose.models.AppointmentAuditLog ||
  mongoose.model("AppointmentAuditLog", AppointmentAuditLogSchema);
