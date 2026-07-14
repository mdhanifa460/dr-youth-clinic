import { createHash, createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectDB } from "./mongodb";
import AdminSession from "../models/AdminSession";
import AdminUser from "../models/AdminUser";
import { type AdminRole, type AdminModule, type AccessLevel, canAccess } from "./permissions";

export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8;

const PASSWORD_ITERATIONS = 210_000;
const FALLBACK_SESSION_SECRET = "change-this-admin-session-secret";
const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  process.env.ADMIN_PASSWORD ||
  FALLBACK_SESSION_SECRET;

// This string is public (it's in the source of a public repo), so signing
// session cookies with it is equivalent to not signing them at all. Warn
// loudly rather than silently accepting it — kept as a warning, not a throw,
// so a misconfigured deploy doesn't hard-crash and invalidate real sessions
// that happen to already be running on it.
if (SESSION_SECRET === FALLBACK_SESSION_SECRET) {
  console.error(
    "[SECURITY] No ADMIN_SESSION_SECRET, NEXTAUTH_SECRET, or ADMIN_PASSWORD is set — admin session cookies are being signed with a hardcoded, publicly-known secret. Set ADMIN_SESSION_SECRET immediately."
  );
}

type AdminUserDocument = {
  _id: unknown;
  email: string;
  name?: string;
  role?: string;
  passwordHash: string;
  passwordSalt: string;
  passwordIterations: number;
  isActive: boolean;
  lastLoginAt?: Date;
  save: () => Promise<unknown>;
};

type AdminSessionDocument = {
  _id: unknown;
  adminUserId: unknown;
  sessionHash: string;
  expiresAt: Date;
  revokedAt?: Date;
  save: () => Promise<unknown>;
};

const AdminUserModel = AdminUser as {
  countDocuments: () => Promise<number>;
  create: (body: unknown) => Promise<AdminUserDocument>;
  findOne: (query: unknown) => Promise<AdminUserDocument | null>;
};

const AdminSessionModel = AdminSession as {
  create: (body: unknown) => Promise<AdminSessionDocument>;
  findOne: (query: unknown) => Promise<AdminSessionDocument | null>;
};

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, 64, "sha512").toString("hex");

  return {
    hash,
    salt,
    iterations: PASSWORD_ITERATIONS,
  };
}

function verifyPassword(password: string, user: AdminUserDocument) {
  return checkPassword(password, user.passwordHash, user.passwordSalt, user.passwordIterations);
}

export function checkPassword(password: string, hash: string, salt: string, iterations: number): boolean {
  const candidate = pbkdf2Sync(password, salt, iterations, 64, "sha512");
  const stored = Buffer.from(hash, "hex");
  return stored.length === candidate.length && timingSafeEqual(stored, candidate);
}

function hashSessionId(sessionId: string) {
  return createHash("sha256").update(sessionId).digest("hex");
}

function signSessionId(sessionId: string) {
  return createHmac("sha256", SESSION_SECRET).update(sessionId).digest("hex");
}

export function createSessionCookieValue(sessionId: string) {
  return `${sessionId}.${signSessionId(sessionId)}`;
}

export function parseSignedSessionCookie(value?: string) {
  if (!value) return null;

  const [sessionId, signature] = value.split(".");
  if (!sessionId || !signature) return null;

  const expected = signSessionId(sessionId);
  const left = Buffer.from(signature, "hex");
  const right = Buffer.from(expected, "hex");

  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  return sessionId;
}

async function ensureBootstrapAdmin() {
  const count = await AdminUserModel.countDocuments();

  if (count > 0) return;

  // This repo is public — a hardcoded fallback here (previously
  // admin@dryouth.com / admin123) would be a publicly known default
  // credential for any freshly-provisioned deployment. Require real values
  // instead of silently creating a guessable admin account.
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    throw new Error(
      "No admin account exists yet, and ADMIN_EMAIL/ADMIN_PASSWORD are not set — refusing to bootstrap an admin with a default (guessable) credential. Set both env vars and try again."
    );
  }

  const email = process.env.ADMIN_EMAIL.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const { hash, salt, iterations } = hashPassword(password);

  await AdminUserModel.create({
    email,
    name: "Clinic Admin",
    role: "admin",
    passwordHash: hash,
    passwordSalt: salt,
    passwordIterations: iterations,
  });
}

