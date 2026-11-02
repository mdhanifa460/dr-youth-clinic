import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import AdminUser from "@/app/models/AdminUser";
import { requirePermission, hashPassword, getAdminUser } from "@/app/lib/adminAuth";
import { ALL_ROLES, type AdminRole } from "@/app/lib/permissions";

export async function GET() {
  const denied = await requirePermission("team", "view");
  if (denied) return denied;

  try {
    await connectDB();
    const users = await AdminUser.find({} as any)
      .select("-passwordHash -passwordSalt -passwordIterations")
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ success: true, data: users });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to fetch team" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requirePermission("team", "full");
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();
    const { email, name, role, password, assignedClinics } = body;

    if (!email || !name || !role || !password) {
      return NextResponse.json({ success: false, message: "email, name, role, and password are required" }, { status: 400 });
    }

    if (!ALL_ROLES.includes(role as AdminRole)) {
      return NextResponse.json({ success: false, message: "Invalid role" }, { status: 400 });
    }

    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ success: false, message: "Password must be at least 8 characters" }, { status: 400 });
    }

    // clinic_owner also has team:'full' — without this they could mint a
    // super_admin account and log in with it.
    const me = await getAdminUser();
    if (role === "super_admin" && me?.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Only a super admin can grant the super admin role" }, { status: 403 });
    }

    const existing = await AdminUser.findOne({ email: email.toLowerCase().trim() } as any).lean();
    if (existing) {
      return NextResponse.json({ success: false, message: "Email already in use" }, { status: 409 });
    }

    const { hash, salt, iterations } = hashPassword(password);
    const user = await AdminUser.create({
      email: email.toLowerCase().trim(),
      name,
      role,
      passwordHash: hash,
      passwordSalt: salt,
      passwordIterations: iterations,
      assignedClinics: assignedClinics ?? ["all"],
      isActive: true,
    });

    const safe = { _id: user._id, email: user.email, name: user.name, role: user.role, assignedClinics: user.assignedClinics, isActive: user.isActive, createdAt: user.createdAt };
    return NextResponse.json({ success: true, data: safe }, { status: 201 });
  } catch (err: any) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors ?? {}).map((e: any) => e.message);
      return NextResponse.json({ success: false, message: messages.join(", ") }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: "Failed to create team member" }, { status: 500 });
  }
}
