import mongoose from "mongoose";

// A single external system the website talks to through the Connector Layer
// (see the Enterprise Connector Framework review). Phase 1 ships with
// exactly one row, type "crm" — the schema stays generic so a second
// connector is a new document, not a schema migration.
export type ConnectorType = "crm";
export type ConnectorStatus = "active" | "paused" | "error" | "draft";

const ConnectorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ["crm"], default: "crm" },
    provider: { type: String, default: "" }, // e.g. "leadsquared" — free text, not an enum
    status: { type: String, enum: ["active", "paused", "error", "draft"], default: "draft" },

    config: {
      baseUrl: { type: String, default: "" },
      timeoutMs: { type: Number, default: 10000 },
      retryCount: { type: Number, default: 3 },
      pullIntervalMin: { type: Number, default: 15 },
      // Per-operation URL paths, e.g. { getDoctors: "/api/v2/doctors",
      // pushWebsiteLead: "/api/v2/leads" } — appended to baseUrl. Different
      // CRMs use different URL structures for the same operation; this is
      // config, not something CRMConnector.ts hardcodes, so a different
      // provider's endpoint layout never requires a code change.
      endpoints: { type: mongoose.Schema.Types.Mixed, default: {} },
    },

    // Inbound webhook signature secret — encrypted the same way as
    // ConnectorCredential, kept separate since it verifies incoming
    // requests rather than authenticating outbound ones. Write-only from
    // the admin UI, same pattern as credentials.
    webhookSecret: {
      encrypted: { type: String, default: "" },
      iv: { type: String, default: "" },
      authTag: { type: String, default: "" },
      last4: { type: String, default: "" },
    },

    health: {
      lastCheckAt: { type: Date, default: null },
      lastCheckOk: { type: Boolean, default: null },
      lastCheckMessage: { type: String, default: "" },
      successRate24h: { type: Number, default: null },
      avgResponseMs: { type: Number, default: null },
      lastSyncAt: { type: Date, default: null },
      nextSyncAt: { type: Date, default: null },
      consecutiveFailures: { type: Number, default: 0 },
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser", default: null },
  },
  { timestamps: true }
);

ConnectorSchema.index({ type: 1 });

export default mongoose.models.Connector || mongoose.model("Connector", ConnectorSchema);
