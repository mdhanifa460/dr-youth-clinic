import mongoose from "mongoose";

// A single external system the website talks to through the Connector Layer
// (see the Enterprise Connector Framework review). Phase 1 shipped with
// exactly one type, "crm" — the schema stayed generic on purpose so a
// second connector TYPE is a new enum value + its own webhook receiver,
// never a schema migration. "lead_source" is that second type: any
// third-party lead channel (JustDial, IndiaMART, a future SMS gateway or
// listing site) is a Connector row of this type + a
// ConnectorFieldMapping (capability: "intake") the admin configures once
// per provider — never a new code path per provider. See
// app/lib/leadSource/webhookProcessing.ts and
// app/api/webhooks/lead-source/[connectorId]/route.ts.
export type ConnectorType = "crm" | "lead_source";
export type ConnectorStatus = "active" | "paused" | "error" | "draft";

const ConnectorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ["crm", "lead_source"], default: "crm" },
    // For type "lead_source": the channel this connector represents —
    // "justdial", "indiamart", "whatsapp", etc. Free text, not an enum
    // (same reasoning as the CRM case below): a new provider is an admin
    // action, never a code change. This value is what gets written as
    // Booking.source and is the `source` LeadSourceMapping rows are
    // scoped to when resolving which branch a lead belongs to.
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
