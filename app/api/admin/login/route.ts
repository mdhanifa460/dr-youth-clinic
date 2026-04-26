import { NextResponse } from "next/server";
import { loginAdmin, setAdminSessionCookie } from "@/app/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { email, password, remember } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { success: false, message: "Email and password are required" },
      { status: 400 }
    );
  }

  const session = await loginAdmin({
    email,
    password,
    remember,
    userAgent: req.headers.get("user-agent"),
    ipAddress: req.headers.get("x-forwarded-for"),
  });

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Invalid email or password" },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ success: true, user: session.user });

  setAdminSessionCookie(res, session.cookieValue, session.maxAge);

  return res;
}
