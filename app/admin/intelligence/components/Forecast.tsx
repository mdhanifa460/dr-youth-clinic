'use client';

import { SectionHeader, SparkLine, fmtINR } from './Charts';

export default function Forecast({ data }: { data: any }) {
  const fc = data?.forecast || {};
  const o  = data?.overview || {};
  const m12 = data?.monthlyTrend12m || [];

  const { nextMonth = {}, growthRate = 0, trend = 'stable' } = fc;
  const { bookings: nextBookings = 0, revenue: nextRevenue = 0, confidence = 75 } = nextMonth;

  const trendLabel = trend === 'growing' ? '↑ Growing' : trend === 'declining' ? '↓ Declining' : '→ Stable';
  const trendColor = trend === 'growing' ? '#10B981' : trend === 'declining' ? '#EF4444' : '#F59E0B';

  const sparkCounts  = m12.map((m: any) => m.count);
  const sparkRevenue = m12.map((m: any) => m.revenue);

  const scenarioBase = nextBookings;
  const scenarioBull = Math.round(nextBookings * 1.15);
  const scenarioBear = Math.round(nextBookings * 0.85);

  const scenarios = [
    { label: 'Bear Case',  bookings: scenarioBear, revenue: Math.round(nextRevenue * 0.85), prob: 20, color: '#EF4444', desc: 'If cancellations rise or marketing slows' },
    { label: 'Base Case',  bookings: scenarioBase, revenue: nextRevenue,                    prob: 60, color: '#0B2560', desc: 'Most likely outcome based on current trend' },
    { label: 'Bull Case',  bookings: scenarioBull, revenue: Math.round(nextRevenue * 1.15), prob: 20, color: '#10B981', desc: 'If marketing campaign launches successfully' },
  ];

  const actions = trend === 'growing'
    ? ['Capitalise on growth — increase marketing spend', 'Hire additional staff to handle demand', 'Open bookings further in advance']
    : trend === 'declining'
      ? ['Launch immediate WhatsApp promotion campaign', 'Offer limited-time treatment discounts', 'Review and reactivate top services']
      : ['Maintain current marketing cadence', 'Focus on upselling to existing patients', 'Explore new service categories'];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Revenue & Booking Forecast"
        subtitle="AI-powered next-month predictions based on your 12-month booking trend and growth trajectory."
        badge="Predictive Analytics"
      />

      {/* Main forecast card */}
      <div className="bg-[#0B2560] rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#F5A623] mb-1">Next Month Forecast</p>
            <p className="text-sm text-white/60">Based on 12-month trend analysis</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold px-3 py-1 rounded-full text-white" style={{ backgroundColor: trendColor }}>
              {trendLabel} · {Math.abs(growthRate)}% MoM
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Projected Bookings',  value: nextBookings, sub: 'next month' },
            { label: 'Projected Revenue',   value: fmtINR(nextRevenue), sub: 'estimated' },
            { label: 'Confidence Score',    value: `${Math.round(confidence)}%`, sub: 'model accuracy' },
            { label: 'Growth vs This Mo.',  value: `${growthRate > 0 ? '+' : ''}${growthRate}%`, sub: 'trend direction' },
          ].map((m, i) => (
            <div key={i} className="bg-white/10 rounded-xl p-4 text-center">
              <p className="text-xl font-extrabold text-white">{m.value}</p>
              <p className="text-xs text-white/60 mt-1">{m.label}</p>
              <p className="text-[10px] text-white/40">{m.sub}</p>
            </div>
          ))}
        </div>

        {/* Confidence bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-white/70">Forecast Confidence</span>
            <span className="text-xs font-bold text-[#F5A623]">{Math.round(confidence)}%</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-[#F5A623] rounded-full transition-all duration-700"
              style={{ width: `${confidence}%` }} />
          </div>
          <p className="text-[10px] text-white/40 mt-1">
            {confidence >= 80 ? 'High confidence — consistent trend' : confidence >= 65 ? 'Moderate confidence — some variance' : 'Lower confidence — volatile recent data'}
          </p>
        </div>
      </div>

      {/* Scenarios */}
      <div className="grid md:grid-cols-3 gap-4">
        {scenarios.map((sc, i) => (
          <div key={i} className={`bg-white rounded-2xl p-5 shadow-sm ring-2 ${sc.label === 'Base Case' ? 'ring-[#0B2560]' : 'ring-gray-100'}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-800">{sc.label}</p>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: sc.color }}>
                {sc.prob}% prob.
              </span>
            </div>
            <p className="text-2xl font-extrabold mb-0.5" style={{ color: sc.color }}>{sc.bookings}</p>
            <p className="text-xs text-gray-500 mb-3">bookings · {fmtINR(sc.revenue)} revenue</p>
            <p className="text-[11px] text-gray-500 border-t border-gray-50 pt-3">{sc.desc}</p>
          </div>
        ))}
      </div>

      {/* Historical trend */}
      {m12.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm font-bold text-[#0B2560] mb-4">12-Month Booking Trend</p>
          <div className="flex items-end gap-1.5 h-32">
            {m12.map((m: any, i: number) => {
              const maxC = Math.max(...m12.map((x: any) => x.count), 1);
              const h = Math.max(4, (m.count / maxC) * 112);
              const isForecast = i === m12.length; // none in real data, just for illustration
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                  <div className="absolute -top-5 text-[9px] text-gray-600 opacity-0 group-hover:opacity-100 whitespace-nowrap">
                    {m.month}: {m.count}
                  </div>
                  <div className="w-full rounded-t" style={{ height: `${h}px`, backgroundColor: '#3B82C4' }} />
                  <span className="text-[9px] text-gray-400 truncate w-full text-center">{m.month}</span>
                </div>
              );
            })}
            {/* Forecast bar */}
            <div className="flex-1 flex flex-col items-center gap-1 relative">
              <div className="absolute -top-5 text-[9px] text-[#F5A623] font-bold whitespace-nowrap">
                Forecast: {nextBookings}
              </div>
              <div className="w-full rounded-t border-2 border-dashed border-[#F5A623] bg-[#F5A623]/20"
                style={{ height: `${Math.max(4, (nextBookings / Math.max(...m12.map((x: any) => x.count), nextBookings, 1)) * 112)}px` }} />
              <span className="text-[9px] text-[#F5A623] font-bold truncate w-full text-center">Next</span>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#3B82C4]" /> Historical</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded border-2 border-dashed border-[#F5A623] bg-[#F5A623]/20" /> Forecast</div>
          </div>
        </div>
      )}

      {/* Recommended actions */}
      <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
        <p className="text-sm font-bold text-[#0B2560] mb-4">
          Recommended Actions to Achieve {trend === 'growing' ? 'Bull Case' : trend === 'declining' ? 'Base Case' : 'Bull Case'}
        </p>
        <div className="space-y-2">
          {actions.map((a, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-[#f6faff] rounded-xl border border-[#e8eff7]">
              <div className="w-6 h-6 rounded-full bg-[#0B2560] text-white flex items-center justify-center text-xs font-bold shrink-0">
                {i + 1}
              </div>
              <p className="text-sm text-gray-700">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
