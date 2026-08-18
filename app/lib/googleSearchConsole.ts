// Server-side, read-only Google Search Console adapter — the boundary
// that owns the raw GSC response shape, same role as googleAnalytics.ts
// plays for GA4. Deliberately a SEPARATE data source, never assumed to
// be reachable through GA4 (GSC has no relationship to GA4 at all — two
// different Google products, two different properties, two different
// APIs) — this is what makes old-domain organic search data available
// at all, since GA4's own tag never runs on the old domain post-redirect
// (see the Domain Migration audit's Section 2).
//
// Shares GOOGLE_SERVICE_ACCOUNT_JSON with googleAnalytics.ts. The GSC
// property for the OLD domain must exist and have this same service
// account added under Settings → Users and permissions in Search Console
// itself — a manual step, not something this adapter can do.
//
// Auth source, in order: Workload Identity Federation (via Vercel OIDC,
// see app/lib/google/workloadIdentityAuth.ts) when configured, else the
// original GOOGLE_SERVICE_ACCOUNT_JSON private key — unchanged fallback,
// since WIF's Google Cloud pool/provider and Vercel OIDC toggle are both
// external setup steps (see the approved migration plan) not yet done for
// this deployment. Nothing below this comment changes behavior until
// GOOGLE_WIF_AUDIENCE/GOOGLE_WIF_SERVICE_ACCOUNT_EMAIL are actually set.
const SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly'];

import { google } from 'googleapis';
import { getWorkloadIdentityAuthClient, isWifConfigured } from '@/app/lib/google/workloadIdentityAuth';

let cachedAuth: InstanceType<typeof google.auth.JWT> | ReturnType<typeof getWorkloadIdentityAuthClient> | undefined;

function getServiceAccountCredentials(): { client_email: string; private_key: string } | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.client_email || !parsed.private_key) return null;
    return { client_email: parsed.client_email, private_key: parsed.private_key };
  } catch {
    return null;
  }
}

export function isGscConfigured(): boolean {
  return isWifConfigured() || !!getServiceAccountCredentials();
}

function getAuth() {
  if (cachedAuth !== undefined) return cachedAuth;

  const wifClient = getWorkloadIdentityAuthClient(SCOPES);
  if (wifClient) {
    cachedAuth = wifClient;
    return cachedAuth;
  }

  const creds = getServiceAccountCredentials();
  if (!creds) {
    cachedAuth = null;
    return null;
  }
  cachedAuth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: SCOPES,
  });
  return cachedAuth;
}

export interface GscPageRow {
  page: string; // full URL as GSC returns it
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscQueryRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscSiteOverview {
  configured: boolean;
  siteUrl: string;
  totals: { clicks: number; impressions: number; ctr: number; position: number };
  topPages: GscPageRow[];
  topQueries: GscQueryRow[];
}

function emptyOverview(siteUrl: string): GscSiteOverview {
  return { configured: false, siteUrl, totals: { clicks: 0, impressions: 0, ctr: 0, position: 0 }, topPages: [], topQueries: [] };
}

// One combined read per dashboard refresh, same caching contract as
// getGa4Overview — callers cache this at the route level, this file
// doesn't cache internally.
export async function getGscOverview(siteUrl: string, days: number): Promise<GscSiteOverview> {
  if (!siteUrl) return emptyOverview(siteUrl);
  const auth = getAuth();
  if (!auth) return emptyOverview(siteUrl);

  const searchconsole = google.searchconsole({ version: 'v1', auth: auth as any });
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  try {
    const [pageRes, queryRes] = await Promise.all([
      searchconsole.searchanalytics.query({
        siteUrl,
        requestBody: { startDate, endDate, dimensions: ['page'], rowLimit: 25 },
      }),
      searchconsole.searchanalytics.query({
        siteUrl,
        requestBody: { startDate, endDate, dimensions: ['query'], rowLimit: 25 },
      }),
    ]);

    const topPages: GscPageRow[] = (pageRes.data.rows || []).map((r) => ({
      page: r.keys?.[0] || '',
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: r.ctr || 0,
      position: r.position || 0,
    })).sort((a, b) => b.impressions - a.impressions);

    const topQueries: GscQueryRow[] = (queryRes.data.rows || []).map((r) => ({
      query: r.keys?.[0] || '',
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: r.ctr || 0,
      position: r.position || 0,
    })).sort((a, b) => b.impressions - a.impressions);

    const totals = topPages.reduce(
      (acc, p) => ({ clicks: acc.clicks + p.clicks, impressions: acc.impressions + p.impressions, ctr: 0, position: 0 }),
      { clicks: 0, impressions: 0, ctr: 0, position: 0 }
    );
    const avgPosition = topPages.length
      ? topPages.reduce((s, p) => s + p.position * p.impressions, 0) / Math.max(totals.impressions, 1)
      : 0;
    totals.ctr = totals.impressions ? totals.clicks / totals.impressions : 0;
    totals.position = avgPosition;

    return { configured: true, siteUrl, totals, topPages, topQueries };
  } catch (e) {
    console.error('[googleSearchConsole] Search Analytics query failed', e);
    return emptyOverview(siteUrl);
  }
}

// A focused, parameterized page-list query — additive, not a replacement
// for getGscOverview() above (which stays exactly as-is for the dashboard's
// existing 25-row/N-day contract). Used by the Domain Migration URL-
// redirect-mapping feature (app/lib/domainMigration/) to pull a much
// broader page list (higher row limit, longer lookback) as a second
// old-URL-inventory source alongside a sitemap import — GSC's own crawl
// history surfaces pages that got real traffic even if a stale/incomplete
// old sitemap missed them.
export async function getGscTopPages(siteUrl: string, days: number, rowLimit: number): Promise<GscPageRow[]> {
  if (!siteUrl) return [];
  const auth = getAuth();
  if (!auth) return [];

  const searchconsole = google.searchconsole({ version: 'v1', auth: auth as any });
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  try {
    const res = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: { startDate, endDate, dimensions: ['page'], rowLimit },
    });
    return (res.data.rows || []).map((r) => ({
      page: r.keys?.[0] || '',
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: r.ctr || 0,
      position: r.position || 0,
    }));
  } catch (e) {
    console.error('[googleSearchConsole] getGscTopPages query failed', e);
    return [];
  }
}

// Checks whether a specific old-domain URL currently resolves (via the
// live redirect chain) to a real page on the new domain — the basis for
// the Domain Migration panel's "flagged" old-URL rows (a 404 or a
// catch-all homepage redirect instead of the actual matching page).
// Deliberately a plain HEAD request, not a GSC API call — GSC doesn't
// know or care where a URL redirects to, only whether Google has crawled
// it; this is the live, current truth instead.
export async function checkRedirectResolves(oldUrl: string): Promise<{ ok: boolean; status: number; finalUrl?: string }> {
  try {
    const res = await fetch(oldUrl, { method: 'HEAD', redirect: 'follow' });
    return { ok: res.ok, status: res.status, finalUrl: res.url };
  } catch {
    return { ok: false, status: 0 };
  }
}
