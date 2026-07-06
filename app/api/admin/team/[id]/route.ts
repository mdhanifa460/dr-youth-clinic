import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import AdminUser from "@/app/models/AdminUser";
import { requirePermission, hashPassword, getAdminUser } from "@/app/lib/adminAuth";
import { ALL_ROLES, type AdminRole } from "@/app/lib/permissions";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("team", "full");
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();
    const { role, isActive, name, assignedClinics, password } = body;

    const me = await getAdminUser();
    if (me && me._id === params.id && role && role !== me.role) {
      // Prevent self-role-change unless super_admin
      if (me.role !== "super_admin") {
        return NextResponse.json({ success: false, message: "Cannot change your own role" }, { status: 403 });
      }
    }

    if (role && !ALL_ROLES.includes(role as AdminRole)) {
      return NextResponse.json({ success: false, message: "Invalid role" }, { status: 400 });
    }

    const update: Record<string, any> = {};
    if (role !== undefined) update.role = role;
    if (isActive !== undefined) update.isActive = isActive;
    if (name !== undefined) update.name = name;
    if (assignedClinics !== undefined) update.assignedClinics = assignedClinics;
    if (password) {
      const { hash, salt, iterations } = hashPassword(password);
      update.passwordHash = hash;
      update.passwordSalt = salt;
      update.passwordIterations = iterations;
    }

    const user = await (AdminUser as any).findByIdAndUpdate(
      params.id,
      { $set: update },
      { new: true, runValidators: true, select: "-passwordHash -passwordSalt -passwordIterations" }
    ).lean();

    if (!user) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: user });
  } catch (err: any) {
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors ?? {}).map((e: any) => e.message);
      return NextResponse.json({ success: false, message: messages.join(", ") }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("team", "full");
  if (denied) return denied;

  const me = await getAdminUser();
  if (me && me._id === params.id) {
    return NextResponse.json({ success: false, message: "Cannot deactivate your own account" }, { status: 403 });
  }

  try {
    await connectDB();
    const user = await (AdminUser as any).findByIdAndUpdate(
      params.id,
      { $set: { isActive: false } },
      { new: true, select: "-passwordHash -passwordSalt -passwordIterations" }
    ).lean();

    if (!user) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: user });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to deactivate user" }, { status: 500 });
  }
}
