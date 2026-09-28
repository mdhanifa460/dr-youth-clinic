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
    // Per-person exceptions to their role's default access, e.g. one
    // receptionist granted 'leads: view' beyond the receptionist role's
    // normal 'none'. Sparse — a module absent here just falls through to
    // ROLE_PERMISSIONS for this user's role (see canAccess in
    // app/lib/permissions.ts). Only ever written by the team PUT route,
    // itself gated to requirePermission('team', 'full') — super_admin and
    // clinic_owner only.
    // Plain object (Mixed), not a Mongoose Map — a Map survives .lean() as a
    // real Map instance, which NextResponse.json() silently serializes to
    // "{}" instead of throwing, a easy-to-miss footgun for an API response.
    permissionOverrides: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
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
