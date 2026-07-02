'use client';

import { StatCard, SectionHeader, SparkLine, ProgressBar, HBarChart, fmtINR } from './Charts';

export default function ExecutiveOverview({ data }: { data: any }) {
  const o  = data?.overview || {};
  const t30 = data?.bookingTrend30d || [];
  const sparkCounts  = t30.map((d: any) => d.count);
  const sparkRevenue = t30.map((d: any) => d.revenue);
  const m12 = data?.monthlyTrend12m || [];
  const growthRate = data?.forecast?.growthRate ?? 0;
  const trend: 'up' | 'down' | 'neutral' = growthRate > 0 ? 'up' : growthRate < 0 ? 'down' : 'neutral';

  const kpis = [
    { label: "Today's Bookings",   value: o.todayBookings  ?? 0,  icon: '📅', sub: `${o.weekBookings ?? 0} this week`,   trend: 'neutral' as const, spark: sparkCounts.slice(-7) },
    { label: 'Month Bookings',     value: o.monthBookings  ?? 0,  icon: '📈', sub: `${growthRate > 0 ? '+' : ''}${growthRate}% vs last month`, trend, spark: sparkCounts },
    { label: 'Estimated Revenue',  value: fmtINR(o.estimatedMonthRevenue ?? 0), icon: '💰', sub: 'this month (estimated)', trend, spark: sparkRevenue },
    { label: 'Unique Patients',    value: o.uniquePatients ?? 0,  icon: '👥', sub: `${o.returningPatients ?? 0} returning`, trend: 'neutral' as const, spark: undefined },
    { label: 'Completion Rate',    value: `${o.conversionRate ?? 0}%`, icon: '✅', sub: `${o.completedBookings ?? 0} completed`, trend: (o.conversionRate ?? 0) >= 70 ? 'up' as const : 'down' as const, spark: undefined },
    { label: 'Cancellation Rate',  value: `${o.cancellationRate ?? 0}%`, icon: '❌', sub: `${o.cancelledBookings ?? 0} cancelled`, trend: (o.cancellationRate ?? 0) > 15 ? 'down' as const : 'up' as const, spark: undefined },
    { label: 'Google Rating',      value: `${o.avgRating ?? 0}/5`, icon: '⭐', sub: `${o.totalReviews ?? 0} reviews`, trend: (o.avgRating ?? 0) >= 4.5 ? 'up' as const : 'neutral' as const, spark: undefined },
    { label: 'VIP Patients',       value: o.vipPatients ?? 0, icon: '👑', sub: '3+ visits', trend: 'neutral' as const, spark: undefined },
    { label: 'Active Services',    value: o.activeServices ?? 0, icon: '🩺', sub: `of ${o.totalServices ?? 0} total`, trend: 'neutral' as const, spark: undefined },
    { label: 'Active Doctors',     value: o.activeDoctors ?? 0, icon: '👨‍⚕️', sub: `${o.activeClinics ?? 0} clinics`, trend: 'neutral' as const, spark: undefined },
    { label: 'Pending Bookings',   value: o.pendingBookings ?? 0, icon: '⏳', sub: 'need confirmation', trend: (o.pendingBookings ?? 0) > 10 ? 'down' as const : 'neutral' as const, spark: undefined },
    { label: 'Inactive Patients',  value: o.inactivePatients ?? 0, icon: '💤', sub: '90+ days absent', trend: 'neutral' as const, spark: undefined },
  ];

  const statusColors: Record<string, string> = {
    new: '#3B82F6', confirmed: '#8B5CF6', completed: '#10B981',
    cancelled: '#EF4444', pending: '#F59E0B',
  };

  const byStatusData = (data?.byStatus || []).map((s: any) => ({
    label: s.status, value: s.count, sub: `${s.percentage}%`, color: statusColors[s.status] || '#94A3B8',
  }));

  const monthLabels = m12.slice(-6).map((m: any) => m.month);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Executive Overview"
        subtitle="Real-time snapshot of your clinic's business health across all locations."
        badge="Live Dashboard"
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {kpis.map((k, i) => (
          <StatCard
            key={i}
            label={k.label}
            value={k.value}
            sub={k.sub}
            trend={k.trend}
            icon={k.icon}
            sparkData={k.spark}
            color="#0B2560"
          />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Booking trend bar chart */}
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-bold text-[#0B2560]">Booking Trend — Last 30 Days</p>
              <p className="text-xs text-gray-500">{o.monthBookings ?? 0} bookings this period</p>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              trend === 'up'   ? 'bg-emerald-50 text-emerald-600' :
              trend === 'down' ? 'bg-red-50 text-red-600' :
              'bg-gray-100 text-gray-500'
            }`}>
              {growthRate > 0 ? '+' : ''}{growthRate}% MoM
            </span>
          </div>
          <div className="flex items-end gap-1 h-20">
            {t30.slice(-20).map((d: any, i: number) => {
              const max = Math.max(...t30.map((x: any) => x.count), 1);
              const h = Math.max(4, (d.count / max) * 72);
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
            <span>{t30[t30.length - 20]?.label || ''}</span>
            <span>Today</span>
          </div>
        </div>

        {/* Patient segmentation */}
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm font-bold text-[#0B2560] mb-4">Patient Segments</p>
          <div className="space-y-3">
            {[
              { label: 'New Patients',      value: o.newPatients  ?? 0, total: o.uniquePatients ?? 1, color: '#3B82F6' },
              { label: 'Returning Patients',value: o.returningPatients ?? 0, total: o.uniquePatients ?? 1, color: '#10B981' },
              { label: 'VIP (3+ visits)',   value: o.vipPatients  ?? 0, total: o.uniquePatients ?? 1, color: '#8B5CF6' },
              { label: 'Inactive (90d+)',   value: o.inactivePatients ?? 0, total: o.uniquePatients ?? 1, color: '#F59E0B' },
            ].map((seg, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700">{seg.label}</span>
                  <span className="text-xs font-bold text-gray-900">{seg.value}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.round((seg.value / seg.total) * 100))}%`, backgroundColor: seg.color }}
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

      {/* Status breakdown */}
      {byStatusData.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm font-bold text-[#0B2560] mb-4">Booking Status Breakdown</p>
          <HBarChart data={byStatusData} />
        </div>
      )}

      {/* Monthly revenue trend */}
      {m12.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-[#0B2560]">Monthly Revenue Trend — 12 Months</p>
            <p className="text-xs text-gray-500">Estimated from service prices</p>
          </div>
          <div className="flex items-end gap-2 h-24">
            {m12.map((m: any, i: number) => {
              const maxR = Math.max(...m12.map((x: any) => x.revenue), 1);
              const h = Math.max(4, (m.revenue / maxR) * 88);
              const isLast = i === m12.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div
                    className={`w-full rounded-t transition-colors ${isLast ? 'bg-[#F5A623]' : 'bg-[#3B82C4]/70 hover:bg-[#0B2560]'}`}
                    style={{ height: `${h}px` }}
                  />
                  <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                    {m.month}: {fmtINR(m.revenue)}
                  </div>
                  <span className="text-[9px] text-gray-400 truncate w-full text-center">{m.month}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-6 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#3B82C4]/70" /> Previous months
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#F5A623]" /> Current month
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
