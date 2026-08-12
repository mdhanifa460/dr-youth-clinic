import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import Booking from '@/app/models/Booking';
import { Service } from '@/app/models/Service';
import { Doctor } from '@/app/models/Doctor';
import { Review } from '@/app/models/Review';
import { Lead } from '@/app/models/Lead';
import { requirePermission } from '@/app/lib/adminAuth';
import { canonicalizeLocation, BRANCH_SLUGS } from '@/app/lib/locationNormalize';

const BRANCHES = ['chennai', 'bangalore', 'coimbatore', 'kochi'] as const;

export const dynamic = 'force-dynamic';

const MS_DAY = 864e5;

function pd(d: any): Date {
  if (d instanceof Date) return isNaN(d.getTime()) ? new Date(0) : d;
  if (typeof d === 'string' || typeof d === 'number') {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? new Date(0) : dt;
  }
  return new Date(0);
}

// This dashboard's own metrics (12-month trend, patient segmentation, VIP/
// inactive counts, the linear forecast) are only meaningful computed over
// the FULL booking/review history — unlike app/api/admin/bookings/stats or
// appointments/reports, there's no date-range fix here that wouldn't
// silently change what these numbers mean. The two things that ARE safe to
// cut: (1) field projection — every downstream computation only reads a
// handful of fields per document, not the full Booking/Service/Doctor/
// Review shape; (2) a short cache — an admin refreshing/re-opening this
// dashboard shouldn't re-scan all four collections every time, and this
// data doesn't need second-level freshness for a business-intelligence view.
const getCachedRawData = unstable_cache(
  async () => {
    await connectDB();
    const [allBookings, allServices, allDoctors, allReviews, allLeads] = await Promise.all([
      Booking.find().select('createdAt status phone formattedPhone service location doctorId').lean(),
      Service.find().select('name price category seoScore location status').lean(),
      Doctor.find().select('name title experience locations active').lean(),
      Review.find().select('location rating source reviewText authorName isVisible createdAt').lean(),
      // Real Lead records for location-wise lead tracking (§4 of the
      // Marketing Intelligence requirements) — `preferredClinic` is the
      // patient's own branch choice (see Lead.ts comment), the most
      // meaningful "which location is this lead for" signal, with
      // `clinicLocation` (QR/link attribution) and `city` (legacy free
      // text) as fallbacks for older leads that predate preferredClinic.
      Lead.find().select('preferredClinic clinicLocation city createdAt').lean(),
    ]);
    return { allBookings, allServices, allDoctors, allReviews, allLeads };
  },
  ['admin-intelligence-raw'],
  { revalidate: 60 }
);

