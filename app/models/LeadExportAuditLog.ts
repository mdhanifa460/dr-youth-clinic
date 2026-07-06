import mongoose from "mongoose";

const LeadExportAuditLogSchema = new mongoose.Schema(
  {
    adminUserId:  { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser", required: true },
    adminName:    { type: String, required: true },
    adminEmail:   { type: String, required: true },
    adminRole:    { type: String, required: true },
    branch:       { type: String, default: "all" },
    filters:      { type: mongoose.Schema.Types.Mixed, default: {} },
    recordCount:  { type: Number, required: true },
    ipAddress:    { type: String, default: "" },
    userAgent:    { type: String, default: "" },
    exportedAt:   { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export default mongoose.models.LeadExportAuditLog ||
  mongoose.model("LeadExportAuditLog", LeadExportAuditLogSchema);
