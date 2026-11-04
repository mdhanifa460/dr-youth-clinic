import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import AdminUser from "@/app/models/AdminUser";
import { checkPassword, consumeTwoFactorCode, decryptTwoFactorSecret, encryptTwoFactorSecret, getAdminUser } from "@/app/lib/adminAuth";
import { recordAdminActivity } from "@/app/lib/adminActivity";
import { checkRateLimit, tooManyRequestsResponse } from "@/app/lib/rateLimit";
import { generateBackupCodes, generateTotpSecret, hashBackupCode, matchTotpStep, totpUri } from "@/app/lib/twoFactor";

export const dynamic = "force-dynamic";

const unauthorised = () => NextResponse.json({ success: false, message: "Unauthorised" }, { status: 401 });
const fail = (message: string) => NextResponse.json({ success: false, message }, { status: 400 });

export async function GET() {
  const me = await getAdminUser();
  if (!me) return unauthorised();
  await connectDB();
  const user = await (AdminUser as any).findById(me._id).select("totpEnabled +totpBackupCodes").lean();
  return NextResponse.json({
    success: true,
    data: { enabled: !!user?.totpEnabled, backupCodesLeft: user?.totpBackupCodes?.length ?? 0 },
  });
}

// Every action needs the current password or a code, so an unattended logged-in
// browser can't be used to take over or remove someone's two-step login.
export async function POST(req: NextRequest) {
  const me = await getAdminUser();
  if (!me) return unauthorised();

  const rl = await checkRateLimit(`two-factor-manage:${me._id}`, 10, 15 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  try {
    await connectDB();
    const { action, password, code } = await req.json();
    const model = AdminUser as any;
    const user = await model.findById(me._id).select("+totpPendingSecret").lean();
    if (!user) return unauthorised();

    const passwordOk = () =>
      typeof password === "string" && checkPassword(password, user.passwordHash, user.passwordSalt, user.passwordIterations);

    if (action === "setup") {
      if (user.totpEnabled) return fail("Two-step login is already on");
      if (!passwordOk()) return fail("Your password is incorrect");
      const secret = generateTotpSecret();
      await model.findByIdAndUpdate(me._id, { $set: { totpPendingSecret: encryptTwoFactorSecret(secret) } });
      return NextResponse.json({ success: true, data: { secret, uri: totpUri(secret, me.email) } });
    }

    if (action === "confirm") {
      if (user.totpEnabled) return fail("Two-step login is already on");
      const secret = user.totpPendingSecret ? decryptTwoFactorSecret(user.totpPendingSecret) : null;
      if (!secret) return fail("Please start the setup again");
      const step = typeof code === "string" ? matchTotpStep(secret, code.trim()) : null;
      if (step === null) return fail("That code isn't right. Check the app and try again.");

      const backupCodes = generateBackupCodes();
      await model.findByIdAndUpdate(me._id, {
        $set: {
          totpEnabled: true,
          totpSecret: user.totpPendingSecret,
          totpLastStep: step,
          totpBackupCodes: backupCodes.map(hashBackupCode),
        },
        $unset: { totpPendingSecret: 1 },
      });
      await recordAdminActivity({ actor: me, details: "Turned on two-step login" });
      return NextResponse.json({ success: true, data: { backupCodes } });
    }

    if (action === "disable") {
      if (!user.totpEnabled) return fail("Two-step login is already off");
      if (!passwordOk()) return fail("Your password is incorrect");
      if (!(await consumeTwoFactorCode(me._id, code))) return fail("That code isn't right");
      await model.findByIdAndUpdate(me._id, {
        $set: { totpEnabled: false },
        $unset: { totpSecret: 1, totpPendingSecret: 1, totpBackupCodes: 1, totpLastStep: 1 },
      });
      await recordAdminActivity({ actor: me, details: "Turned off two-step login" });
      return NextResponse.json({ success: true });
    }

    return fail("Unknown action");
  } catch (err: any) {
    console.error("Two-step setup failed:", err?.message);
    return NextResponse.json({ success: false, message: "Something went wrong. Please try again." }, { status: 500 });
  }
}
