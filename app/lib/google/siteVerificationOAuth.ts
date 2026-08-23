import crypto from 'crypto';
import { google } from 'googleapis';
import { connectDB } from '@/app/lib/mongodb';
import { GoogleOAuthCredential } from '@/app/models/GoogleOAuthCredential';
import { encryptCredential, decryptCredential, last4, type EncryptedPayload } from '@/app/lib/crm/encryption';

// Delegated-user OAuth 2.0 for the Google Site Verification API — separate
// from every other Google integration in this codebase on purpose. GA4/
// Search Console reporting (app/lib/googleAnalytics.ts, googleSearchConsole.ts)
// and the existing meta-tag verification (app/lib/searchConsole.ts) are
// UNCHANGED and untouched by this file. See app/models/GoogleOAuthCredential.ts
// for why this needed its own small model rather than reusing
// ConnectorCredential or GOOGLE_SERVICE_ACCOUNT_JSON.

export const SITE_VERIFICATION_PROVIDER = 'site_verification';

// Minimum scope for this API — deliberately NOT the broader
// siteverification scope's sibling (there's only one meaningful scope for
// this API) and deliberately none of Gmail/BigQuery/Cloud
// Platform/Analytics/Drive/userinfo, all explicitly out of scope.
export const SITE_VERIFICATION_SCOPE = 'https://www.googleapis.com/auth/siteverification';

const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes — generous enough for a real consent screen, short enough to bound replay risk
export const OAUTH_STATE_COOKIE = 'gsv_oauth_state';

// ── Env-driven client config — never hardcoded, per the explicit instruction ──

export interface OAuthEnvConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

// Thrown with a clear, specific message (never silently falls back to a
// guessed value) — surfaced as a 500 with a safe message by the routes.
export function getOAuthEnvConfig(): OAuthEnvConfig {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const missing = [
    !clientId && 'GOOGLE_CLIENT_ID',
    !clientSecret && 'GOOGLE_CLIENT_SECRET',
    !redirectUri && 'GOOGLE_REDIRECT_URI',
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new Error(`Google Site Verification OAuth is not configured — missing env var(s): ${missing.join(', ')}`);
  }
  return { clientId: clientId!, clientSecret: clientSecret!, redirectUri: redirectUri! };
}

// Pure factory — no env/network access, so tests can construct a real
// OAuth2Client with fake values and exercise the actual googleapis code
// path (generateAuthUrl, getToken) instead of a hand-rolled duplicate.
export function createOAuth2Client(config: OAuthEnvConfig) {
  return new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
}

export function getOAuth2ClientFromEnv() {
  return createOAuth2Client(getOAuthEnvConfig());
}

// ── CSRF state — self-contained HMAC, no DB round-trip ──────────────────
//
// Same shape/primitives as app/lib/adminAuth.ts's session-cookie signing
// (createHmac + timingSafeEqual), not imported from there since session
// cookies are a distinct concern — this is a short-lived, single-purpose
// value. Double-submit: the signed value is sent both as the `state` query
// param (round-tripped through Google) AND as an httpOnly cookie set at
// /authorize time; the callback requires both to match AND the signature
// to verify AND the timestamp to be within STATE_MAX_AGE_MS.

function stateSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET (or ADMIN_PASSWORD) must be set to sign OAuth state values.');
  }
  return secret;
}

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function encodePart(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64url');
}

function decodePart(s: string): string {
  return Buffer.from(s, 'base64url').toString('utf8');
}

// nonce.issuedAtMs.adminId.adminEmail.signature — the admin's identity is
// embedded IN the signed state itself, not read back from the session
// cookie at callback time. This is deliberate, not an extra feature: the
// callback is only ever reached via Google's own redirect, which is a
// cross-site top-level navigation — the admin_session cookie is
// SameSite=Strict (see adminAuth.ts) and browsers withhold Strict cookies
// on exactly that kind of request, so requirePermission() at the callback
// can never see the admin as logged in, no matter what. The state's HMAC
// signature (checked against the double-submit httpOnly cookie set at
// /authorize — see OAUTH_STATE_COOKIE) is what actually proves this
// browser session was a genuinely authenticated admin moments ago; reusing
// that same proof to identify WHO is the natural fix, not a new admin
// auth path bolted onto the callback route.
export function signState(nonce: string, issuedAtMs: number, adminId: string, adminEmail: string, secret: string): string {
  const payload = `${nonce}.${issuedAtMs}.${encodePart(adminId)}.${encodePart(adminEmail)}`;
  return `${payload}.${signPayload(payload, secret)}`;
}

export interface VerifyStateResult {
  valid: boolean;
  reason?: 'malformed' | 'bad_signature' | 'expired';
  nonce?: string;
  adminId?: string;
  adminEmail?: string;
}

export function verifyState(raw: string, secret: string, nowMs: number, maxAgeMs = STATE_MAX_AGE_MS): VerifyStateResult {
  const parts = (raw || '').split('.');
  if (parts.length !== 5) return { valid: false, reason: 'malformed' };
  const [nonce, issuedAtStr, adminIdEnc, adminEmailEnc, signature] = parts;
  const issuedAtMs = Number(issuedAtStr);
  if (!nonce || !issuedAtStr || !signature || !Number.isFinite(issuedAtMs)) {
    return { valid: false, reason: 'malformed' };
  }
  const payload = `${nonce}.${issuedAtStr}.${adminIdEnc}.${adminEmailEnc}`;
  const expected = signPayload(payload, secret);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    return { valid: false, reason: 'bad_signature' };
  }
  if (nowMs - issuedAtMs > maxAgeMs || nowMs < issuedAtMs) {
    return { valid: false, reason: 'expired' };
  }
  let adminId = '';
  let adminEmail = '';
  try {
    adminId = decodePart(adminIdEnc);
    adminEmail = decodePart(adminEmailEnc);
  } catch {
    return { valid: false, reason: 'malformed' };
  }
  return { valid: true, nonce, adminId, adminEmail };
}

