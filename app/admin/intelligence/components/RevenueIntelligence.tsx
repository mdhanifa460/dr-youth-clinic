'use client';

import { SectionHeader, HBarChart, DonutChart, fmtINR, StatCard } from './Charts';

export default function RevenueIntelligence({ data }: { data: any }) {
  const o  = data?.overview || {};
  const m12 = data?.monthlyTrend12m || [];
  const byService = data?.byService || [];
  const byLoc = data?.byLocation || [];
  const gr = data?.forecast?.growthRate ?? 0;

  const catRevenue: Record<string, number> = {};
  for (const s of byService) {
    catRevenue[s.category] = (catRevenue[s.category] || 0) + s.revenue;
  }
  const catColors: Record<string, string> = {
    Skin: '#0B2560', Hair: '#3B82C4', Laser: '#F5A623', Other: '#94A3B8',
  };

  const topByRevenue = [...byService].sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  const maxRev = Math.max(...topByRevenue.map(s => s.revenue), 1);

  const prevMo  = m12[m12.length - 2] || { revenue: 0, count: 0 };
  const currMo  = m12[m12.length - 1] || { revenue: 0, count: 0 };
  const prevPrevMo = m12[m12.length - 3] || { revenue: 0 };
  const qRevenue = m12.slice(-3).reduce((s: number, m: any) => s + m.revenue, 0);
  const avgPerBooking = o.completedBookings
    ? Math.round(o.estimatedMonthRevenue / Math.max(o.monthBookings, 1))
    : 0;

  const locRevData = byLoc.map((l: any) => ({
    label: l.location.charAt(0).toUpperCase() + l.location.slice(1),
    value: l.revenue,
    sub:   fmtINR(l.revenue),
    color: '#0B2560',
  }));

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Revenue Intelligence"
        subtitle="Revenue analysis by time period, service, category, and clinic. Figures are estimated from service prices."
        badge="Revenue Analysis"
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="This Month (Est.)" value={fmtINR(o.estimatedMonthRevenue || 0)}
          sub={`${gr > 0 ? '+' : ''}${gr}% vs last month`}
          trend={gr > 0 ? 'up' : gr < 0 ? 'down' : 'neutral'} icon="💰" />
        <StatCard label="Last Month (Est.)" value={fmtINR(prevMo.revenue || 0)}
          sub={fmtINR(prevPrevMo.revenue || 0) + ' month before'} icon="📅" />
        <StatCard label="Quarterly Revenue" value={fmtINR(qRevenue)}
          sub="last 3 months" icon="📊" />
        <StatCard label="Avg Value / Booking" value={fmtINR(avgPerBooking)}
          sub={`${o.monthBookings || 0} bookings this month`} icon="💳" />
      </div>

      {/* Monthly revenue bar */}
      <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm font-bold text-[#0B2560]">Monthly Revenue — 12-Month View</p>
            <p className="text-xs text-gray-500">Estimated revenue based on service prices × bookings</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-extrabold text-[#0B2560]">{fmtINR(o.estimatedTotalRevenue || 0)}</p>
            <p className="text-xs text-gray-400">all-time total</p>
          </div>
        </div>
        <div className="flex items-end gap-1.5 h-28">
          {m12.map((m: any, i: number) => {
            const maxR = Math.max(...m12.map((x: any) => x.revenue), 1);
            const h = Math.max(4, (m.revenue / maxR) * 100);
            const isCurr = i === m12.length - 1;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                <span className="text-[9px] text-gray-600 font-medium opacity-0 group-hover:opacity-100 absolute -top-5">
                  {fmtINR(m.revenue)}
                </span>
                <div
                  className={`w-full rounded-t transition-all ${isCurr ? 'bg-[#F5A623]' : 'bg-[#3B82C4]/60 hover:bg-[#0B2560]'}`}
                  style={{ height: `${h}px` }}
                />
                <span className="text-[9px] text-gray-400 truncate w-full text-center">{m.month}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Revenue by service */}
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm font-bold text-[#0B2560] mb-4">Top Services by Revenue</p>
          <div className="space-y-3">
            {topByRevenue.map((s, i) => (
              <div key={i} className="group">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                    <span className="text-xs font-semibold text-gray-800 truncate">{s.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 shrink-0">{s.category}</span>
                  </div>
                  <span className="text-xs font-extrabold text-[#0B2560] shrink-0 ml-2">{fmtINR(s.revenue)}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#0B2560] to-[#3B82C4] transition-all duration-700"
                    style={{ width: `${(s.revenue / maxRev) * 100}%` }}
                  />
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[10px] text-gray-400">{s.count} bookings</span>
                  <span className="text-[10px] text-emerald-600">✓ {s.completionRate}% complete</span>
                </div>
              </div>
            ))}
            {topByRevenue.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No completed bookings yet</p>
            )}
          </div>
        </div>

        {/* Revenue by category + clinic */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm font-bold text-[#0B2560] mb-4">Revenue by Category</p>
            {Object.keys(catRevenue).length > 0 ? (
              <DonutChart
                segments={Object.entries(catRevenue).map(([cat, rev]) => ({
                  value: rev, color: catColors[cat] || '#94A3B8', label: cat,
                }))}
                size={100}
              />
            ) : (
              <p className="text-xs text-gray-400">No revenue data yet</p>
            )}
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm font-bold text-[#0B2560] mb-4">Revenue by Clinic</p>
            {locRevData.length > 0 ? (
              <HBarChart data={locRevData} />
            ) : (
              <p className="text-xs text-gray-400">No location data</p>
            )}
          </div>
        </div>
      </div>

      {/* Revenue growth insight */}
      <div className={`rounded-2xl p-5 border ${gr > 0 ? 'bg-emerald-50 border-emerald-200' : gr < -5 ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">{gr > 0 ? '📈' : gr < -5 ? '📉' : '➡️'}</span>
          <div>
            <p className={`text-sm font-bold ${gr > 0 ? 'text-emerald-800' : gr < -5 ? 'text-red-800' : 'text-blue-800'}`}>
              {gr > 0
                ? `Revenue growing at +${gr}% month-on-month`
                : gr < -5
                  ? `Revenue declined ${Math.abs(gr)}% this month — action needed`
                  : 'Revenue is stable this month'}
            </p>
            <p className={`text-xs mt-1 ${gr > 0 ? 'text-emerald-700' : gr < -5 ? 'text-red-700' : 'text-blue-700'}`}>
              {gr > 0
                ? `Current month: ${fmtINR(currMo.revenue)} vs last month: ${fmtINR(prevMo.revenue)}. Maintain momentum with consistent marketing.`
                : gr < -5
                  ? `Revenue fell from ${fmtINR(prevMo.revenue)} to ${fmtINR(currMo.revenue)}. Review marketing spend and identify dropped services.`
                  : `Revenue steady at ~${fmtINR(currMo.revenue)}/month. Opportunity to push higher with upsells and bundles.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