export async function loginAdmin({
  email,
  password,
  remember,
  userAgent,
  ipAddress,
}: {
  email: string;
  password: string;
  remember?: boolean;
  userAgent?: string | null;
  ipAddress?: string | null;
}) {
  await connectDB();
  await ensureBootstrapAdmin();

  const user = await AdminUserModel.findOne({
    email: email.toLowerCase().trim(),
    isActive: true,
  });

  if (!user || !verifyPassword(password, user)) {
    return null;
  }

  const maxAge = remember ? 60 * 60 * 24 * 7 : ADMIN_SESSION_MAX_AGE;
  const sessionId = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + maxAge * 1000);

  await AdminSessionModel.create({
    adminUserId: user._id,
    sessionHash: hashSessionId(sessionId),
    expiresAt,
    userAgent,
    ipAddress,
  });

  // Migrate legacy role value 'admin' → 'super_admin' so the new enum passes validation
  const roleUpdate: Record<string, any> = { lastLoginAt: new Date() };
  if (!user.role || user.role === "admin") {
    roleUpdate.role = "super_admin";
  }
  await (AdminUser as any).findByIdAndUpdate(user._id, { $set: roleUpdate }, { runValidators: false });

  return {
    cookieValue: createSessionCookieValue(sessionId),
    maxAge,
    user: {
      email: user.email,
      name: user.name || "Clinic Admin",
      role: (!user.role || user.role === "admin") ? "super_admin" : user.role,
    },
  };
}

export async function getAdminSession() {
  const sessionId = parseSignedSessionCookie(
    cookies().get(ADMIN_SESSION_COOKIE)?.value
  );

  if (!sessionId) return null;

  await connectDB();

  return AdminSessionModel.findOne({
    sessionHash: hashSessionId(sessionId),
    revokedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  });
}

export async function requireAdminSession() {
  const session = await getAdminSession();

  if (session) return session;

  return null;
}

export function unauthorized() {
  return NextResponse.json(
    { success: false, message: "Unauthorized" },
    { status: 401 }
  );
}

export function setAdminSessionCookie(
  res: NextResponse,
  value: string,
  maxAge: number,
  remember = false
) {
  res.cookies.set(ADMIN_SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    // No maxAge when not remembering → becomes a session cookie,
    // which the browser deletes automatically when it closes.
    ...(remember ? { maxAge } : {}),
    path: "/",
  });
}

export function clearAdminSessionCookie(res: NextResponse) {
  res.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
}

export type AdminUserPublic = {
  _id: string;
  email: string;
  name: string;
  role: AdminRole;
  assignedClinics: string[];
};

export const getAdminUser = cache(async (): Promise<AdminUserPublic | null> => {
  const session = await getAdminSession();
  if (!session?.adminUserId) return null;
  try {
    await connectDB();
    const user = await (AdminUser as any).findById(session.adminUserId)
      .select("email name role assignedClinics isActive")
      .lean();
    if (!user || !user.isActive) return null;
    return {
      _id: String(user._id),
      email: user.email,
      name: user.name || "Admin",
      role: user.role as AdminRole,
      assignedClinics: user.assignedClinics ?? ["all"],
    };
  } catch {
    return null;
  }
});

export async function requirePermission(
  module: AdminModule,
  minLevel: AccessLevel = "view"
): Promise<NextResponse | null> {
  const user = await getAdminUser();
  if (!user) return unauthorized();
  if (!canAccess(user.role, module, minLevel)) {
    return NextResponse.json(
      { error: "Forbidden: insufficient permissions" },
      { status: 403 }
    );
  }
  return null;
}
