import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import Booking from '@/app/models/Booking';
import { Service } from '@/app/models/Service';
import { Doctor } from '@/app/models/Doctor';
import { Review } from '@/app/models/Review';
import { requirePermission } from '@/app/lib/adminAuth';

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

export async function GET() {
  const denied = await requirePermission('intelligence', 'view');
  if (denied) return denied;

  try {
    await connectDB();

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart  = new Date(todayStart.getTime() - 7  * MS_DAY);
    const monthStart = new Date(todayStart.getTime() - 30 * MS_DAY);
    const day90Start = new Date(todayStart.getTime() - 90 * MS_DAY);

    const [allBookings, allServices, allDoctors, allReviews] = await Promise.all([
      Booking.find().lean(),
      Service.find().lean(),
      Doctor.find().lean(),
      Review.find().lean(),
    ]);

    const bs = allBookings as any[];
    const svcs = allServices as any[];
    const docs = allDoctors as any[];
    const revs = allReviews as any[];

    // price + category lookup by normalized service name
    const priceMap  = new Map<string, number>();
    const catMap    = new Map<string, string>();
    for (const s of svcs) {
      const key = (s.name || '').toLowerCase().trim();
      priceMap.set(key, s.price || 0);
      catMap.set(key,   s.category || 'Other');
    }
    const getPrice = (name: string) => priceMap.get((name || '').toLowerCase().trim()) || 0;
    const getCat   = (name: string) => catMap.get((name || '').toLowerCase().trim()) || 'Other';

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
        count:    e.count,
        revenue:  e.revenue,
        completionRate:  e.count ? Math.round((e.completed  / e.count) * 100) : 0,
        cancellationRate: e.count ? Math.round((e.cancelled / e.count) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // ── Location breakdown ───────────────────────────────────────────────────
    const locMap = new Map<string, { count: number; revenue: number }>();
    for (const b of bs) {
      const loc = (b.location || 'unknown').toLowerCase();
      if (!locMap.has(loc)) locMap.set(loc, { count: 0, revenue: 0 });
      const e = locMap.get(loc)!;
      e.count++;
      if (b.status !== 'cancelled') e.revenue += getPrice(b.service || '');
    }
    const activeDocs = docs.filter((d: any) => d.active);
    const byLocation = Array.from(locMap.entries())
      .map(([location, e]) => {
        const lRevs = revs.filter((r: any) => (r.location || '').toLowerCase() === location);
        const lDocs = activeDocs.filter((d: any) => d.locations?.includes(location) || d.locations?.includes('all'));
        const lSvcs = svcs.filter((s: any) => s.location === location && s.status === 'active');
        const avgR  = lRevs.length ? lRevs.reduce((s: number, r: any) => s + (r.rating || 0), 0) / lRevs.length : 0;
        return {
          location,
          count:       e.count,
          revenue:     e.revenue,
          services:    lSvcs.length,
          doctors:     lDocs.length,
          avgRating:   Math.round(avgR * 10) / 10,
          reviewCount: lRevs.length,
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
      overview: {
        todayBookings, weekBookings, monthBookings, totalBookings,
        completedBookings, cancelledBookings, pendingBookings,
        conversionRate, cancellationRate,
        uniquePatients, newPatients: newCount, returningPatients: returningCount,
        vipPatients: vipCount, inactivePatients: inactiveCount,
        activeServices:  svcs.filter((s: any) => s.status === 'active').length,
        totalServices:   svcs.length,
        activeDoctors:   activeDocs.length,
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
      doctors: docs.map((d: any) => ({
        name: d.name, title: d.title, experience: d.experience,
        locations: d.locations, active: d.active,
      })),
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
