'use client';

import { SectionHeader, ProgressBar, InsightCard } from './Charts';

export default function DoctorPerformance({ data }: { data: any }) {
  const doctors = data?.doctors || [];
  const o = data?.overview || {};
  const byService = data?.byService || [];
  const byLoc = data?.byLocation || [];

  const activeDocs = doctors.filter((d: any) => d.active);
  const totalBookings = o.totalBookings || 1;

  // Since bookings aren't linked to doctors, distribute bookings across locations
  const enrichedDoctors = activeDocs.map((doc: any, i: number) => {
    const docLocs = doc.locations?.filter((l: string) => l !== 'all') || [];
    const locCount = byLoc.filter((l: any) => docLocs.includes(l.location))
      .reduce((s: number, l: any) => s + l.count, 0);
    const locRevenue = byLoc.filter((l: any) => docLocs.includes(l.location))
      .reduce((s: number, l: any) => s + l.revenue, 0);
    const avgRating = byLoc.filter((l: any) => docLocs.includes(l.location))
      .reduce((s: number, l: any, _, arr) => s + l.avgRating / arr.length, 0);
    const docsInSameLocs = activeDocs.filter((d: any) =>
      d.locations?.some((l: string) => docLocs.includes(l))
    ).length || 1;

    return {
      ...doc,
      estBookings: Math.round(locCount / docsInSameLocs),
      estRevenue:  Math.round(locRevenue / docsInSameLocs),
      avgRating:   Math.round((avgRating || 4.5) * 10) / 10,
      locationLabels: doc.locations?.includes('all')
        ? ['Chennai', 'Bangalore', 'Coimbatore', 'Kochi']
        : doc.locations?.map((l: string) => l.charAt(0).toUpperCase() + l.slice(1)) || [],
    };
  }).sort((a: any, b: any) => b.estBookings - a.estBookings);

  const maxBookings = Math.max(...enrichedDoctors.map((d: any) => d.estBookings), 1);
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Doctor Performance"
        subtitle="Performance overview across all active doctors. Bookings are estimated by location share."
        badge="Team Performance"
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Active Doctors',  value: o.activeDoctors  ?? 0, icon: '👨‍⚕️' },
          { label: 'Total Doctors',   value: o.totalDoctors   ?? 0, icon: '🏥' },
          { label: 'Active Clinics',  value: o.activeClinics  ?? 0, icon: '📍' },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-gray-100 text-center">
            <span className="text-2xl">{k.icon}</span>
            <p className="text-xl font-extrabold text-[#0B2560] mt-1">{k.value}</p>
            <p className="text-xs text-gray-500">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Leaderboard */}
      {enrichedDoctors.length > 0 ? (
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-[#0B2560]">Doctor Leaderboard</p>
            <span className="text-xs text-gray-400 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium">Est. from location data</span>
          </div>
          <div className="space-y-4">
            {enrichedDoctors.map((doc: any, i: number) => (
              <div key={i} className={`rounded-xl p-4 border ${i === 0 ? 'bg-[#f6faff] border-[#0B2560]/20' : 'border-gray-100'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0B2560] to-[#3B82C4] flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {doc.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[#0B2560] truncate">{doc.name}</p>
                      {i < 3 && <span>{medals[i]}</span>}
                    </div>
                    <p className="text-[11px] text-gray-500">{doc.title}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-extrabold text-[#0B2560]">{doc.estBookings}</p>
                    <p className="text-[10px] text-gray-400">est. bookings</p>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-gray-500">Booking Share</span>
                      <span className="text-[10px] font-semibold text-gray-700">
                        {Math.round((doc.estBookings / maxBookings) * 100)}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${i === 0 ? 'bg-[#F5A623]' : 'bg-[#3B82C4]'}`}
                        style={{ width: `${(doc.estBookings / maxBookings) * 100}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-400">Experience:</span>
                      <span className="text-[10px] font-semibold text-gray-700">{doc.experience}+ yrs</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-400">Rating:</span>
                      <span className="text-[10px] font-semibold text-amber-600">★ {doc.avgRating}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {doc.locationLabels.slice(0, 3).map((l: string, j: number) => (
                        <span key={j} className="text-[9px] bg-[#e8eff7] text-[#0B2560] px-1.5 py-0.5 rounded font-medium">{l}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-8 shadow-sm ring-1 ring-gray-100 text-center">
          <span className="text-4xl">👨‍⚕️</span>
          <p className="text-sm text-gray-500 mt-3">No doctors added yet. Add doctors in the Doctors section.</p>
        </div>
      )}

      {/* Insights */}
      <div className="grid md:grid-cols-2 gap-4">
        <InsightCard icon="📊" title="Track Doctor-Level Bookings"
          detail="Connect bookings to doctors via the booking form to unlock per-doctor revenue, completion rate, and patient satisfaction scores."
          pill="Enhancement" pillColor="bg-blue-50 text-blue-700" />
        <InsightCard icon="🎯" title="Doctor Specialisation Mapping"
          detail={`You have ${activeDocs.length} active doctors across ${o.activeClinics ?? 0} clinics. Ensure each location has coverage for Skin, Hair, and Laser treatments.`}
          pill="Operational" pillColor="bg-purple-50 text-purple-700" />
      </div>
    </div>
  );
}
