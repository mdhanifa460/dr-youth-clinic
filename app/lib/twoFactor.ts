import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

// Time-based one-time codes (RFC 6238), the standard authenticator apps use.
// Written against Node's crypto rather than a package because this is only a
// few lines and login shouldn't gain a dependency.
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
// Accepts one step either side, so a phone clock slightly off still works.
const WINDOW = 1;

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of Array.from(buf)) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
    value &= (1 << bits) - 1;
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string): Buffer {
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of Array.from(text.toUpperCase().replace(/[^A-Z2-7]/g, ""))) {
    value = (value << 5) | BASE32.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
    value &= (1 << bits) - 1;
  }
  return Buffer.from(out);
}

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function totpForStep(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = digest[digest.length - 1] & 15;
  const number = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(number % 1_000_000).padStart(6, "0");
}

// Returns the matching step, which the caller stores so a code can't be used
// twice, or null if the code is wrong.
export function matchTotpStep(secret: string, code: string, nowMs = Date.now()): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const current = Math.floor(nowMs / 1000 / STEP_SECONDS);
  const given = Buffer.from(code);
  for (let step = current - WINDOW; step <= current + WINDOW; step++) {
    if (timingSafeEqual(Buffer.from(totpForStep(secret, step)), given)) return step;
  }
  return null;
}

export function totpUri(secret: string, email: string): string {
  const issuer = "DR Youth Clinic Admin";
  return `otpauth://totp/${encodeURIComponent(`${issuer}:${email}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${STEP_SECONDS}`;
}

export function normalizeBackupCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z2-7]/g, "");
}

export function hashBackupCode(code: string): string {
  return createHash("sha256").update(normalizeBackupCode(code)).digest("hex");
}

export function generateBackupCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const code = base32Encode(randomBytes(7)).slice(0, 10);
    return `${code.slice(0, 5)}-${code.slice(5)}`;
  });
}

function keyFrom(passphrase: string): Buffer {
  return createHash("sha256").update(`admin-two-factor:${passphrase}`).digest();
}

export function encryptTotpSecret(secret: string, passphrase: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFrom(passphrase), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((b) => b.toString("base64")).join(".");
}

// Null rather than throwing: if ADMIN_SESSION_SECRET is ever rotated the old
// value can't be read, and that must fail as "wrong code" so the person can
// still get in with a backup code, whose hash doesn't depend on that secret.
export function decryptTotpSecret(stored: string, passphrase: string): string | null {
  try {
    const [iv, tag, encrypted] = stored.split(".").map((part) => Buffer.from(part, "base64"));
    const decipher = createDecipheriv("aes-256-gcm", keyFrom(passphrase), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
