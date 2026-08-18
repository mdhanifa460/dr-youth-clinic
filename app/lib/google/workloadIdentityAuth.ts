// Optional Workload Identity Federation (WIF) auth path for the two
// server-side Google API adapters (googleAnalytics.ts, googleSearchConsole.ts)
// — an alternative to GOOGLE_SERVICE_ACCOUNT_JSON's static private key,
// exchanging Vercel's own short-lived OIDC token for a temporary GCP
// access token via a Workload Identity Pool, so no long-lived key needs to
// exist anywhere. See the approved migration plan (Phase 1: Google Cloud
// pool/provider setup, Phase 2: enable OIDC Federation on the Vercel
// project) — neither of those is a code change, both must be done outside
// this repo before this path can actually authenticate successfully.
//
// Purely additive and inert until configured: getWorkloadIdentityAuthClient()
// returns null whenever GOOGLE_WIF_AUDIENCE/GOOGLE_WIF_SERVICE_ACCOUNT_EMAIL
// aren't set, and both call sites fall back to the existing
// GOOGLE_SERVICE_ACCOUNT_JSON path exactly as before — zero behavior change
// for this deployment until Phase 1-2 are live and these two env vars are
// actually set.
import { IdentityPoolClient } from 'google-auth-library';

interface WifConfig {
  audience: string;
  serviceAccountEmail: string;
}

function getWifConfig(): WifConfig | null {
  const audience = process.env.GOOGLE_WIF_AUDIENCE;
  const serviceAccountEmail = process.env.GOOGLE_WIF_SERVICE_ACCOUNT_EMAIL;
  if (!audience || !serviceAccountEmail) return null;
  return { audience, serviceAccountEmail };
}

export function isWifConfigured(): boolean {
  return !!getWifConfig();
}

// One client per (scopes) combination — GA4 and Search Console use
// different OAuth scopes, so each adapter gets its own cached instance
// rather than sharing one keyed only by "is WIF configured at all".
const cachedClients = new Map<string, IdentityPoolClient>();

export function getWorkloadIdentityAuthClient(scopes: string[]): IdentityPoolClient | null {
  const config = getWifConfig();
  if (!config) return null;

  const cacheKey = scopes.slice().sort().join(',');
  const cached = cachedClients.get(cacheKey);
  if (cached) return cached;

  const client = new IdentityPoolClient({
    audience: config.audience,
    subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${config.serviceAccountEmail}:generateAccessToken`,
    scopes,
    subject_token_supplier: {
      // Not cached here by design — IdentityPoolClient doesn't cache the
      // subject token itself (per its own doc comment), only the GCP
      // access token it exchanges for. Re-reading the env var per call
      // means we always hand over whatever Vercel currently has live,
      // which auto-rotates on its own schedule.
      async getSubjectToken() {
        const token = process.env.VERCEL_OIDC_TOKEN;
        if (!token) {
          throw new Error(
            'VERCEL_OIDC_TOKEN is not set — Vercel OIDC Federation must be enabled for this project/environment before Workload Identity Federation can authenticate.'
          );
        }
        return token;
      },
    },
  });

  cachedClients.set(cacheKey, client);
  return client;
}
