import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import AdminUser from "@/app/models/AdminUser";
import AdminSession from "@/app/models/AdminSession";
import { requirePermission, hashPassword, getAdminUser } from "@/app/lib/adminAuth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("team", "full");
  if (denied) return denied;

  const me = await getAdminUser();
  // Your own password goes through /api/admin/profile, which requires the
  // current one — otherwise an unattended session could lock its owner out.
  if (me && me._id === params.id) {
    return NextResponse.json({ success: false, message: "Change your own password from your profile" }, { status: 403 });
  }

  try {
    const { password } = await req.json();
    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ success: false, message: "Password must be at least 8 characters" }, { status: 400 });
    }

    await connectDB();
    const target = await (AdminUser as any).findById(params.id).select("role").lean();
    if (!target) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });

    // clinic_owner also has team:'full' — resetting a super_admin's password
    // would let them log in as that super_admin.
    if (target.role === "super_admin" && me?.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Only a super admin can reset a super admin's password" }, { status: 403 });
    }

    const { hash, salt, iterations } = hashPassword(password);
    await (AdminUser as any).findByIdAndUpdate(params.id, {
      $set: { passwordHash: hash, passwordSalt: salt, passwordIterations: iterations },
    });

    // A reset is often because the account is compromised, so anyone already
    // logged in with the old password has to be kicked out too.
    await (AdminSession as any).updateMany(
      { adminUserId: params.id, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } }
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to reset password" }, { status: 500 });
  }
}
