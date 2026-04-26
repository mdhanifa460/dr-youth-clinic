import mongoose from "mongoose";

const AdminSessionSchema = new mongoose.Schema(
  {
    adminUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser",
      required: true,
    },
    sessionHash: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    userAgent: String,
    ipAddress: String,
    revokedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.models.AdminSession ||
  mongoose.model("AdminSession", AdminSessionSchema);
