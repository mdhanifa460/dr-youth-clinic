import mongoose from "mongoose";

// One row per scheduled/manual pull batch (e.g. one "sync doctors + branches"
// run) — separate from ConnectorLog, which is per individual API attempt.
// Powers the Sync Manager's "last sync" summary and Dashboard's sync widget.
const ConnectorSyncRunSchema = new mongoose.Schema(
  {
    connectorId: { type: mongoose.Schema.Types.ObjectId, ref: "Connector", required: true, index: true },
    trigger: { type: String, enum: ["scheduled", "manual"], required: true },
    scope: { type: [String], default: [] }, // e.g. ["doctors", "branches"]
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date, default: null },
    itemsTotal: { type: Number, default: 0 },
    itemsSynced: { type: Number, default: 0 },
    itemsUnmatched: { type: Number, default: 0 }, // CRM records with no safe local match — see doctor/branch sync notes
    itemsFailed: { type: Number, default: 0 },
    status: { type: String, enum: ["running", "completed", "completed_with_errors", "failed"], default: "running" },
    errorMessage: { type: String, default: "" },
  },
  { timestamps: true }
);

ConnectorSyncRunSchema.index({ connectorId: 1, createdAt: -1 });

export default mongoose.models.ConnectorSyncRun || mongoose.model("ConnectorSyncRun", ConnectorSyncRunSchema);
