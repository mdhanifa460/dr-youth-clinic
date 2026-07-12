import mongoose from "mongoose";

// Named, saved QR codes generated from Admin -> AI Assessment -> QR Generator
// -- so marketing can regenerate/reprint a known code (e.g. "Anna Nagar
// Reception") without re-entering its location/channel/campaign each time,
// and so QR-attributed leads can be traced back to a specific print run.
const QrCodeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    landingPage: { type: String, default: "ai-assessment" },
    clinicLocation: { type: String, default: "" },
    channel: { type: String, default: "" },
    campaign: { type: String, required: true },
    targetUrl: { type: String, required: true },
  },
  { timestamps: true }
);

export const QrCode = mongoose.models.QrCode || mongoose.model("QrCode", QrCodeSchema);
