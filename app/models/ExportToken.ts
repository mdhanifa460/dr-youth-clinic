import mongoose from "mongoose";

// Stores hashed one-time download tokens for secure lead exports.
// Raw token is returned to the client; only the SHA-256 hash is stored.
const ExportTokenSchema = new mongoose.Schema(
  {
    tokenHash:    { type: String, required: true, unique: true, index: true },
    adminUserId:  { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser", required: true },
    expiresAt:    { type: Date, required: true },
    usedAt:       { type: Date, default: null },
    filters:      { type: mongoose.Schema.Types.Mixed, default: {} },
    recordCount:  { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.ExportToken ||
  mongoose.model("ExportToken", ExportTokenSchema);
