import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import AdminUser from "@/app/models/AdminUser";
import { getAdminUser, hashPassword, checkPassword } from "@/app/lib/adminAuth";

// Lets a client component find out its own user's role/permission level —
// e.g. to hide or disable a "full"-only action instead of letting a
// view-only user click it and get a confusing 403 (same info AdminSidebar
// already gets, but that one is server-rendered via app/admin/layout.tsx;
// pages that are "use client" all the way down have no other way to learn
// their own role without a request like this one).
export async function GET() {
  const me = await getAdminUser();
  if (!me) return NextResponse.json({ success: false, message: "Unauthorised" }, { status: 401 });
  return NextResponse.json({ success: true, data: { role: me.role, name: me.name, email: me.email } });
}

export async function PUT(req: NextRequest) {
  const me = await getAdminUser();
  if (!me) return NextResponse.json({ success: false, message: "Unauthorised" }, { status: 401 });

  try {
    await connectDB();
    const { name, currentPassword, newPassword } = await req.json();

    const update: Record<string, any> = {};

    if (name?.trim()) update.name = name.trim();

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ success: false, message: "Current password is required to set a new one" }, { status: 400 });
      }
      if (newPassword.length < 8) {
        return NextResponse.json({ success: false, message: "New password must be at least 8 characters" }, { status: 400 });
      }

      const user = await (AdminUser as any).findById(me._id).lean() as any;
      if (!user) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });

      const valid = checkPassword(currentPassword, user.passwordHash, user.passwordSalt, user.passwordIterations);
      if (!valid) {
        return NextResponse.json({ success: false, message: "Current password is incorrect" }, { status: 400 });
      }

      const { hash, salt, iterations } = hashPassword(newPassword);
      update.passwordHash = hash;
      update.passwordSalt = salt;
      update.passwordIterations = iterations;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: false, message: "Nothing to update" }, { status: 400 });
    }

    await (AdminUser as any).findByIdAndUpdate(me._id, { $set: update }, { runValidators: false });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Update failed" }, { status: 500 });
  }
}
