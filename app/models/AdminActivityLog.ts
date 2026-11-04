import mongoose from "mongoose";

// Who did what in the admin panel. Deliberately stores copies of the person's
// name/email rather than only a reference, so the history stays readable after
// their account is deleted. No route edits or deletes these; they expire on
// their own after two years.
const AdminActivityLogSchema = new mongoose.Schema(
  {
    actorId:    { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser", default: null },
    actorName:  { type: String, default: "" },
    actorEmail: { type: String, required: true },
    actorRole:  { type: String, default: "" },
    method:     { type: String, required: true },
    path:       { type: String, required: true },
    query:      { type: String, default: "" },
    module:     { type: String, default: "" },
    details:    { type: String, default: "" },
    outcome:    { type: String, enum: ["allowed", "denied", "failed_login"], required: true },
    ipAddress:  { type: String, default: "" },
    userAgent:  { type: String, default: "" },
    createdAt:  { type: Date, default: Date.now, index: { expires: "730d" } },
  },
  { timestamps: false }
);

AdminActivityLogSchema.index({ actorEmail: 1, createdAt: -1 });

export default mongoose.models.AdminActivityLog ||
  mongoose.model("AdminActivityLog", AdminActivityLogSchema);
