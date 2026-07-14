import { NextResponse } from "next/server";
import { loginAdmin, setAdminSessionCookie } from "@/app/lib/adminAuth";
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from "@/app/lib/rateLimit";

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
  // 5 attempts per 15 minutes per IP — brute-force protection
  const ip = getClientIp(req);
  const rl = checkRateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

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

  // The form branch above already coerces both to strings; for the JSON
  // branch, `body.email`/`body.password` are unnarrowed — require strings
  // explicitly rather than relying on downstream methods (.toLowerCase(),
  // pbkdf2Sync) to incidentally throw on a non-string (e.g. a NoSQL-operator
  // object like {"$ne": null}) and fall through to the catch block below.
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
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

  let session;
  try {
    session = await loginAdmin({
      email,
      password,
      remember,
      userAgent: req.headers.get("user-agent"),
      ipAddress: req.headers.get("x-forwarded-for"),
    });
  } catch (err: any) {
    // Thrown when no admin account exists yet and ADMIN_EMAIL/ADMIN_PASSWORD
    // aren't configured (see ensureBootstrapAdmin in adminAuth.ts) — a
    // deploy-configuration problem, not a normal login failure, so it's
    // logged server-side but not exposed verbatim to the client.
    console.error("Admin login failed:", err.message);
    const message = "Admin login is not yet configured. Contact the site administrator.";
    if (fromForm) {
      return NextResponse.redirect(new URL(`/admin/login?error=config`, req.url), 303);
    }
    return NextResponse.json({ success: false, message }, { status: 503 });
  }

  if (!session) {
    if (fromForm) {
      return NextResponse.redirect(
        new URL("/admin/login?error=invalid", req.url),
        303
      );
    }

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

  setAdminSessionCookie(res, session.cookieValue, session.maxAge, !!remember);

  return res;
}
