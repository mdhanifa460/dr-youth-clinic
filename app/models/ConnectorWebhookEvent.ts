import mongoose from "mongoose";

// Inbound events from the CRM, received at /api/webhooks/crm/[event].
// Written unconditionally — even a bad signature is logged, never silently
// dropped — so a misconfigured secret is debuggable from the Sync Manager's
// Logs tab instead of just vanishing.
const ConnectorWebhookEventSchema = new mongoose.Schema(
  {
    connectorId: { type: mongoose.Schema.Types.ObjectId, ref: "Connector", required: true, index: true },
    event: { type: String, required: true },
    signatureValid: { type: Boolean, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: null },
    status: { type: String, enum: ["received", "processed", "ignored", "failed"], default: "received" },
    processedAt: { type: Date, default: null },
    errorMessage: { type: String, default: "" },
  },
  { timestamps: true }
);

ConnectorWebhookEventSchema.index({ connectorId: 1, createdAt: -1 });

export default mongoose.models.ConnectorWebhookEvent || mongoose.model("ConnectorWebhookEvent", ConnectorWebhookEventSchema);
