'use client';

import {
  SectionHeader, fmtINR,
  DeltaStatCard, InsightBanner, ActionCard, NarrativeInsight,
} from './Charts';

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeMorningBriefing(o: Record<string, number>, growthRate: number): {
  headline: string;
  chips: { label: string; color: string }[];
} {
  const today    = o.todayBookings   ?? 0;
  const month    = o.monthBookings   ?? 0;
  const cr       = o.cancellationRate ?? 0;
  const pending  = o.pendingBookings  ?? 0;
  const avgDaily = month > 0 ? Math.round(month / 30) : 0;

  let headline = '';
  if (today > avgDaily && avgDaily > 0) {
    headline = `Strong day — ${today} bookings today, ${today - avgDaily} ahead of your daily average`;
  } else if (cr > 20) {
    headline = `High cancellations today — review your confirmation flow to recover lost bookings`;
  } else if (pending > 5) {
    headline = `${pending} bookings need confirmation — act before they drop off`;
  } else {
    const dir = growthRate > 5 ? 'up' : growthRate < -5 ? 'down' : 'steady';
    headline = `${month} bookings this month — tracking ${dir} vs last month`;
  }

  const chips: { label: string; color: string }[] = [
    {
      label: `${growthRate > 0 ? '+' : ''}${growthRate}% MoM`,
      color: growthRate > 0 ? 'bg-emerald-100 text-emerald-700' : growthRate < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600',
    },
    {
      label: fmtINR(o.estimatedMonthRevenue ?? 0) + ' est. revenue',
      color: 'bg-blue-100 text-blue-700',
    },
  ];
  if (pending > 5) chips.push({ label: `${pending} pending`, color: 'bg-amber-100 text-amber-700' });
  if (cr > 20)     chips.push({ label: `High cancellations`, color: 'bg-red-100 text-red-700' });

  return { headline, chips };
}

function deriveInsights(o: Record<string, number>, growthRate: number): {
  icon: string; what: string; significance: 'positive' | 'negative' | 'neutral';
}[] {
  const insights: { icon: string; what: string; significance: 'positive' | 'negative' | 'neutral' }[] = [];
  const cr       = o.cancellationRate  ?? 0;
  const inactive = o.inactivePatients  ?? 0;
  const vip      = o.vipPatients       ?? 0;
  const pending  = o.pendingBookings   ?? 0;
  const estRev   = o.estimatedMonthRevenue ?? 0;

  if (cr > 20) {
    const lostRev = Math.round((cr / 100) * estRev);
    insights.push({
      icon: '⚠️',
      what: `${cr}% cancellation rate this month — that's ~${fmtINR(lostRev)} in lost revenue. Industry benchmark is below 10%.`,
      significance: 'negative',
    });
  } else if (cr < 10) {
    insights.push({
      icon: '✅',
      what: `${cr}% cancellation rate — well below the 10% industry benchmark. Your confirmation process is working.`,
      significance: 'positive',
    });
  }

  if (inactive > 20) {
    const reEngageRev = Math.round(inactive * 800);
    insights.push({
      icon: '💤',
      what: `${inactive} patients haven't returned in 90+ days — a re-engagement campaign could recover ~${fmtINR(reEngageRev)} in revenue.`,
      significance: 'negative',
    });
  }

  if (vip > 0) {
    insights.push({
      icon: '👑',
      what: `${vip} VIP patients (3+ visits) drive outsized loyalty. Prioritise their experience to protect your highest-value cohort.`,
      significance: 'positive',
    });
  }

  if (pending > 5) {
    insights.push({
      icon: '⏳',
      what: `${pending} bookings are sitting unconfirmed — each hour of delay increases the chance of a drop-off or no-show.`,
      significance: 'negative',
    });
  }

  if (growthRate > 15) {
    insights.push({
      icon: '🚀',
      what: `${growthRate}% month-on-month growth — strong momentum. This is a good time to increase capacity or introduce premium slots.`,
      significance: 'positive',
    });
  } else if (growthRate < -10) {
    insights.push({
      icon: '📉',
      what: `Bookings declined ${Math.abs(growthRate)}% vs last month — this may reflect seasonal slowdown or reduced visibility. Check your Google listing and referral sources.`,
      significance: 'negative',
    });
  }

  if (insights.length === 0) {
    insights.push({
      icon: '📊',
      what: `Metrics are within normal range. Keep monitoring cancellations and pending bookings for early signals.`,
      significance: 'neutral',
    });
  }

  return insights;
}

