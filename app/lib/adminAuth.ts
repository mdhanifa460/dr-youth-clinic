import { createHash, createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { connectDB } from "./mongodb";
import AdminSession from "../models/AdminSession";
import AdminUser from "../models/AdminUser";

export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8;

const PASSWORD_ITERATIONS = 210_000;
const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  process.env.ADMIN_PASSWORD ||
  "change-this-admin-session-secret";

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
  const candidate = pbkdf2Sync(
    password,
    user.passwordSalt,
    user.passwordIterations,
    64,
    "sha512"
  );
  const stored = Buffer.from(user.passwordHash, "hex");

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

  const email = (process.env.ADMIN_EMAIL || "admin@dryouth.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "admin123";
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

  user.lastLoginAt = new Date();
  await user.save();

  return {
    cookieValue: createSessionCookieValue(sessionId),
    maxAge,
    user: {
      email: user.email,
      name: user.name || "Clinic Admin",
      role: user.role || "admin",
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
  maxAge: number
) {
  res.cookies.set(ADMIN_SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge,
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
