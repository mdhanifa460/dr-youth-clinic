'use client';

import { SectionHeader, HBarChart, fmtINR } from './Charts';

const LOC_ICONS: Record<string, string> = {
  chennai: '🌊', bangalore: '🌆', coimbatore: '🏔️', kochi: '⛵',
};

export default function ClinicPerformance({ data }: { data: any }) {
  const byLoc = data?.byLocation || [];
  const o = data?.overview || {};
  const total = o.totalBookings || 1;

  const sorted = [...byLoc].sort((a: any, b: any) => b.count - a.count);
  const topLoc = sorted[0];
  const maxCount = Math.max(...sorted.map((l: any) => l.count), 1);
  const maxRev   = Math.max(...sorted.map((l: any) => l.revenue), 1);

  const ALL_LOCS = ['chennai', 'bangalore', 'coimbatore', 'kochi'];
  const missingLocs = ALL_LOCS.filter(loc => !byLoc.some((l: any) => l.location === loc));

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Clinic Performance"
        subtitle="Compare revenue, bookings, ratings, and team size across all DR Youth Clinic branches."
        badge="Branch Analytics"
      />

      {/* Location cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {sorted.length > 0 ? sorted.map((loc: any, i: number) => {
          const isTop = i === 0;
          const share = Math.round((loc.count / total) * 100);
          const cap = loc.location.charAt(0).toUpperCase() + loc.location.slice(1);
          return (
            <div key={loc.location} className={`rounded-2xl p-5 shadow-sm ring-1 ${isTop ? 'bg-[#0B2560] text-white ring-[#0B2560]' : 'bg-white ring-gray-100'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{LOC_ICONS[loc.location] || '📍'}</span>
                  <div>
                    <p className={`font-extrabold text-base ${isTop ? 'text-white' : 'text-[#0B2560]'}`}>{cap}</p>
                    {isTop && <span className="text-[10px] text-[#F5A623] font-bold uppercase tracking-wider">Top Performer</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-extrabold ${isTop ? 'text-[#F5A623]' : 'text-[#0B2560]'}`}>{share}%</p>
                  <p className={`text-[10px] ${isTop ? 'text-white/70' : 'text-gray-400'}`}>booking share</p>
                </div>
              </div>

              <div className={`grid grid-cols-3 gap-3 mb-3 pb-3 border-b ${isTop ? 'border-white/20' : 'border-gray-100'}`}>
                {[
                  { label: 'Bookings',  value: loc.count },
                  { label: 'Revenue',   value: fmtINR(loc.revenue) },
                  { label: 'Services',  value: loc.services },
                ].map((m, j) => (
                  <div key={j} className="text-center">
                    <p className={`text-sm font-extrabold ${isTop ? 'text-white' : 'text-[#0B2560]'}`}>{m.value}</p>
                    <p className={`text-[10px] ${isTop ? 'text-white/60' : 'text-gray-400'}`}>{m.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4">
                {loc.avgRating > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-sm">⭐</span>
                    <span className={`text-xs font-bold ${isTop ? 'text-[#F5A623]' : 'text-amber-600'}`}>{loc.avgRating}</span>
                    <span className={`text-[10px] ${isTop ? 'text-white/60' : 'text-gray-400'}`}>({loc.reviewCount} reviews)</span>
                  </div>
                )}
                {loc.doctors > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-sm">👨‍⚕️</span>
                    <span className={`text-xs font-bold ${isTop ? 'text-white' : 'text-gray-700'}`}>{loc.doctors} doctors</span>
                  </div>
                )}
              </div>

              {/* Booking share bar */}
              <div className="mt-3">
                <div className={`h-1.5 rounded-full overflow-hidden ${isTop ? 'bg-white/20' : 'bg-gray-100'}`}>
                  <div className={`h-full rounded-full ${isTop ? 'bg-[#F5A623]' : 'bg-[#3B82C4]'}`}
                    style={{ width: `${(loc.count / maxCount) * 100}%` }} />
                </div>
              </div>
            </div>
          );
        }) : (
          <div className="md:col-span-2 bg-white rounded-2xl p-8 shadow-sm ring-1 ring-gray-100 text-center">
            <span className="text-4xl">🏥</span>
            <p className="text-sm text-gray-500 mt-3">No booking location data yet.</p>
          </div>
        )}

        {/* Missing locations — placeholders */}
        {missingLocs.map(loc => (
          <div key={loc} className="rounded-2xl p-5 bg-gray-50 ring-1 ring-gray-100 border border-dashed border-gray-200">
            <div className="flex items-center gap-2 mb-3 opacity-50">
              <span className="text-2xl">{LOC_ICONS[loc] || '📍'}</span>
              <p className="font-bold text-gray-500">{loc.charAt(0).toUpperCase() + loc.slice(1)}</p>
            </div>
            <p className="text-xs text-gray-400">No bookings recorded for this location yet.</p>
            <p className="text-[11px] text-[#3B82C4] mt-2 font-medium">→ Add services and enable bookings for this branch</p>
          </div>
        ))}
      </div>

      {/* Comparison chart */}
      {sorted.length > 1 && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm font-bold text-[#0B2560] mb-4">Bookings by Branch</p>
            <HBarChart data={sorted.map((l: any) => ({
              label: l.location.charAt(0).toUpperCase() + l.location.slice(1),
              value: l.count,
              sub: `${l.count} (${Math.round((l.count / total) * 100)}%)`,
              color: '#0B2560',
            }))} />
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm font-bold text-[#0B2560] mb-4">Revenue by Branch</p>
            <HBarChart data={sorted.map((l: any) => ({
              label: l.location.charAt(0).toUpperCase() + l.location.slice(1),
              value: l.revenue,
              sub: fmtINR(l.revenue),
              color: '#F5A623',
            }))} />
          </div>
        </div>
      )}

      {/* Insights */}
      {topLoc && (
        <div className="bg-[#f6faff] rounded-2xl p-5 border border-[#e8eff7]">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-sm font-bold text-[#0B2560]">
                {topLoc.location.charAt(0).toUpperCase() + topLoc.location.slice(1)} is your top-performing clinic
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Handling {Math.round((topLoc.count / total) * 100)}% of all bookings ({topLoc.count} total) with
                {topLoc.avgRating > 0 ? ` a ${topLoc.avgRating}/5 average rating.` : ' strong booking volume.'}
                {' '}Apply its best practices across other branches.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
