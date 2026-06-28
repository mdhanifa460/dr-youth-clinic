import { NextResponse } from "next/server";
import { loginAdmin, setAdminSessionCookie } from "@/app/lib/adminAuth";

export const dynamic = "force-dynamic";

function isFormRequest(req: Request) {
  const contentType = req.headers.get("content-type") || "";

  return (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  );
}

function getSafeRedirectPath(value: FormDataEntryValue | unknown) {
  const path = typeof value === "string" ? value : "";

  if (!path || !path.startsWith("/admin") || path.startsWith("/admin/login")) {
    return "/admin";
  }

  return path;
}

export async function POST(req: Request) {
  const fromForm = isFormRequest(req);
  const body = fromForm
    ? await req.formData()
    : await req.json();

  const email = fromForm ? String(body.get("email") || "") : body.email;
  const password = fromForm ? String(body.get("password") || "") : body.password;
  const remember = fromForm
    ? body.get("remember") === "on"
    : body.remember;
  const redirectTo = fromForm
    ? getSafeRedirectPath(body.get("next"))
    : "/admin";

  if (!email || !password) {
    if (fromForm) {
      return NextResponse.redirect(
        new URL("/admin/login?error=missing", req.url),
        303
      );
    }

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
    if (fromForm) {
      return NextResponse.redirect(
        new URL("/admin/login?error=invalid", req.url),
        303
      );
    }

    console.log("SESSION:", session);

    return NextResponse.json(
      { success: false, message: "Invalid email or password" },
      { status: 401 }
    );
  }

  const res = fromForm
    ? NextResponse.redirect(new URL(redirectTo, req.url), 303)
    : NextResponse.json({
        success: true,
        redirectTo,
        user: session.user,
      });

  setAdminSessionCookie(res, session.cookieValue, session.maxAge);

  return res;
}
