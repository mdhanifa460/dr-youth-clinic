import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import Booking from '@/app/models/Booking';
import { Lead } from '@/app/models/Lead';
import { getSettings } from '@/app/models/Settings';
import { requirePermission } from '@/app/lib/adminAuth';
import { getGa4Overview, isGa4Configured, type Ga4Overview } from '@/app/lib/googleAnalytics';
import { getGscOverview, isGscConfigured, checkRedirectResolves, type GscSiteOverview } from '@/app/lib/googleSearchConsole';
import { computeMigrationHealth } from '@/app/lib/domainMigrationHealth';

export const dynamic = 'force-dynamic';

const TREND_MONTHS = 6;
const TRAFFIC_DAYS = 90;
// How many of GSC's top old-domain pages get a live redirect-resolve
// check per refresh — bounded so a cache refresh doesn't fire dozens of
// outbound HEAD requests; these are the pages that actually matter (most
// impressions), everything past this is lower-priority anyway.
const REDIRECT_CHECK_LIMIT = 10;

function pd(d: any): Date {
  if (d instanceof Date) return isNaN(d.getTime()) ? new Date(0) : d;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? new Date(0) : dt;
}

// Combined external read — GA4 + GSC (old + new) + a bounded batch of
// live redirect checks, cached ~1hr (same window /api/admin/intelligence
// uses for its own raw-data cache). This is the only place in the route
// that touches the network; the local-DB portion below is cheap enough
// to run on every request.
const getCachedExternalData = unstable_cache(
  async (ga4PropertyId: string, oldGscSite: string, newGscSite: string) => {
    const [ga4, gscOld, gscNew] = await Promise.all([
      getGa4Overview(ga4PropertyId, TRAFFIC_DAYS),
      getGscOverview(oldGscSite, TRAFFIC_DAYS),
      getGscOverview(newGscSite, TRAFFIC_DAYS),
    ]);

    // Live redirect check against GSC's own top old-domain pages by
    // impressions — this is what flags a URL that still gets real search
    // visibility but no longer resolves correctly (Section 7 of the audit).
    const topOldPages = gscOld.topPages.slice(0, REDIRECT_CHECK_LIMIT);
    const redirectChecks = await Promise.all(
      topOldPages.map(async (p) => ({ page: p.page, ...(await checkRedirectResolves(p.page)) }))
    );

    return { ga4, gscOld, gscNew, redirectChecks };
  },
  ['admin-domain-migration-external'],
  { revalidate: 3600 }
);

