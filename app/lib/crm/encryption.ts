import crypto from "crypto";

// AES-256-GCM at-rest encryption for CRM connector credentials — the one
// genuinely new piece of infrastructure the Enterprise Connector Framework
// requires, since credentials now live in the database (admin-editable)
// instead of only env vars. CONNECTOR_ENCRYPTION_KEY must be a 32-byte key,
// base64 or hex encoded, generated once and never committed — same handling
// as ADMIN_SESSION_SECRET.
//
// Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

function getKey(): Buffer {
  const raw = process.env.CONNECTOR_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "CONNECTOR_ENCRYPTION_KEY is not set. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\" and add it to your env."
    );
  }
  const key = Buffer.from(raw, raw.length === 64 ? "hex" : "base64");
  if (key.length !== 32) {
    throw new Error("CONNECTOR_ENCRYPTION_KEY must decode to exactly 32 bytes (AES-256).");
  }
  return key;
}

export interface EncryptedPayload {
  encrypted: string;
  iv: string;
  authTag: string;
}

export function encryptCredential(plaintext: string): EncryptedPayload {
  const key = getKey();
  const iv = crypto.randomBytes(12); // recommended IV length for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    encrypted: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptCredential(payload: EncryptedPayload): string {
  const key = getKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.encrypted, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

// Last 4 characters of a secret, safe to store in plaintext for display
// ("••••••••4a2f") — never enough to reconstruct the credential.
export function last4(secret: string): string {
  return secret.slice(-4);
}
