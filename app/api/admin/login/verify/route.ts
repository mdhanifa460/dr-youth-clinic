import { NextResponse } from "next/server";
import { completeTwoFactorLogin, consumeTwoFactorCode, parseTwoFactorChallenge, setAdminSessionCookie } from "@/app/lib/adminAuth";
import { recordAdminActivity } from "@/app/lib/adminActivity";
import { connectDB } from "@/app/lib/mongodb";
import AdminUser from "@/app/models/AdminUser";
import { checkRateLimit, tooManyRequestsResponse } from "@/app/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { challenge, code } = await req.json().catch(() => ({}));
  const parsed = parseTwoFactorChallenge(challenge);
  if (!parsed) {
    return NextResponse.json({ success: false, message: "This login has expired. Please start again." }, { status: 401 });
  }

  // Limited per account rather than per IP: a 6-digit code is only safe if an
  // attacker holding the password can't try many, from however many addresses.
  const rl = await checkRateLimit(`login-2fa:${parsed.userId}`, 5, 15 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  try {
    if (!(await consumeTwoFactorCode(parsed.userId, code))) {
      await connectDB();
      const user = await (AdminUser as any).findById(parsed.userId).select("email name role").lean();
      if (user) {
        await recordAdminActivity({
          actor: { _id: String(user._id), email: user.email, name: user.name, role: user.role },
          outcome: "failed_login",
          details: "Wrong two-step code",
        });
      }
      return NextResponse.json({ success: false, message: "That code isn't right. Please try again." }, { status: 401 });
    }

    const session = await completeTwoFactorLogin({
      userId: parsed.userId,
      remember: parsed.remember,
      userAgent: req.headers.get("user-agent"),
      ipAddress: req.headers.get("x-forwarded-for"),
    });
    if (!session) {
      return NextResponse.json({ success: false, message: "This account can't sign in." }, { status: 401 });
    }

    await recordAdminActivity({ actor: session.user });
    const res = NextResponse.json({ success: true, user: session.user });
    setAdminSessionCookie(res, session.cookieValue, session.maxAge, parsed.remember);
    return res;
  } catch (err: any) {
    console.error("Two-step login failed:", err?.message);
    return NextResponse.json({ success: false, message: "Something went wrong. Please try again." }, { status: 500 });
  }
}
