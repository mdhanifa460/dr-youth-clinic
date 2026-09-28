import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import AdminUser from "@/app/models/AdminUser";
import { requirePermission, hashPassword, getAdminUser } from "@/app/lib/adminAuth";
import { ALL_ROLES, ALL_MODULES, type AdminRole, type PermissionOverrides } from "@/app/lib/permissions";

const VALID_LEVELS = new Set(["full", "view", "none"]);
const VALID_MODULES = new Set(ALL_MODULES);

// Never trust the shape of admin-submitted JSON going into a Mixed-typed
// Mongo field (no schema-level enum to catch a bad key/value the way a
// typed field would) — an invalid module name or level here would silently
// go live as a real, unintended grant/denial for that person.
function validateOverrides(input: unknown): PermissionOverrides | null {
  if (input === null) return null; // explicit clear, allowed
  if (typeof input !== "object" || Array.isArray(input)) {
    throw new Error("permissionOverrides must be an object");
  }
  const out: PermissionOverrides = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!VALID_MODULES.has(key as any)) throw new Error(`Unknown module: ${key}`);
    if (!VALID_LEVELS.has(value as any)) throw new Error(`Invalid access level for ${key}: ${value}`);
    out[key as keyof PermissionOverrides] = value as any;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("team", "full");
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();
    const { role, isActive, name, assignedClinics, password, permissionOverrides } = body;

    const me = await getAdminUser();
    const editingSelf = !!(me && me._id === params.id);
    if (editingSelf && role && role !== me.role) {
      // Prevent self-role-change unless super_admin
      if (me.role !== "super_admin") {
        return NextResponse.json({ success: false, message: "Cannot change your own role" }, { status: 403 });
      }
    }
    // Same reasoning as the self-role-change guard above: a clinic_owner
    // (the other role with team:'full') granting themselves extra
    // per-module overrides would be self-escalation through a side door
    // that guard doesn't cover — restrict editing your OWN overrides to
    // super_admin, same as your own role.
    if (editingSelf && permissionOverrides !== undefined && me!.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Cannot change your own permission overrides" }, { status: 403 });
    }

    if (role && !ALL_ROLES.includes(role as AdminRole)) {
      return NextResponse.json({ success: false, message: "Invalid role" }, { status: 400 });
    }

    let validatedOverrides: PermissionOverrides | null | undefined;
    if (permissionOverrides !== undefined) {
      try {
        validatedOverrides = validateOverrides(permissionOverrides);
      } catch (e: any) {
        return NextResponse.json({ success: false, message: e.message }, { status: 400 });
      }
    }

    const update: Record<string, any> = {};
    if (role !== undefined) update.role = role;
    if (isActive !== undefined) update.isActive = isActive;
    if (name !== undefined) update.name = name;
    if (assignedClinics !== undefined) update.assignedClinics = assignedClinics;
    if (permissionOverrides !== undefined) update.permissionOverrides = validatedOverrides;
    if (password) {
      const { hash, salt, iterations } = hashPassword(password);
      update.passwordHash = hash;
      update.passwordSalt = salt;
      update.passwordIterations = iterations;
    }

    const user = await (AdminUser as any).findByIdAndUpdate(
      params.id,
      { $set: update },
      { returnDocument: 'after', runValidators: true, select: "-passwordHash -passwordSalt -passwordIterations" }
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
      { returnDocument: 'after', select: "-passwordHash -passwordSalt -passwordIterations" }
    ).lean();

    if (!user) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: user });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to deactivate user" }, { status: 500 });
  }
}
