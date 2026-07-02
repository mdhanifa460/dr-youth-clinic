'use client';

import { SectionHeader, InsightCard, HBarChart, fmtINR } from './Charts';

const UPSELLS: Record<string, string> = {
  'hydra facial':    'Chemical Peel → Botox → Maintenance Package',
  'hair prp':        'GFC Therapy → Hair Supplements → Transplant Consult',
  'laser hair':      'Skin Brightening → Maintenance Laser Package',
  'chemical peel':   'Hydra Facial → Dermal Filler → Skin Booster',
  'acne treatment':  'Chemical Peel → Pigmentation Laser → Skin Booster',
  'prp therapy':     'GFC → Mesotherapy → Maintenance PRP',
  'skin booster':    'Hydra Facial → Chemical Peel → LED Therapy',
};

function getUpsell(name: string) {
  const key = name.toLowerCase();
  for (const [k, v] of Object.entries(UPSELLS)) {
    if (key.includes(k.split(' ')[0])) return v;
  }
  return 'Complementary Treatment → Maintenance Package';
}

export default function TreatmentIntelligence({ data }: { data: any }) {
  const byService = data?.byService || [];
  const o = data?.overview || {};

  const topBooked   = byService.slice(0, 10);
  const topRevenue  = [...byService].sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 6);
  const highCancel  = byService.filter((s: any) => s.cancellationRate > 25).slice(0, 3);
  const highCompl   = byService.filter((s: any) => s.completionRate > 80).slice(0, 3);

  const catCounts: Record<string, number> = {};
  for (const s of byService) catCounts[s.category] = (catCounts[s.category] || 0) + s.count;

  const catColors: Record<string, string> = {
    Skin: '#0B2560', Hair: '#3B82C4', Laser: '#F5A623', Other: '#94A3B8',
  };

  const dominantCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Skin';

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Treatment Intelligence"
        subtitle="Identify your most profitable treatments, repeat patterns, and upsell opportunities."
        badge="Treatment Analysis"
      />

      {/* Summary row */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: 'Services Booked',  value: byService.length, icon: '🩺' },
          { label: 'Most Popular Cat', value: dominantCat,       icon: '🏆' },
          { label: 'Avg Completion',   value: byService.length ? `${Math.round(byService.reduce((s: number, x: any) => s + x.completionRate, 0) / byService.length)}%` : 'N/A', icon: '✅' },
          { label: 'Avg Cancellation', value: byService.length ? `${Math.round(byService.reduce((s: number, x: any) => s + x.cancellationRate, 0) / byService.length)}%` : 'N/A', icon: '❌' },
          { label: 'Total Bookings',   value: o.totalBookings ?? 0, icon: '📋' },
          { label: 'Unique Services',  value: byService.length, icon: '💊' },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-xl p-3 shadow-sm ring-1 ring-gray-100 text-center">
            <span className="text-xl">{k.icon}</span>
            <p className="text-sm font-extrabold text-[#0B2560] mt-1">{k.value}</p>
            <p className="text-[10px] text-gray-500 leading-tight">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Most booked */}
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm font-bold text-[#0B2560] mb-4">Most Booked Treatments</p>
          {topBooked.length > 0 ? (
            <div className="space-y-2.5">
              {topBooked.map((s: any, i: number) => {
                const maxC = topBooked[0].count || 1;
                return (
                  <div key={i} className="group">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-[#F5A623] w-5 shrink-0">#{i + 1}</span>
                      <span className="text-xs font-semibold text-gray-800 flex-1 truncate">{s.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: catColors[s.category] + '20', color: catColors[s.category] }}>{s.category}</span>
                      <span className="text-xs font-bold text-gray-700 shrink-0">{s.count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#0B2560] rounded-full transition-all duration-700"
                        style={{ width: `${(s.count / maxC) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">No booking data yet</p>
          )}
        </div>

        {/* Highest revenue */}
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm font-bold text-[#0B2560] mb-4">Top Revenue Treatments</p>
          {topRevenue.filter((s: any) => s.revenue > 0).length > 0 ? (
            <HBarChart data={topRevenue.filter((s: any) => s.revenue > 0).map((s: any) => ({
              label: s.name,
              value: s.revenue,
              sub:   fmtINR(s.revenue),
              color: catColors[s.category] || '#0B2560',
            }))} />
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <span className="text-3xl mb-2">💡</span>
              <p className="text-xs text-gray-500">Set service prices in the Services module<br />to see revenue estimates here.</p>
            </div>
          )}
        </div>
      </div>

      {/* Categories breakdown */}
      <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
        <p className="text-sm font-bold text-[#0B2560] mb-4">Bookings by Category</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(catCounts).map(([cat, count]) => {
            const total = Object.values(catCounts).reduce((s, v) => s + v, 0) || 1;
            const pct = Math.round((count / total) * 100);
            return (
              <div key={cat} className="rounded-xl p-4 border-2 text-center transition-all"
                style={{ borderColor: catColors[cat] + '40', backgroundColor: catColors[cat] + '08' }}>
                <p className="text-2xl font-extrabold" style={{ color: catColors[cat] }}>{pct}%</p>
                <p className="text-xs font-bold text-gray-700 mt-1">{cat}</p>
                <p className="text-[11px] text-gray-500">{count} bookings</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Completion & cancellation insights */}
      <div className="grid md:grid-cols-2 gap-4">
        {highCompl.length > 0 && (
          <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-200">
            <p className="text-sm font-bold text-emerald-800 mb-3">✅ High-Completion Treatments</p>
            <div className="space-y-2">
              {highCompl.map((s: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-white rounded-xl px-3 py-2">
                  <span className="text-xs font-semibold text-gray-800 truncate max-w-[60%]">{s.name}</span>
                  <span className="text-xs font-bold text-emerald-600">{s.completionRate}% complete</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-emerald-700 mt-3">These treatments have strong patient follow-through — prioritise in marketing.</p>
          </div>
        )}

        {highCancel.length > 0 && (
          <div className="bg-red-50 rounded-2xl p-5 border border-red-200">
            <p className="text-sm font-bold text-red-800 mb-3">⚠️ High-Cancellation Treatments</p>
            <div className="space-y-2">
              {highCancel.map((s: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-white rounded-xl px-3 py-2">
                  <span className="text-xs font-semibold text-gray-800 truncate max-w-[60%]">{s.name}</span>
                  <span className="text-xs font-bold text-red-600">{s.cancellationRate}% cancel</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-red-700 mt-3">Review pricing, preparation requirements, or patient expectations for these treatments.</p>
          </div>
        )}
      </div>

      {/* Upsell suggestions */}
      {topBooked.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm font-bold text-[#0B2560] mb-1">AI Suggested Upsell Journeys</p>
          <p className="text-xs text-gray-500 mb-4">Based on your most booked treatments and common patient journeys</p>
          <div className="space-y-3">
            {topBooked.slice(0, 4).map((s: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-[#f6faff] rounded-xl border border-[#e8eff7]">
                <span className="text-sm font-bold text-[#0B2560] bg-[#e8eff7] rounded-lg px-2.5 py-1 shrink-0">{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#0B2560]">{s.name}</p>
                  <p className="text-[11px] text-[#3B82C4] mt-0.5">→ {getUpsell(s.name)}</p>
                </div>
                <span className="ml-auto text-[10px] text-gray-400 shrink-0">{s.count} patients</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