// Convenience wrapper used by the /authorize route — reads the real
// secret/clock, generates a fresh nonce, embeds the admin who is
// authorizing (read there via the normal, same-site — and therefore
// working — session cookie check).
export function generateSignedState(admin: { _id: string; email: string }): string {
  const nonce = crypto.randomBytes(24).toString('hex');
  return signState(nonce, Date.now(), admin._id, admin.email, stateSecret());
}

export function verifySignedState(raw: string): VerifyStateResult {
  return verifyState(raw, stateSecret(), Date.now());
}

// ── Authorization URL ────────────────────────────────────────────────────
//
// Thin wrapper around the real googleapis method (not a reimplementation)
// so the unit tests exercise the actual URL-building code path.
export function buildAuthorizationUrl(oauth2Client: InstanceType<typeof google.auth.OAuth2>, state: string): string {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // required to receive a refresh_token at all
    scope: [SITE_VERIFICATION_SCOPE],
    state,
    // Forces the consent screen (and a fresh refresh_token) even on a
    // re-authorization — without this, Google only returns a refresh_token
    // on a user's very first consent, which would silently break
    // reconnecting after a revoke.
    prompt: 'consent',
    include_granted_scopes: false,
  });
}

// ── Token exchange & storage ─────────────────────────────────────────────

export interface StoredCredentialSummary {
  connected: boolean;
  scope: string;
  last4: string;
  connectedAt: string | null;
  connectedByEmail: string;
}

// The ONLY function allowed to shape what a route hands back to the
// browser — deliberately narrow, so "never return tokens" is enforced by
// this function's own return type, not by remembering to omit a field at
// each call site. Unit-tested directly (see the test file) to assert no
// token-shaped key can ever appear in its output.
export function redactCredentialForClient(doc: {
  encryptedRefreshToken: unknown;
  scope?: string;
  refreshTokenLast4?: string;
  connectedAt?: Date | string | null;
  connectedByEmail?: string;
  revokedAt?: Date | string | null;
} | null): StoredCredentialSummary {
  const connected = !!doc?.encryptedRefreshToken && !doc?.revokedAt;
  return {
    connected,
    scope: connected ? doc?.scope || '' : '',
    last4: connected ? doc?.refreshTokenLast4 || '' : '',
    connectedAt: connected && doc?.connectedAt ? new Date(doc.connectedAt).toISOString() : null,
    connectedByEmail: connected ? doc?.connectedByEmail || '' : '',
  };
}

// Exchanges the authorization code, encrypts the refresh token, and
// upserts the singleton — never returns the raw tokens to its caller.
export async function completeAuthorization(
  code: string,
  admin: { _id: string; email: string }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const oauth2Client = getOAuth2ClientFromEnv();

  let tokens: { refresh_token?: string | null; scope?: string | null };
  try {
    const res = await oauth2Client.getToken(code);
    tokens = res.tokens;
  } catch (err) {
    // Never log the code or any token — only the error's own message,
    // which googleapis keeps free of secrets (it describes the failure
    // reason, e.g. "invalid_grant", not the exchanged values).
    console.error('[google-site-verification] token exchange failed:', err instanceof Error ? err.message : err);
    return { ok: false, message: 'Google rejected the authorization code. Please try connecting again.' };
  }

  if (!tokens.refresh_token) {
    // Happens if consent was already granted AND prompt=consent somehow
    // didn't force a new one (or Google changes behavior) — surfaced
    // clearly rather than silently storing nothing.
    return {
      ok: false,
      message: 'Google did not return a refresh token. Revoke this app’s access at myaccount.google.com/permissions and try connecting again.',
    };
  }

  await connectDB();
  const encrypted: EncryptedPayload = encryptCredential(tokens.refresh_token);
  await (GoogleOAuthCredential as any).findOneAndUpdate(
    { provider: SITE_VERIFICATION_PROVIDER },
    {
      $set: {
        encryptedRefreshToken: encrypted,
        refreshTokenLast4: last4(tokens.refresh_token),
        scope: tokens.scope || SITE_VERIFICATION_SCOPE,
        connectedByAdminId: admin._id,
        connectedByEmail: admin.email,
        connectedAt: new Date(),
        revokedAt: null,
      },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  return { ok: true };
}

export async function getStoredCredentialSummary(): Promise<StoredCredentialSummary> {
  await connectDB();
  const doc = await (GoogleOAuthCredential as any).findOne({ provider: SITE_VERIFICATION_PROVIDER }).lean();
  return redactCredentialForClient(doc);
}

// Returns an OAuth2Client with credentials set from the stored refresh
// token, ready for a future caller (e.g. a googleSiteVerification.ts
// adapter mirroring googleSearchConsole.ts) to make actual Site
// Verification API calls. googleapis' own client handles access-token
// refresh transparently from here — nothing further to implement for
// that. Returns null when nothing is connected yet; throws only on a
// genuine env-misconfiguration, same as getOAuth2ClientFromEnv().
export async function getAuthenticatedSiteVerificationClient() {
  await connectDB();
  const doc = await (GoogleOAuthCredential as any).findOne({ provider: SITE_VERIFICATION_PROVIDER }).lean();
  if (!doc?.encryptedRefreshToken || doc.revokedAt) return null;

  const refreshToken = decryptCredential(doc.encryptedRefreshToken);
  const oauth2Client = getOAuth2ClientFromEnv();
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}