function computeTrendBanner(t30: { count: number }[]): { headline: string; sub: string; trend: 'up' | 'down' | 'neutral' } {
  if (t30.length < 14) return { headline: 'Booking trend — last 30 days', sub: '', trend: 'neutral' };
  const recent = t30.slice(-7).reduce((s, d) => s + d.count, 0);
  const prior  = t30.slice(-14, -7).reduce((s, d) => s + d.count, 0);
  if (prior === 0) return { headline: 'Booking trend — last 30 days', sub: '', trend: 'neutral' };
  const delta = Math.round(((recent - prior) / prior) * 100);
  if (delta > 0) {
    return {
      headline: `Bookings are up ${delta}% over the last 7 days`,
      sub: `${recent} bookings vs ${prior} the prior week`,
      trend: 'up',
    };
  } else if (delta < 0) {
    return {
      headline: `Bookings fell ${Math.abs(delta)}% this week`,
      sub: `${recent} bookings vs ${prior} the prior week`,
      trend: 'down',
    };
  }
  return { headline: 'Booking volume is steady week-on-week', sub: `${recent} bookings this week`, trend: 'neutral' };
}

function deriveActions(o: Record<string, number>): {
  title: string; detail: string; href: string; impact?: string; urgency: 'now' | 'today' | 'this-week';
}[] {
  const actions: { title: string; detail: string; href: string; impact?: string; urgency: 'now' | 'today' | 'this-week' }[] = [];
  const pending  = o.pendingBookings   ?? 0;
  const inactive = o.inactivePatients  ?? 0;
  const cr       = o.cancellationRate  ?? 0;
  const estRev   = o.estimatedMonthRevenue ?? 0;

  if (pending > 0) {
    const atRisk = Math.round((pending / Math.max(o.monthBookings ?? 1, 1)) * estRev);
    actions.push({
      title: `Confirm ${pending} pending bookings`,
      detail: 'Unconfirmed bookings are at risk of drop-off. Reach out or send confirmation messages.',
      href: '/admin/bookings',
      impact: `~${fmtINR(atRisk)} at risk`,
      urgency: 'now',
    });
  }

  if (cr > 15) {
    actions.push({
      title: 'Enable appointment reminders',
      detail: `Your ${cr}% cancellation rate is above 15%. Automated reminders typically cut no-shows by 30–40%.`,
      href: '/admin/settings/booking',
      impact: '~30% fewer no-shows',
      urgency: 'today',
    });
  }

  if (inactive > 10) {
    const reActivate = Math.round(inactive * 0.2 * 800);
    actions.push({
      title: `Re-engage ${inactive} inactive patients`,
      detail: 'Send a WhatsApp or SMS re-engagement message to patients absent for 90+ days.',
      href: '/admin/settings/whatsapp',
      impact: `~${fmtINR(reActivate)} potential`,
      urgency: 'this-week',
    });
  }

  actions.push({
    title: 'Review top treatment performance',
    detail: 'See which treatments are driving the most revenue and plan promotions accordingly.',
    href: '/admin/intelligence#treatment',
    urgency: 'this-week',
  });

  return actions;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExecutiveOverview({ data }: { data: Record<string, unknown> }) {
  const o  = (data?.overview ?? {}) as Record<string, number>;
  const t30: { label: string; count: number; revenue: number }[] = (data?.bookingTrend30d as { label: string; count: number; revenue: number }[]) || [];
  const growthRate = (data?.forecast as { growthRate?: number })?.growthRate ?? 0;
  const trend: 'up' | 'down' | 'neutral' = growthRate > 0 ? 'up' : growthRate < 0 ? 'down' : 'neutral';

  const { headline, chips } = computeMorningBriefing(o, growthRate);
  const insights             = deriveInsights(o, growthRate);
  const trendBanner          = computeTrendBanner(t30);
  const actions              = deriveActions(o);

  const cr = o.cancellationRate ?? 0;
  const crColor = cr < 10 ? 'text-emerald-600' : cr < 20 ? 'text-amber-600' : 'text-red-600';

  const completionRate = o.conversionRate ?? 0;
  const completionNarrative =
    completionRate >= 80 ? 'Excellent — above the 80% benchmark for healthy clinics.' :
    completionRate >= 60 ? 'Moderate — aim for 80%+ to reduce revenue leakage.' :
    'Below benchmark — review your booking confirmation and reminder flow.';
  const crNarrative =
    cr < 10 ? 'Below 10% — strong performance, well within industry norms.' :
    cr < 20 ? 'Between 10–20% — monitor and consider adding reminders.' :
    'Above 20% — high risk. Enable reminders and review your confirmation flow.';

  const revenueLastMonth = (data?.monthlyTrend12m as { revenue: number }[] | undefined);
  const lastMonthRevenue = revenueLastMonth && revenueLastMonth.length >= 2
    ? revenueLastMonth[revenueLastMonth.length - 2]?.revenue ?? 0
    : 0;
  const thisMonthRevenue = o.estimatedMonthRevenue ?? 0;
  const revDelta = lastMonthRevenue > 0
    ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
    : 0;
  const revDeltaStr = revDelta !== 0 ? `${revDelta > 0 ? '+' : ''}${revDelta}%` : undefined;
  const revTrend: 'up' | 'down' | 'neutral' = revDelta > 0 ? 'up' : revDelta < 0 ? 'down' : 'neutral';

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Executive Overview"
        subtitle="Business Intelligence · Shopify-grade insights"
        badge="Live Dashboard"
      />

      {/* ── A: Morning Briefing Banner ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100 border-l-4 border-l-blue-500">
        <p className="text-base font-extrabold text-gray-900 leading-snug">{headline}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          {chips.map((c, i) => (
            <span key={i} className={`text-xs font-semibold px-3 py-1 rounded-full ${c.color}`}>{c.label}</span>
          ))}
        </div>
      </div>

      {/* ── B: 4 Key Metrics ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <DeltaStatCard
          label="Month Bookings"
          value={o.monthBookings ?? 0}
          delta={`${growthRate > 0 ? '+' : ''}${growthRate}%`}
          deltaLabel="vs last month"
          trend={trend}
          icon="📈"
          narrative={
            growthRate > 10 ? 'Strong growth — above 10% MoM is excellent for a clinic.' :
            growthRate > 0  ? 'Modest growth — keep nurturing patient referrals.' :
            growthRate < 0  ? 'Decline vs last month — review acquisition channels.' :
            'Flat MoM — stable volume, look for growth levers.'
          }
        />
        <DeltaStatCard
          label="Estimated Revenue"
          value={fmtINR(thisMonthRevenue)}
          delta={revDeltaStr}
          deltaLabel="vs last month"
          trend={revTrend}
          icon="💰"
          narrative={
            revDelta > 0 ? `Up ${fmtINR(thisMonthRevenue - lastMonthRevenue)} from last month — good momentum.` :
            revDelta < 0 ? `Down ${fmtINR(lastMonthRevenue - thisMonthRevenue)} — review your high-value treatment mix.` :
            'Revenue is tracking in line with last month.'
          }
        />
        <DeltaStatCard
          label="Completion Rate"
          value={`${completionRate}%`}
          deltaLabel={`${o.completedBookings ?? 0} completed`}
          trend={completionRate >= 70 ? 'up' : 'down'}
          icon="✅"
          narrative={completionNarrative}
        />
        <DeltaStatCard
          label="Cancellation Rate"
          value={`${cr}%`}
          deltaLabel={`${o.cancelledBookings ?? 0} cancelled`}
          trend={cr > 15 ? 'down' : 'up'}
          icon="❌"
          narrative={crNarrative}
        />
      </div>

      {/* ── C: Auto-generated Insights Feed ───────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
        <div className="mb-4">
          <p className="text-sm font-bold text-[#0B2560]">📡 What&apos;s happening right now</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Computed from your live clinic data — no AI call needed</p>
        </div>
        <div className="space-y-3">
          {insights.map((ins, i) => (
            <NarrativeInsight key={i} icon={ins.icon} what={ins.what} significance={ins.significance} />
          ))}
        </div>
      </div>

      {/* ── D: 30-Day Booking Trend ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
        <InsightBanner
          headline={trendBanner.headline}
          sub={trendBanner.sub}
          trend={trendBanner.trend}
        />
        <div className="flex items-end gap-1 h-20">
          {t30.slice(-20).map((d, i) => {
            const max = Math.max(...t30.map(x => x.count), 1);
            const h   = Math.max(4, (d.count / max) * 72);
            return (
              <div key={i} className="flex-1 group relative">
                <div
                  className="w-full rounded-t bg-[#0B2560] hover:bg-[#F5A623] transition-colors duration-200"
                  style={{ height: `${h}px` }}
                />
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                  {d.label}: {d.count}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-2 text-[9px] text-gray-400">
          <span>{t30[Math.max(0, t30.length - 20)]?.label || ''}</span>
          <span>Today</span>
        </div>
      </div>

      {/* ── E: Priority Actions ────────────────────────────────────────── */}
      <div>
        <p className="text-sm font-bold text-[#0B2560] mb-3">🎯 What to do next</p>
        <div className="space-y-3">
          {actions.map((a, i) => (
            <ActionCard
              key={i}
              title={a.title}
              detail={a.detail}
              href={a.href}
              impact={a.impact}
              urgency={a.urgency}
            />
          ))}
        </div>
      </div>

      {/* ── F: Patient Segments ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
        <p className="text-sm font-bold text-[#0B2560] mb-1">Patient Segments</p>
        <p className="text-[11px] text-gray-400 mb-4">
          {(o.newPatients ?? 0) > (o.returningPatients ?? 0)
            ? 'Acquisition-led growth — strengthen retention to convert new patients into loyalists.'
            : 'Retention-led base — your returning patients are a strong foundation.'}
        </p>
        <div className="space-y-3">
          {([
            { label: 'New Patients',       value: o.newPatients ?? 0,       color: '#3B82F6', note: 'First visit this month' },
            { label: 'Returning Patients', value: o.returningPatients ?? 0, color: '#10B981', note: 'Visited before' },
            { label: 'VIP (3+ visits)',    value: o.vipPatients ?? 0,       color: '#8B5CF6', note: 'Your highest-loyalty cohort' },
            { label: 'Inactive (90d+)',    value: o.inactivePatients ?? 0,  color: '#F59E0B', note: 'Re-engagement opportunity' },
          ] as { label: string; value: number; color: string; note: string }[]).map((seg, i) => (
            <div key={i}>
              <div className="flex items-center justify-between mb-0.5">
                <div>
                  <span className="text-xs font-medium text-gray-700">{seg.label}</span>
                  <span className="text-[10px] text-gray-400 ml-2">{seg.note}</span>
                </div>
                <span className="text-xs font-bold text-gray-900">{seg.value}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, Math.round((seg.value / Math.max(o.uniquePatients ?? 1, 1)) * 100))}%`,
                    backgroundColor: seg.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-sm">
          <span className="text-gray-500">Total Unique Patients</span>
          <span className="font-extrabold text-[#0B2560]">{o.uniquePatients ?? 0}</span>
        </div>
      </div>
    </div>
  );
}
