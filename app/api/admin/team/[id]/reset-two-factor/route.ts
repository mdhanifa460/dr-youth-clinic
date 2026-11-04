import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import AdminUser from "@/app/models/AdminUser";
import AdminSession from "@/app/models/AdminSession";
import { getAdminUser, requirePermission } from "@/app/lib/adminAuth";
import { recordAdminActivity } from "@/app/lib/adminActivity";

// For a colleague who has lost their phone and backup codes. Same guards as
// resetting a password, because this removes the same kind of protection.
export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission("team", "full");
  if (denied) return denied;

  const me = await getAdminUser();
  if (me && me._id === params.id) {
    return NextResponse.json({ success: false, message: "Turn off your own two-step login from your profile" }, { status: 403 });
  }

  try {
    await connectDB();
    const target = await (AdminUser as any).findById(params.id).select("role email").lean();
    if (!target) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });

    if (target.role === "super_admin" && me?.role !== "super_admin") {
      return NextResponse.json({ success: false, message: "Only a super admin can change a super admin" }, { status: 403 });
    }

    await (AdminUser as any).findByIdAndUpdate(params.id, {
      $set: { totpEnabled: false },
      $unset: { totpSecret: 1, totpPendingSecret: 1, totpBackupCodes: 1, totpLastStep: 1 },
    });
    await (AdminSession as any).updateMany(
      { adminUserId: params.id, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } }
    );

    if (me) await recordAdminActivity({ actor: me, module: "team", details: `Reset two-step login for ${target.email}` });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to reset two-step login" }, { status: 500 });
  }
}
