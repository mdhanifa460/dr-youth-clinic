// Server-side, read-only GA4 Data API adapter — the boundary that owns
// the raw Google Analytics response shape, same architectural role as
// app/lib/crm/CRMConnector.ts for the CRM. Nothing outside this file
// should import '@google-analytics/data' directly.
//
// Credentials: a single GOOGLE_SERVICE_ACCOUNT_JSON env var (the full
// downloaded service-account key JSON, as one string) — shared with
// app/lib/googleSearchConsole.ts, since one service account granted
// Viewer on both the GA4 property and the GSC properties is the standard,
// lowest-setup-friction Google Cloud configuration for this use case.
// Every export degrades to `{ configured: false }` (never throws) when
// the credential is absent or the API call fails — matching this
// codebase's existing isConfiguredProviderReady()-style pattern for
// every other optional external integration.
//
// Auth source, in order: Workload Identity Federation (via Vercel OIDC,
// see app/lib/google/workloadIdentityAuth.ts) when configured, else the
// original GOOGLE_SERVICE_ACCOUNT_JSON private key — unchanged fallback,
// since WIF's Google Cloud pool/provider and Vercel OIDC toggle are both
// external setup steps (see the approved migration plan) not yet done for
// this deployment. Nothing below this comment changes behavior until
// GOOGLE_WIF_AUDIENCE/GOOGLE_WIF_SERVICE_ACCOUNT_EMAIL are actually set.
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { getWorkloadIdentityAuthClient, isWifConfigured } from '@/app/lib/google/workloadIdentityAuth';

const SCOPES = ['https://www.googleapis.com/auth/analytics.readonly'];

let cachedClient: BetaAnalyticsDataClient | null | undefined;

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

export function isGa4Configured(): boolean {
  return isWifConfigured() || !!getServiceAccountCredentials();
}

function getClient(): BetaAnalyticsDataClient | null {
  if (cachedClient !== undefined) return cachedClient;

  const wifClient = getWorkloadIdentityAuthClient(SCOPES);
  if (wifClient) {
    cachedClient = new BetaAnalyticsDataClient({ authClient: wifClient as any });
    return cachedClient;
  }

  const credentials = getServiceAccountCredentials();
  cachedClient = credentials ? new BetaAnalyticsDataClient({ credentials }) : null;
  return cachedClient;
}

export interface Ga4DayPoint {
  date: string; // YYYY-MM-DD
  users: number;
  sessions: number;
}

export interface Ga4ChannelRow {
  channel: string; // GA4's own sessionDefaultChannelGroup value, e.g. "Organic Search"
  sessions: number;
}

export interface Ga4Overview {
  configured: boolean;
  propertyId: string;
  byDay: Ga4DayPoint[];
  channelBreakdown: Ga4ChannelRow[];
  totals: { users: number; sessions: number };
  // "Migrated" = sessions carrying the migration_source custom event
  // parameter (see app/components/MigrationSessionTracker.tsx) — this
  // ONLY becomes non-empty once an admin has also mapped that dataLayer
  // event to a GA4 custom dimension in GTM (a one-time, no-code setup
  // step; the redirect tag + this adapter alone aren't sufficient).
  // `available: false` means "we couldn't determine this" (API error,
  // dimension not registered yet) — never fabricated as zero.
  migrated: { available: boolean; byDay: Ga4DayPoint[]; totals: { users: number; sessions: number } };
}

function emptyOverview(propertyId: string): Ga4Overview {
  return {
    configured: false,
    propertyId,
    byDay: [],
    channelBreakdown: [],
    totals: { users: 0, sessions: 0 },
    migrated: { available: false, byDay: [], totals: { users: 0, sessions: 0 } },
  };
}

function rowsToDayPoints(rows: any[] | null | undefined): Ga4DayPoint[] {
  return (rows || []).map((r) => {
    const raw = r.dimensionValues?.[0]?.value || '';
    // GA4 returns `date` as YYYYMMDD with no separators.
    const date = /^\d{8}$/.test(raw) ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : raw;
    return {
      date,
      users: Number(r.metricValues?.[0]?.value || 0),
      sessions: Number(r.metricValues?.[1]?.value || 0),
    };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

function sumDayPoints(points: Ga4DayPoint[]): { users: number; sessions: number } {
  return points.reduce((acc, p) => ({ users: acc.users + p.users, sessions: acc.sessions + p.sessions }), { users: 0, sessions: 0 });
}

// One combined read per dashboard refresh (overall trend + channel split
// + best-effort migrated-traffic slice) — call sites cache this at the
// route level (unstable_cache, ~1hr), matching /api/admin/intelligence's
// own pattern; this file has no caching of its own.
export async function getGa4Overview(propertyId: string, days: number): Promise<Ga4Overview> {
  if (!propertyId) return emptyOverview(propertyId);
  const client = getClient();
  if (!client) return emptyOverview(propertyId);

  const property = `properties/${propertyId}`;
  const dateRange = [{ startDate: `${days}daysAgo`, endDate: 'today' }];

  try {
    const [dayReport] = await client.runReport({
      property,
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'totalUsers' }, { name: 'sessions' }],
      dateRanges: dateRange,
    });
    const byDay = rowsToDayPoints(dayReport.rows as any[]);

    const [channelReport] = await client.runReport({
      property,
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }],
      dateRanges: dateRange,
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    });
    const channelBreakdown: Ga4ChannelRow[] = (channelReport.rows || []).map((r: any) => ({
      channel: r.dimensionValues?.[0]?.value || 'Unassigned',
      sessions: Number(r.metricValues?.[0]?.value || 0),
    }));

    let migrated: Ga4Overview['migrated'] = { available: false, byDay: [], totals: { users: 0, sessions: 0 } };
    try {
      const [migratedReport] = await client.runReport({
        property,
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'totalUsers' }, { name: 'sessions' }],
        dateRanges: dateRange,
        dimensionFilter: {
          filter: {
            fieldName: 'customEvent:migration_source',
            stringFilter: { value: 'old_domain', matchType: 'EXACT' },
          },
        },
      });
      const migratedDays = rowsToDayPoints(migratedReport.rows as any[]);
      migrated = { available: true, byDay: migratedDays, totals: sumDayPoints(migratedDays) };
    } catch (e) {
      // Expected until the migration_source custom dimension is
      // registered in GA4 and mapped via GTM — not an error worth
      // logging loudly, just "not available yet".
      migrated = { available: false, byDay: [], totals: { users: 0, sessions: 0 } };
    }

    return {
      configured: true,
      propertyId,
      byDay,
      channelBreakdown,
      totals: sumDayPoints(byDay),
      migrated,
    };
  } catch (e) {
    console.error('[googleAnalytics] GA4 Data API request failed', e);
    return emptyOverview(propertyId);
  }
}
