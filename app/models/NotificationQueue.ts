import mongoose from "mongoose";

// Queued patient notifications (WhatsApp/SMS/Email).
// The notification is generated server-side from templates; actual sending
// is pluggable — currently surfaced as a WhatsApp deep-link for staff to send manually.
// Auto-send activates once WhatsApp Cloud API / MSG91 credentials are configured.
const NotificationQueueSchema = new mongoose.Schema(
  {
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", required: true, index: true },
    trigger: {
      type: String,
      enum: ["booking_confirmed", "rescheduled", "cancelled", "reminder_24h", "reminder_2h", "treatment_completed", "review_request"],
      required: true,
    },
    channel: { type: String, enum: ["whatsapp", "sms", "email"], default: "whatsapp" },

    recipientName:  { type: String, required: true },
    recipientPhone: { type: String, default: "" },
    recipientEmail: { type: String, default: "" },

    message:     { type: String, required: true },
    whatsappUrl: { type: String, default: "" }, // Pre-built wa.me deep-link for manual send

    scheduledAt: { type: Date, default: Date.now },
    sentAt:      { type: Date, default: null },
    status:      { type: String, enum: ["pending", "sent", "failed"], default: "pending" },
    errorMessage: { type: String, default: "" },

    // Set to true when staff manually confirmed they sent it via WhatsApp link
    manuallyConfirmed:    { type: Boolean, default: false },
    manuallyConfirmedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser" },
    manuallyConfirmedAt:  { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.NotificationQueue ||
  mongoose.model("NotificationQueue", NotificationQueueSchema);
