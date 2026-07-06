import mongoose from "mongoose";
import { ALL_ROLES } from "@/app/lib/permissions";

const AdminUserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      default: "Clinic Admin",
    },
    role: {
      type: String,
      enum: ALL_ROLES,
      default: "clinic_owner",
    },
    passwordHash: {
      type: String,
      required: true,
    },
    passwordSalt: {
      type: String,
      required: true,
    },
    passwordIterations: {
      type: Number,
      required: true,
    },
    phone: {
      type: String,
      default: "",
    },
    avatar: {
      type: String,
      default: "",
    },
    assignedClinics: {
      type: [String],
      default: ["all"],
    },
    // Link to Doctor profile (set when role='doctor' to scope their appointment view)
    linkedDoctorId: {
      type: String,
      default: null,
    },
    lastLoginAt: Date,
    lastLoginIp: String,
    lastLoginDevice: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.AdminUser ||
  mongoose.model("AdminUser", AdminUserSchema);
