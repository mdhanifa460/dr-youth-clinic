import { createHash, randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { getAdminUser, checkPassword } from "@/app/lib/adminAuth";
import AdminUser from "@/app/models/AdminUser";
import Booking from "@/app/models/Booking";
import ExportToken from "@/app/models/ExportToken";
import LeadExportAuditLog from "@/app/models/LeadExportAuditLog";
import { EXPORT_ALLOWED_ROLES } from "@/app/lib/permissions";

export const dynamic = "force-dynamic";

const EXPORT_LIMIT = 500;
const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

function buildQuery(
  filters: { dateFrom?: string; dateTo?: string; location?: string; status?: string; service?: string },
  assignedClinics: string[]
): Record<string, any> {
  const q: Record<string, any> = {};

  const branchRestricted = !assignedClinics.includes("all");
  if (branchRestricted) {
    q.location = { $in: assignedClinics };
  } else if (filters.location) {
    q.location = filters.location;
  }

  if (filters.status)  q.status  = filters.status;
  if (filters.service) q.service = { $regex: filters.service, $options: "i" };

  if (filters.dateFrom || filters.dateTo) {
    q.createdAt = {};
    if (filters.dateFrom) q.createdAt.$gte = new Date(filters.dateFrom);
    if (filters.dateTo)   q.createdAt.$lte = new Date(filters.dateTo + "T23:59:59.999Z");
  }

  return q;
}

export async function POST(req: NextRequest) {
  await connectDB();

  const user = await getAdminUser();
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  if (!EXPORT_ALLOWED_ROLES.includes(user.role)) {
    return NextResponse.json({ success: false, message: "Your role is not permitted to export leads." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { password, dateFrom, dateTo, location, status, service } = body as {
    password?: string;
    dateFrom?: string;
    dateTo?: string;
    location?: string;
    status?: string;
    service?: string;
  };

  // Require password re-authentication
  if (!password) {
    return NextResponse.json({ success: false, message: "Password confirmation is required to export leads." }, { status: 400 });
  }

  const dbUser = await (AdminUser as any).findById(user._id).lean() as any;
  if (!dbUser) {
    return NextResponse.json({ success: false, message: "User not found." }, { status: 404 });
  }
  if (!checkPassword(password, dbUser.passwordHash, dbUser.passwordSalt, dbUser.passwordIterations)) {
    return NextResponse.json({ success: false, message: "Incorrect password." }, { status: 401 });
  }

  // At least one filter required
  const hasFilter = Boolean(dateFrom || dateTo || location || status || service);
  if (!hasFilter) {
    return NextResponse.json({
      success: false,
      message: "Please apply at least one filter (date range, branch, status, or service) before exporting.",
    }, { status: 400 });
  }

  const filters = { dateFrom, dateTo, location, status, service };
  const query   = buildQuery(filters, user.assignedClinics);
  const count   = await (Booking as any).countDocuments(query);

  if (count === 0) {
    return NextResponse.json({ success: false, message: "No records match the selected filters." }, { status: 400 });
  }

  if (count > EXPORT_LIMIT) {
    return NextResponse.json({
      success: false,
      message: `Too many records (${count}). Maximum ${EXPORT_LIMIT} per export. Please narrow your filters.`,
    }, { status: 400 });
  }

  // Gather request metadata
  const ip        = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";

  // Write audit log
  await LeadExportAuditLog.create({
    adminUserId:  user._id,
    adminName:    user.name,
    adminEmail:   user.email,
    adminRole:    user.role,
    branch:       user.assignedClinics.includes("all") ? (location || "all") : user.assignedClinics.join(", "),
    filters,
    recordCount:  count,
    ipAddress:    ip,
    userAgent,
  });

  // Create one-time signed download token
  const rawToken  = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await ExportToken.create({
    tokenHash,
    adminUserId: user._id,
    expiresAt,
    filters,
    recordCount: count,
  });

  return NextResponse.json({
    success:     true,
    token:       rawToken,
    count,
    expiresAt:   expiresAt.toISOString(),
    downloadUrl: `/api/admin/leads/export/download/${rawToken}`,
  });
}
