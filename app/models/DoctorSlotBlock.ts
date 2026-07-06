import mongoose from "mongoose";

// Doctors mark themselves unavailable via these records.
// Reception cannot create or delete these — only doctors, clinic managers, and owners.
const DoctorSlotBlockSchema = new mongoose.Schema(
  {
    doctorId:   { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true, index: true },
    doctorName: { type: String, required: true },
    branch:     { type: String, required: true },

    date:      { type: String, required: true }, // YYYY-MM-DD
    startTime: { type: String, required: true }, // HH:MM
    endTime:   { type: String, required: true }, // HH:MM

    blockType: {
      type: String,
      enum: ["vacation", "lunch_break", "surgery", "training", "personal", "other"],
      default: "other",
    },
    reason: { type: String, default: "" },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser" },
  },
  { timestamps: true }
);

DoctorSlotBlockSchema.index({ doctorId: 1, date: 1 });

export default mongoose.models.DoctorSlotBlock ||
  mongoose.model("DoctorSlotBlock", DoctorSlotBlockSchema);
