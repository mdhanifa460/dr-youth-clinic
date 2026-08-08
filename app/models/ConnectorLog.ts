import mongoose from "mongoose";

// One row per push/pull attempt — mirrors NotificationQueue's proven
// pending/sent/failed shape. Powers the Sync Manager's Logs tab and the
// 24h success-rate stat on Connector.health.
const ConnectorLogSchema = new mongoose.Schema(
  {
    connectorId: { type: mongoose.Schema.Types.ObjectId, ref: "Connector", required: true, index: true },
    direction: { type: String, enum: ["push", "pull"], required: true },
    operation: { type: String, required: true }, // "pushWebsiteLead", "getDoctors", ...
    status: { type: String, enum: ["success", "failed", "retrying", "dead"], default: "success", index: true },
    httpStatus: { type: Number, default: null },
    latencyMs: { type: Number, default: null },
    attempt: { type: Number, default: 1 },
    errorMessage: { type: String, default: "" },
    // Redacted summaries only — no raw secrets, no full patient PII dumps.
    requestSummary: { type: mongoose.Schema.Types.Mixed, default: null },
    responseSummary: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

ConnectorLogSchema.index({ connectorId: 1, createdAt: -1 });

export default mongoose.models.ConnectorLog || mongoose.model("ConnectorLog", ConnectorLogSchema);
