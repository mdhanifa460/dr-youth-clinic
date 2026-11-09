import { google } from 'googleapis';
import { connectDB } from '@/app/lib/mongodb';
import { GoogleOAuthCredential } from '@/app/models/GoogleOAuthCredential';
import { encryptCredential, decryptCredential, last4 } from '@/app/lib/crm/encryption';
import { redactCredentialForClient, type StoredCredentialSummary } from '@/app/lib/google/siteVerificationOAuth';

// Delegated-user OAuth for the Google Business Profile APIs (reading the
// clinic's own reviews for every branch). Same pattern as
// siteVerificationOAuth.ts — the refresh token is stored encrypted in the
// GoogleOAuthCredential singleton under its own provider key, access
// tokens are never stored, and nothing token-shaped is ever returned to
// the browser (redactCredentialForClient). The signed CSRF state helpers
// are reused from that file as-is.

export const BUSINESS_PROFILE_PROVIDER = 'business_profile';
export const BUSINESS_PROFILE_SCOPE = 'https://www.googleapis.com/auth/business.manage';
export const BUSINESS_OAUTH_STATE_COOKIE = 'gbp_oauth_state';
export const BUSINESS_CALLBACK_PATH = '/api/admin/google-business/callback';

export interface BusinessOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

// Same OAuth client (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) as Site
// Verification; only the redirect address differs. GOOGLE_BUSINESS_REDIRECT_URI
// overrides it, otherwise it is built from NEXT_PUBLIC_SITE_URL.
export function getBusinessOAuthConfig(env: Record<string, string | undefined> = process.env): BusinessOAuthConfig {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  const site = (env.NEXT_PUBLIC_SITE_URL || '').replace(/\/+$/, '');
  const redirectUri = env.GOOGLE_BUSINESS_REDIRECT_URI || (site ? `${site}${BUSINESS_CALLBACK_PATH}` : '');
  const missing = [
    !clientId && 'GOOGLE_CLIENT_ID',
    !clientSecret && 'GOOGLE_CLIENT_SECRET',
    !redirectUri && 'GOOGLE_BUSINESS_REDIRECT_URI (or NEXT_PUBLIC_SITE_URL)',
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new Error(`Google Business Profile sign-in is not set up yet. Missing: ${missing.join(', ')}.`);
  }
  return { clientId: clientId!, clientSecret: clientSecret!, redirectUri };
}

export function isBusinessOAuthConfigured(): boolean {
  try { getBusinessOAuthConfig(); return true; } catch { return false; }
}

export function getBusinessOAuthClient() {
  const c = getBusinessOAuthConfig();
  return new google.auth.OAuth2(c.clientId, c.clientSecret, c.redirectUri);
}

export function buildBusinessAuthorizationUrl(client: InstanceType<typeof google.auth.OAuth2>, state: string): string {
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: [BUSINESS_PROFILE_SCOPE],
    state,
    prompt: 'consent', // always return a refresh token, also on reconnect
    include_granted_scopes: false,
  });
}

export async function completeBusinessAuthorization(
  code: string,
  admin: { _id: string; email: string }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const client = getBusinessOAuthClient();
  let tokens: { refresh_token?: string | null; scope?: string | null };
  try {
    tokens = (await client.getToken(code)).tokens;
  } catch (err) {
    console.error('[google-business] token exchange failed:', err instanceof Error ? err.message : err);
    return { ok: false, message: 'Google rejected the sign-in. Please try connecting again.' };
  }
  if (!tokens.refresh_token) {
    return {
      ok: false,
      message: 'Google did not return a long-term access key. Remove this app at myaccount.google.com/permissions and connect again.',
    };
  }
  if (tokens.scope && !tokens.scope.split(' ').includes(BUSINESS_PROFILE_SCOPE)) {
    return { ok: false, message: 'Permission to manage the Business Profile was not granted. Please connect again and allow it.' };
  }

  await connectDB();
  await (GoogleOAuthCredential as any).findOneAndUpdate(
    { provider: BUSINESS_PROFILE_PROVIDER },
    {
      $set: {
        encryptedRefreshToken: encryptCredential(tokens.refresh_token),
        refreshTokenLast4: last4(tokens.refresh_token),
        scope: tokens.scope || BUSINESS_PROFILE_SCOPE,
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

export async function getBusinessCredentialSummary(): Promise<StoredCredentialSummary> {
  await connectDB();
  const doc = await (GoogleOAuthCredential as any).findOne({ provider: BUSINESS_PROFILE_PROVIDER }).lean();
  return redactCredentialForClient(doc);
}

// OAuth client with the stored refresh token set, or null when not connected.
export async function getAuthenticatedBusinessClient() {
  await connectDB();
  const doc = await (GoogleOAuthCredential as any).findOne({ provider: BUSINESS_PROFILE_PROVIDER }).lean();
  if (!doc?.encryptedRefreshToken || doc.revokedAt) return null;
  const client = getBusinessOAuthClient();
  client.setCredentials({ refresh_token: decryptCredential(doc.encryptedRefreshToken) });
  return client;
}

// Revokes the grant at Google (best effort) and forgets it here.
export async function disconnectBusinessProfile(): Promise<void> {
  try {
    const client = await getAuthenticatedBusinessClient();
    const token = client?.credentials.refresh_token;
    if (client && token) await client.revokeToken(token).catch(() => {});
  } catch { /* not configured: nothing to revoke */ }
  await (GoogleOAuthCredential as any).updateOne(
    { provider: BUSINESS_PROFILE_PROVIDER },
    { $set: { encryptedRefreshToken: null, refreshTokenLast4: '', revokedAt: new Date() } }
  );
}
