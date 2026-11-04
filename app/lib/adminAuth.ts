import { createHash, createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectDB } from "./mongodb";
import AdminSession from "../models/AdminSession";
import AdminUser from "../models/AdminUser";
import { recordAdminActivity } from "./adminActivity";
import { decryptTotpSecret, encryptTotpSecret, hashBackupCode, matchTotpStep, normalizeBackupCode } from "./twoFactor";
import { type AdminRole, type AdminModule, type AccessLevel, type PermissionOverrides, canAccess } from "./permissions";

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
// session cookies with it is equivalent to not signing them at all. This is
// logged at import time regardless of environment so it's visible in any
// deploy's function logs, but the actual enforcement — refusing to issue a
// new session — happens in loginAdmin() below, scoped to production only.
// That's deliberately narrower than crashing the whole process at startup:
// it blocks the one vulnerable action (creating a new, forgeable-if-anyone-
// knew-the-secret session) while leaving the public site and any already-
// running sessions unaffected, so a misconfigured deploy fails safely on
// the admin login screen instead of taking the whole site down.
const USING_FALLBACK_SESSION_SECRET = SESSION_SECRET === FALLBACK_SESSION_SECRET;
if (USING_FALLBACK_SESSION_SECRET) {
  console.error(
    "[SECURITY] No ADMIN_SESSION_SECRET, NEXTAUTH_SECRET, or ADMIN_PASSWORD is set — admin session cookies would be signed with a hardcoded, publicly-known secret. Set ADMIN_SESSION_SECRET immediately. New admin logins are blocked in production until this is fixed."
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
  totpEnabled?: boolean;
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
  if (USING_FALLBACK_SESSION_SECRET && process.env.NODE_ENV === "production") {
    throw new Error(
      "Refusing to create an admin session in production while signed with the hardcoded fallback secret — set ADMIN_SESSION_SECRET."
    );
  }

  await connectDB();
  await ensureBootstrapAdmin();

  const user = await AdminUserModel.findOne({
    email: email.toLowerCase().trim(),
    isActive: true,
  });

  if (!user || !verifyPassword(password, user)) {
    return null;
  }

  // The password alone must not produce a session for these accounts, so
  // nothing past this point runs until the code is verified.
  if (user.totpEnabled) {
    return {
      twoFactorRequired: true as const,
      challenge: createTwoFactorChallenge(String(user._id), !!remember),
    };
  }

  return createAdminSession(user, { remember, userAgent, ipAddress });
}

async function createAdminSession(
  user: AdminUserDocument,
  { remember, userAgent, ipAddress }: { remember?: boolean; userAgent?: string | null; ipAddress?: string | null }
) {
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

// Proves the password step passed, between the two login requests. Signed and
// short-lived; it grants nothing except the right to submit a code.
const TWO_FACTOR_CHALLENGE_MS = 5 * 60 * 1000;

function signChallenge(payload: string) {
  return createHmac("sha256", SESSION_SECRET).update(`two-factor:${payload}`).digest("hex");
}

function createTwoFactorChallenge(userId: string, remember: boolean) {
  const payload = `${userId}.${Date.now() + TWO_FACTOR_CHALLENGE_MS}.${remember ? 1 : 0}`;
  return `${payload}.${signChallenge(payload)}`;
}

export function parseTwoFactorChallenge(challenge: unknown) {
  if (typeof challenge !== "string") return null;
  const parts = challenge.split(".");
  if (parts.length !== 4) return null;
  const [userId, expires, remember, signature] = parts;
  const given = Buffer.from(signature, "hex");
  const expected = Buffer.from(signChallenge(`${userId}.${expires}.${remember}`), "hex");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  if (Date.now() > Number(expires)) return null;
  return { userId, remember: remember === "1" };
}

export function encryptTwoFactorSecret(secret: string) {
  return encryptTotpSecret(secret, SESSION_SECRET);
}

export function decryptTwoFactorSecret(stored: string) {
  return decryptTotpSecret(stored, SESSION_SECRET);
}

// Checks an authenticator code or backup code and uses it up. Both updates are
// conditional at the database, so two simultaneous requests can't both succeed
// with the same code.
export async function consumeTwoFactorCode(userId: string, rawCode: unknown): Promise<boolean> {
  if (typeof rawCode !== "string") return false;
  const code = rawCode.trim();
  await connectDB();
  const model = AdminUser as any;

  if (/^\d{6}$/.test(code)) {
    const user = await model.findById(userId).select("+totpSecret").lean();
    const secret = user?.totpSecret ? decryptTwoFactorSecret(user.totpSecret) : null;
    const step = secret ? matchTotpStep(secret, code) : null;
    if (step === null) return false;
    const used = await model.findOneAndUpdate(
      { _id: userId, $or: [{ totpLastStep: { $lt: step } }, { totpLastStep: { $exists: false } }] },
      { $set: { totpLastStep: step } }
    );
    return !!used;
  }

  if (normalizeBackupCode(code).length !== 10) return false;
  const used = await model.findOneAndUpdate(
    { _id: userId, totpBackupCodes: hashBackupCode(code) },
    { $pull: { totpBackupCodes: hashBackupCode(code) } }
  );
  return !!used;
}

export async function completeTwoFactorLogin({
  userId,
  remember,
  userAgent,
  ipAddress,
}: {
  userId: string;
  remember: boolean;
  userAgent?: string | null;
  ipAddress?: string | null;
}) {
  await connectDB();
  const user = await AdminUserModel.findOne({ _id: userId, isActive: true, totpEnabled: true });
  return user ? createAdminSession(user, { remember, userAgent, ipAddress }) : null;
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
  permissionOverrides?: PermissionOverrides;
};

export const getAdminUser = cache(async (): Promise<AdminUserPublic | null> => {
  const session = await getAdminSession();
  if (!session?.adminUserId) return null;
  try {
    await connectDB();
    const user = await (AdminUser as any).findById(session.adminUserId)
      .select("email name role assignedClinics isActive permissionOverrides")
      .lean();
    if (!user || !user.isActive) return null;
    return {
      _id: String(user._id),
      email: user.email,
      name: user.name || "Admin",
      role: user.role as AdminRole,
      assignedClinics: user.assignedClinics ?? ["all"],
      permissionOverrides: user.permissionOverrides ?? undefined,
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
  const allowed = canAccess(user.role, module, minLevel, user.permissionOverrides);
  // Nearly every admin route passes through here, so this one call covers them.
  await recordAdminActivity({ actor: user, module, outcome: allowed ? "allowed" : "denied" });
  if (!allowed) {
    return NextResponse.json(
      { success: false, message: "You don't have permission to do this. Contact your admin if you need access." },
      { status: 403 }
    );
  }
  return null;
}