export async function GET(req: NextRequest) {
  const denied = await requirePermission('intelligence', 'view');
  if (denied) return denied;

  try {
    const branch = (req.nextUrl.searchParams.get('branch') || 'all').toLowerCase();
    const isBranchFiltered = branch !== 'all' && (BRANCHES as readonly string[]).includes(branch);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart  = new Date(todayStart.getTime() - 7  * MS_DAY);
    const monthStart = new Date(todayStart.getTime() - 30 * MS_DAY);
    const day90Start = new Date(todayStart.getTime() - 90 * MS_DAY);

    const { allBookings, allServices, allDoctors, allReviews, allLeads } = await getCachedRawData();

    const allBs   = allBookings as any[];
    const allSvcs = allServices as any[];
    const allDocsArr = allDoctors as any[];
    const allRevs = allReviews as any[];
    const allLds  = (allLeads as any[]) || [];

    // Branch-scoped working sets — every metric below (except `byLocation`,
    // which exists specifically to compare branches side by side and always
    // uses the "all*" arrays) is computed from these, so picking a branch
    // scopes the entire dashboard consistently rather than just one panel.
    const bs   = isBranchFiltered ? allBs.filter(b => (b.location || '').toLowerCase() === branch) : allBs;
    const svcs = isBranchFiltered ? allSvcs.filter((s: any) => (s.location || '').toLowerCase() === branch || (s.location || '').toLowerCase() === 'all') : allSvcs;
    const docs = isBranchFiltered ? allDocsArr.filter((d: any) => d.locations?.includes(branch) || d.locations?.includes('all')) : allDocsArr;
    const revs = isBranchFiltered ? allRevs.filter((r: any) => (r.location || '').toLowerCase() === branch) : allRevs;

    // price + category + SEO score lookup by normalized service name — kept
    // global (from the full, unfiltered catalogue) so a booking's price
    // still resolves even when the branch filter excludes that city's copy
    // of the named service; a price/category is a property of the service,
    // not of which branch booked it.
    const priceMap    = new Map<string, number>();
    const catMap      = new Map<string, string>();
    const seoScoreMap = new Map<string, number>();
    for (const s of allSvcs) {
      const key = (s.name || '').toLowerCase().trim();
      priceMap.set(key, s.price || 0);
      catMap.set(key,   s.category || 'Other');
      seoScoreMap.set(key, s.seoScore || 0);
    }
    const getPrice    = (name: string) => priceMap.get((name || '').toLowerCase().trim()) || 0;
    const getCat      = (name: string) => catMap.get((name || '').toLowerCase().trim()) || 'Other';
    const getSeoScore = (name: string) => seoScoreMap.get((name || '').toLowerCase().trim()) || 0;

    // ── Core counts ──────────────────────────────────────────────────────────
    const totalBookings     = bs.length;
    const todayBookings     = bs.filter(b => pd(b.createdAt) >= todayStart).length;
    const weekBookings      = bs.filter(b => pd(b.createdAt) >= weekStart).length;
    const monthBookings     = bs.filter(b => pd(b.createdAt) >= monthStart).length;
    const completedBookings = bs.filter(b => b.status === 'completed').length;
    const cancelledBookings = bs.filter(b => b.status === 'cancelled').length;
    const pendingBookings   = bs.filter(b => ['new', 'pending', 'confirmed'].includes(b.status)).length;
    const conversionRate    = totalBookings ? Math.round((completedBookings / totalBookings) * 100) : 0;
    const cancellationRate  = totalBookings ? Math.round((cancelledBookings / totalBookings) * 100) : 0;

    // ── Patient segmentation ─────────────────────────────────────────────────
    const patientMap = new Map<string, any[]>();
    for (const b of bs) {
      const digits = (b.phone || b.formattedPhone || '').replace(/\D/g, '');
      const key = digits || `anon-${b._id}`;
      if (!patientMap.has(key)) patientMap.set(key, []);
      patientMap.get(key)!.push(b);
    }
    const patientEntries = Array.from(patientMap.entries());
    const uniquePatients  = patientEntries.length;
    const returningCount  = patientEntries.filter(([, b]) => b.length > 1).length;
    const newCount        = patientEntries.filter(([, b]) => b.length === 1).length;
    const vipCount        = patientEntries.filter(([, b]) => b.length >= 3).length;
    const inactiveCount   = patientEntries.filter(([, bookings]) => {
      const last = bookings.reduce((l, b) => { const d = pd(b.createdAt); return d > l ? d : l; }, new Date(0));
      return last < day90Start;
    }).length;

    // ── Revenue estimates ────────────────────────────────────────────────────
    const revenue = (list: any[]) =>
      list.filter(b => b.status !== 'cancelled').reduce((s, b) => s + getPrice(b.service || ''), 0);

    const estimatedTotalRevenue = revenue(bs);
    const estimatedMonthRevenue = revenue(bs.filter(b => pd(b.createdAt) >= monthStart));

    // ── 30-day trend (single pass) ───────────────────────────────────────────
    const trend30Start = new Date(todayStart.getTime() - 29 * MS_DAY);
    const dayCount  = new Map<string, number>();
    const dayRev    = new Map<string, number>();
    for (const b of bs) {
      const t = pd(b.createdAt);
      if (t < trend30Start || t >= new Date(todayStart.getTime() + MS_DAY)) continue;
      const key = t.toISOString().slice(0, 10);
      dayCount.set(key, (dayCount.get(key) || 0) + 1);
      if (b.status !== 'cancelled') dayRev.set(key, (dayRev.get(key) || 0) + getPrice(b.service || ''));
    }
    const bookingTrend30d = Array.from({ length: 30 }, (_, i) => {
      const d   = new Date(todayStart.getTime() - (29 - i) * MS_DAY);
      const key = d.toISOString().slice(0, 10);
      return {
        date:    key,
        label:   d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        count:   dayCount.get(key) || 0,
        revenue: dayRev.get(key)   || 0,
      };
    });

    // ── 12-month trend ───────────────────────────────────────────────────────
    const monthlyTrend12m = Array.from({ length: 12 }, (_, i) => {
      const offset = 11 - i;
      const mStart = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const mEnd   = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
      const mBs    = bs.filter(b => { const t = pd(b.createdAt); return t >= mStart && t < mEnd; });
      return {
        month:   mStart.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        count:   mBs.length,
        revenue: revenue(mBs),
      };
    });

    // ── Service breakdown ────────────────────────────────────────────────────
    const svcMap = new Map<string, { count: number; completed: number; cancelled: number; revenue: number }>();
    for (const b of bs) {
      const n = (b.service || 'Unknown').trim();
      if (!svcMap.has(n)) svcMap.set(n, { count: 0, completed: 0, cancelled: 0, revenue: 0 });
      const e = svcMap.get(n)!;
      e.count++;
      if (b.status === 'completed') { e.completed++; e.revenue += getPrice(n); }
      if (b.status === 'cancelled')   e.cancelled++;
    }
    const byService = Array.from(svcMap.entries())
      .map(([name, e]) => ({
        name,
        category: getCat(name),
        price:    getPrice(name),
        seoScore: getSeoScore(name),
        count:    e.count,
        revenue:  e.revenue,
        completionRate:  e.count ? Math.round((e.completed  / e.count) * 100) : 0,
        cancellationRate: e.count ? Math.round((e.cancelled / e.count) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // ── Location breakdown — always compares ALL branches (uses the "all*"
    // arrays, not the branch-filtered ones above) regardless of the selected
    // branch filter, since a single-branch view of a branch-comparison table
    // would defeat its purpose.
    //
    // `normLoc` canonicalizes free-text location values (Booking.location,
    // Lead.preferredClinic/clinicLocation/city are all unvalidated strings
    // written inconsistently across entry points — see locationNormalize.ts)
    // down to one of the 4 real branch slugs, falling back to a lowercased
    // raw value (not silently dropped) for anything that doesn't match, so
    // a genuine data-quality problem stays visible as its own row instead
    // of disappearing into 'unknown'.
    const normLoc = (raw: unknown): string =>
      canonicalizeLocation(raw) || (typeof raw === 'string' && raw.trim() ? raw.trim().toLowerCase() : 'unknown');

    const locMap = new Map<string, { count: number; revenue: number }>();
    // Service breakdown per location (from Booking.service — the real
    // "service" field; Lead has no equivalent, only primaryConcern) so
    // "which service generates the most leads/bookings for each location"
    // can be answered without guessing.
    const locSvcMap = new Map<string, Map<string, number>>();
    for (const b of allBs) {
      const loc = normLoc(b.location);
      if (!locMap.has(loc)) locMap.set(loc, { count: 0, revenue: 0 });
      const e = locMap.get(loc)!;
      e.count++;
      if (b.status !== 'cancelled') e.revenue += getPrice(b.service || '');

      if (!locSvcMap.has(loc)) locSvcMap.set(loc, new Map());
      const svcName = (b.service || 'Unknown').trim();
      const sm = locSvcMap.get(loc)!;
      sm.set(svcName, (sm.get(svcName) || 0) + 1);
    }

    // Real leads-by-location — preferredClinic first (patient's own branch
    // choice), falling back to clinicLocation (QR/link attribution) then
    // city (legacy free text) for older leads.
    const leadLocMap = new Map<string, number>();
    for (const l of allLds) {
      const loc = normLoc(l.preferredClinic) !== 'unknown' ? normLoc(l.preferredClinic)
        : normLoc(l.clinicLocation) !== 'unknown' ? normLoc(l.clinicLocation)
        : normLoc(l.city);
      leadLocMap.set(loc, (leadLocMap.get(loc) || 0) + 1);
    }

    // Seed every real branch even with zero bookings/leads so the location
    // table always shows all 4 clinics, not just the ones with activity.
    for (const slug of BRANCH_SLUGS) {
      if (!locMap.has(slug)) locMap.set(slug, { count: 0, revenue: 0 });
      if (!leadLocMap.has(slug)) leadLocMap.set(slug, 0);
    }

    const activeDocsGlobal = allDocsArr.filter((d: any) => d.active);
    const byLocation = Array.from(locMap.entries())
      .map(([location, e]) => {
        const lRevs = allRevs.filter((r: any) => (r.location || '').toLowerCase() === location);
        const lDocs = activeDocsGlobal.filter((d: any) => d.locations?.includes(location) || d.locations?.includes('all'));
        const lSvcs = allSvcs.filter((s: any) => s.location === location && s.status === 'active');
        const avgR  = lRevs.length ? lRevs.reduce((s: number, r: any) => s + (r.rating || 0), 0) / lRevs.length : 0;
        const leads = leadLocMap.get(location) || 0;
        const svcCounts = locSvcMap.get(location);
        const topService = svcCounts && svcCounts.size
          ? Array.from(svcCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
          : null;
        return {
          location,
          count:       e.count,
          revenue:     e.revenue,
          services:    lSvcs.length,
          doctors:     lDocs.length,
          avgRating:   Math.round(avgR * 10) / 10,
          reviewCount: lRevs.length,
          // Real Lead-collection counts, not derived from bookings.
          leads,
          // Approximate — bookings and leads are separate collections with
          // no leadId link on Booking today (a booking can also happen with
          // no prior Lead record at all, e.g. direct /book submissions), so
          // this is bookings÷leads by location, not a true per-patient
          // conversion funnel. Good enough for "which location converts
          // best" directionally; a leadId-linked funnel would need a schema
          // change to Booking (out of scope for this pass).
          conversionRate: leads > 0 ? Math.round((e.count / leads) * 100) : null,
          topService,
        };
      })
      .sort((a, b) => b.count - a.count);

    // ── Status breakdown ─────────────────────────────────────────────────────
    const byStatus = ['new', 'confirmed', 'completed', 'cancelled', 'pending']
      .map(status => {
        const count = bs.filter(b => b.status === status).length;
        return { status, count, percentage: totalBookings ? Math.round((count / totalBookings) * 100) : 0 };
      })
      .filter(s => s.count > 0);

    // ── Top patients ─────────────────────────────────────────────────────────
    const topPatients = patientEntries
      .map(([phone, bookings]) => ({
        phone:       phone.slice(0, 2) + '****' + phone.slice(-4),
        count:       bookings.length,
        services:    Array.from(new Set(bookings.map((b: any) => b.service).filter(Boolean))) as string[],
        lastBooking: bookings
          .reduce((l: Date, b: any) => { const d = pd(b.createdAt); return d > l ? d : l; }, new Date(0))
          .toISOString().slice(0, 10),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ── Reviews ──────────────────────────────────────────────────────────────
    const srcAcc: Record<string, { count: number; total: number }> = {};
    for (const r of revs as any[]) {
      const src = r.source || 'other';
      if (!srcAcc[src]) srcAcc[src] = { count: 0, total: 0 };
      srcAcc[src].count++;
      srcAcc[src].total += r.rating || 0;
    }
    const reviewsBySource = Object.entries(srcAcc).map(([source, d]) => ({
      source, count: d.count, avgRating: Math.round((d.total / d.count) * 10) / 10,
    }));
    const reviewsByRating = [5, 4, 3, 2, 1].map(rating => ({
      rating,
      count: revs.filter((r: any) => r.rating === rating).length,
    }));
    const avgRating = revs.length
      ? revs.reduce((s: number, r: any) => s + (r.rating || 0), 0) / revs.length
      : 0;
    const recentPositiveReview = revs
      .filter((r: any) => r.rating >= 4 && r.reviewText && r.isVisible)
      .sort((a: any, b: any) => pd(b.createdAt).getTime() - pd(a.createdAt).getTime())[0] || null;

    // ── Forecast (linear) ────────────────────────────────────────────────────
    const last3 = monthlyTrend12m.slice(-3);
    const avgMoBookings = last3.length ? Math.round(last3.reduce((s, m) => s + m.count, 0) / last3.length) : 0;
    const avgMoRevenue  = last3.length ? Math.round(last3.reduce((s, m) => s + m.revenue, 0) / last3.length) : 0;
    const prevMo  = monthlyTrend12m[monthlyTrend12m.length - 2] || { count: 0, revenue: 0 };
    const currMo  = monthlyTrend12m[monthlyTrend12m.length - 1] || { count: 0, revenue: 0 };
    const growthRate = prevMo.count ? Math.round(((currMo.count - prevMo.count) / prevMo.count) * 100) : 0;
    const trend: 'growing' | 'stable' | 'declining' =
      growthRate > 5 ? 'growing' : growthRate < -5 ? 'declining' : 'stable';
    const bump = 1 + (growthRate / 100) * 0.5;
    const forecast = {
      nextMonth: {
        bookings:   Math.max(0, Math.round(avgMoBookings * bump)),
        revenue:    Math.max(0, Math.round(avgMoRevenue  * bump)),
        confidence: Math.min(92, Math.max(55, 80 - Math.abs(growthRate) * 0.4)),
      },
      growthRate,
      trend,
    };

    // ── Smart alerts ─────────────────────────────────────────────────────────
    const alerts: any[] = [];
    if (cancellationRate > 20)
      alerts.push({ id: 'cancel', type: 'operational', priority: 'critical',
        message: `High cancellation rate: ${cancellationRate}%`,
        detail: `${cancelledBookings} bookings cancelled. Send WhatsApp reminders 24h before appointments.`,
        action: 'Set Up Reminders' });
    if (growthRate < -10)
      alerts.push({ id: 'decline', type: 'revenue', priority: 'critical',
        message: `Booking decline: ${Math.abs(growthRate)}% drop this month`,
        detail: `Bookings fell from ${prevMo.count} to ${currMo.count}. Immediate marketing action needed.`,
        action: 'Boost Marketing' });
    if (inactiveCount > uniquePatients * 0.3 && inactiveCount > 0)
      alerts.push({ id: 'inactive', type: 'retention', priority: 'medium',
        message: `${inactiveCount} patients inactive for 90+ days`,
        detail: `${Math.round((inactiveCount / Math.max(uniquePatients, 1)) * 100)}% of patients need re-engagement.`,
        action: 'Launch Re-engagement' });
    if (avgRating < 4.0 && revs.length > 5)
      alerts.push({ id: 'rating', type: 'reputation', priority: 'critical',
        message: `Rating below target: ${avgRating.toFixed(1)}/5`,
        detail: 'Address negative reviews and improve patient experience.',
        action: 'Review Feedback' });
    if (pendingBookings > 15)
      alerts.push({ id: 'pending', type: 'operational', priority: 'medium',
        message: `${pendingBookings} bookings awaiting confirmation`,
        detail: 'Large unconfirmed queue may frustrate patients. Process promptly.',
        action: 'Confirm Bookings' });
    if (vipCount < 5 && uniquePatients > 20)
      alerts.push({ id: 'vip', type: 'growth', priority: 'low',
        message: 'No VIP loyalty programme in place',
        detail: `Only ${vipCount} patients have 3+ visits. A loyalty programme can double repeat visits.`,
        action: 'Create VIP Programme' });

    // ── Growth opportunities ─────────────────────────────────────────────────
    const growthOpportunities: any[] = [];
    const retentionPct = uniquePatients ? Math.round((returningCount / uniquePatients) * 100) : 0;
    if (retentionPct < 40)
      growthOpportunities.push({ id: 'retention', icon: '🔄', priority: 'high',
        title: 'Boost Patient Retention',
        description: `Only ${retentionPct}% of patients return. Industry average is 60%+.`,
        action: 'Send personalised WhatsApp follow-ups post-treatment with a 10% loyalty discount for the next visit.',
        potential: '₹40–80K extra per month' });
    const topSvc = byService[0];
    if (topSvc)
      growthOpportunities.push({ id: 'upsell', icon: '⬆️', priority: 'high',
        title: `Upsell Beyond ${topSvc.name}`,
        description: `Your most booked service has ${topSvc.completionRate}% completion. Pair it with complementary treatments.`,
        action: 'Create a treatment bundle combining your top service with chemical peel or maintenance package at 15% off.',
        potential: '₹20–50K monthly uplift' });
    if (vipCount < uniquePatients * 0.1 && uniquePatients > 10)
      growthOpportunities.push({ id: 'vip-prog', icon: '👑', priority: 'medium',
        title: 'Launch VIP Membership',
        description: `Only ${vipCount} VIP patients currently (3+ visits). A loyalty tier system could double this.`,
        action: 'Introduce Silver / Gold / Platinum tiers with priority booking, exclusive discounts, and birthday rewards.',
        potential: '₹1–2L recurring monthly' });
    if (inactiveCount > 10)
      growthOpportunities.push({ id: 'win-back', icon: '💌', priority: 'medium',
        title: `Win Back ${inactiveCount} Inactive Patients`,
        description: 'Patients inactive for 90+ days are at risk of churning permanently.',
        action: 'Send a personalised "We miss you" WhatsApp campaign with a 15% reactivation discount.',
        potential: `₹${Math.round(inactiveCount * avgMoRevenue / Math.max(uniquePatients, 1) * 0.3 / 1000)}–${Math.round(inactiveCount * avgMoRevenue / Math.max(uniquePatients, 1) * 0.5 / 1000)}K recovery revenue` });

    return NextResponse.json({
      success:       true,
      generatedAt:   now.toISOString(),
      branch:        isBranchFiltered ? branch : 'all',
      branches:      BRANCHES,
      overview: {
        todayBookings, weekBookings, monthBookings, totalBookings,
        completedBookings, cancelledBookings, pendingBookings,
        conversionRate, cancellationRate,
        uniquePatients, newPatients: newCount, returningPatients: returningCount,
        vipPatients: vipCount, inactivePatients: inactiveCount,
        activeServices:  svcs.filter((s: any) => s.status === 'active').length,
        totalServices:   svcs.length,
        activeDoctors:   docs.filter((d: any) => d.active).length,
        totalDoctors:    docs.length,
        totalReviews:    revs.length,
        avgRating:       Math.round(avgRating * 10) / 10,
        activeClinics:   Math.max(byLocation.length, 1),
        estimatedMonthRevenue,
        estimatedTotalRevenue,
      },
      bookingTrend30d,
      monthlyTrend12m,
      byService,
      byLocation,
      byStatus,
      patientSegments: {
        new: newCount, returning: returningCount, vip: vipCount, inactive: inactiveCount,
        totalUnique: uniquePatients,
        avgBookingsPerPatient: uniquePatients ? Math.round((totalBookings / uniquePatients) * 10) / 10 : 0,
        topPatients,
      },
      // Real per-doctor booking/revenue counts from Booking.doctorId — added
      // alongside the Doctor model this session specifically to close this
      // gap (the Doctor Performance panel previously had no real per-doctor
      // data to show and had to estimate by splitting branch totals evenly).
      // Bookings created before that field existed have no doctorId, so
      // `hasRealData` tells the panel whether to trust these numbers for a
      // given doctor or fall back to the old estimate for one with none yet.
      doctors: docs.map((d: any) => {
        const docBookings = bs.filter((b: any) => b.doctorId && String(b.doctorId) === String(d._id));
        return {
          name: d.name, title: d.title, experience: d.experience,
          locations: d.locations, active: d.active,
          realBookings: docBookings.length,
          realRevenue: revenue(docBookings),
          hasRealData: docBookings.length > 0,
        };
      }),
      reviewsBySource,
      reviewsByRating,
      recentPositiveReview: recentPositiveReview ? {
        text:   recentPositiveReview.reviewText,
        author: recentPositiveReview.authorName,
        rating: recentPositiveReview.rating,
      } : null,
      forecast,
      alerts,
      growthOpportunities,
    });

  } catch (err: any) {
    console.error('[intelligence]', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