export async function GET() {
  const denied = await requirePermission('intelligence', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const settings = await getSettings();
    const dm = settings.domainMigration || ({} as any);

    if (dm.enabled === false) {
      return NextResponse.json({ success: true, enabled: false });
    }

    const external = await getCachedExternalData(dm.ga4PropertyId || '', dm.oldDomainGscSiteUrl || '', dm.newDomainGscSiteUrl || '');
    const { ga4, gscOld, gscNew, redirectChecks } = external;

    // ── Local DB: leads/bookings split by originDomain ────────────────────
    // 'old' | 'new' only ever comes from a document created after this
    // field shipped (see Lead.ts/Booking.ts comments) — a document with no
    // originDomain at all predates it and is bucketed separately as
    // "historical — unavailable", never silently counted as 'new'.
    const monthsAgo = new Date();
    monthsAgo.setMonth(monthsAgo.getMonth() - TREND_MONTHS);

    const [leads, bookings] = await Promise.all([
      Lead.find({ createdAt: { $gte: monthsAgo } } as any).select('originDomain createdAt').lean(),
      Booking.find({ createdAt: { $gte: monthsAgo } } as any).select('originDomain createdAt').lean(),
    ]);

    const bucket = (docs: any[]) => {
      let old = 0, fresh = 0, historical = 0;
      for (const d of docs) {
        if (d.originDomain === 'old') old++;
        else if (d.originDomain === 'new') fresh++;
        else historical++;
      }
      return { old, new: fresh, historicalUnavailable: historical };
    };
    const leadCounts = bucket(leads as any[]);
    const bookingCounts = bucket(bookings as any[]);

    // ── Trend — month-over-month, leads/bookings only (real, always
    // available); traffic-share trend is added only for months where GA4
    // actually has migrated-traffic data, never fabricated for earlier ones.
    const trend: Array<{ period: string; oldLeads: number; newLeads: number; oldBookings: number; newBookings: number }> = [];
    for (let i = TREND_MONTHS - 1; i >= 0; i--) {
      const mStart = new Date();
      mStart.setMonth(mStart.getMonth() - i, 1);
      mStart.setHours(0, 0, 0, 0);
      const mEnd = new Date(mStart);
      mEnd.setMonth(mEnd.getMonth() + 1);

      const inMonth = (docs: any[]) => docs.filter((d) => { const t = pd(d.createdAt); return t >= mStart && t < mEnd; });
      const mLeads = bucket(inMonth(leads as any[]));
      const mBookings = bucket(inMonth(bookings as any[]));
      trend.push({
        period: mStart.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        oldLeads: mLeads.old, newLeads: mLeads.new,
        oldBookings: mBookings.old, newBookings: mBookings.new,
      });
    }

    // ── Old-URL table — GSC's top old-domain pages, cross-checked live ────
    const oldUrls = gscOld.topPages.slice(0, REDIRECT_CHECK_LIMIT).map((p) => {
      const check = redirectChecks.find((r) => r.page === p.page);
      return {
        page: p.page,
        impressions: p.impressions,
        clicks: p.clicks,
        redirectStatus: check ? (check.ok ? 'ok' as const : 'broken' as const) : 'unchecked' as const,
        redirectsTo: check?.finalUrl || null,
      };
    });
    const brokenTopUrls = oldUrls.filter((u) => u.redirectStatus === 'broken').length;

    // ── Health ──────────────────────────────────────────────────────────
    const totalTraffic = ga4.totals.sessions + (ga4.migrated.available ? ga4.migrated.totals.sessions : 0);
    const oldSharePct = ga4.migrated.available && totalTraffic > 0
      ? (ga4.migrated.totals.sessions / totalTraffic) * 100
      : null;
    const totalLeads = leadCounts.old + leadCounts.new;
    const oldLeadSharePct = totalLeads > 0 ? (leadCounts.old / totalLeads) * 100 : null;
    const combinedOrganicImpressions = gscOld.totals.impressions + gscNew.totals.impressions;
    const oldOrganicSharePct = combinedOrganicImpressions > 0
      ? (gscOld.totals.impressions / combinedOrganicImpressions) * 100
      : null;

    const thresholds = {
      healthy: dm.healthyThresholdPct ?? 5,
      monitor: dm.monitorThresholdPct ?? 15,
      organicFloor: dm.organicFloorThresholdPct ?? 20,
    };
    const health = computeMigrationHealth({ oldSharePct, oldLeadSharePct, oldOrganicSharePct, brokenTopUrls, thresholds });

    return NextResponse.json({
      success: true,
      enabled: true,
      generatedAt: new Date().toISOString(),
      config: {
        ga4Configured: isGa4Configured() && !!dm.ga4PropertyId,
        gscOldConfigured: isGscConfigured() && !!dm.oldDomainGscSiteUrl,
        gscNewConfigured: isGscConfigured() && !!dm.newDomainGscSiteUrl,
        migratedTrafficAvailable: ga4.migrated.available,
        oldDomain: dm.oldDomain || '',
      },
      traffic: {
        new: { users: ga4.totals.users, sessions: ga4.totals.sessions, source: 'ga4' as const },
        old: ga4.migrated.available
          ? { users: ga4.migrated.totals.users, sessions: ga4.migrated.totals.sessions, source: 'ga4_migrated' as const }
          : { users: null, sessions: null, source: 'unavailable' as const },
      },
      channelBreakdown: ga4.channelBreakdown,
      gsc: { old: gscOld, new: gscNew },
      oldUrls,
      leadsBookings: {
        old: { leads: leadCounts.old, bookings: bookingCounts.old },
        new: { leads: leadCounts.new, bookings: bookingCounts.new },
        historicalUnavailable: { leads: leadCounts.historicalUnavailable, bookings: bookingCounts.historicalUnavailable },
      },
      trend,
      health: { ...health, thresholds, oldSharePct, oldLeadSharePct, oldOrganicSharePct },
    });
  } catch (err: any) {
    console.error('[domain-migration]', err);
    return NextResponse.json({ success: false, message: err.message || 'Failed to load domain migration data' }, { status: 500 });
  }
}
