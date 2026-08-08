import mongoose from "mongoose";

// Platform field -> CRM field, per capability and direction. Edited from
// the Sync Manager's Field Mapping tab — no clinic-specific mapping is
// ever hardcoded in a route file. `transform` is a key into the registry
// in app/lib/crm/fieldMapping.ts (e.g. "phone.normalize").
const MappingFieldSchema = new mongoose.Schema(
  {
    platformField: { type: String, required: true },
    externalField: { type: String, required: true },
    transform: { type: String, default: "" },
    required: { type: Boolean, default: false },
  },
  { _id: false }
);

const ConnectorFieldMappingSchema = new mongoose.Schema(
  {
    connectorId: { type: mongoose.Schema.Types.ObjectId, ref: "Connector", required: true, index: true },
    capability: { type: String, required: true }, // "lead" | "booking" | "doctor" | "branch" | ...
    direction: { type: String, enum: ["push", "pull"], required: true },
    fields: { type: [MappingFieldSchema], default: [] },
  },
  { timestamps: true }
);

ConnectorFieldMappingSchema.index({ connectorId: 1, capability: 1, direction: 1 }, { unique: true });

export default mongoose.models.ConnectorFieldMapping || mongoose.model("ConnectorFieldMapping", ConnectorFieldMappingSchema);
