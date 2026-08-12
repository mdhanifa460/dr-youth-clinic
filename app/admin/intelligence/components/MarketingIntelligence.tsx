'use client';

import { SectionHeader, HBarChart, DonutChart, InsightCard, fmtINR } from './Charts';

// Smart hardcoded data with realistic clinic marketing benchmarks
const LEAD_SOURCES = [
  { source: 'Google Search',   icon: '🔍', pct: 38, leads: 0, conv: 32, cpl: 420,  color: '#4285F4' },
  { source: 'Instagram',       icon: '📸', pct: 27, leads: 0, conv: 18, cpl: 280,  color: '#E1306C' },
  { source: 'WhatsApp',        icon: '💬', pct: 14, leads: 0, conv: 61, cpl: 80,   color: '#25D366' },
  { source: 'Facebook',        icon: '👥', pct: 10, leads: 0, conv: 14, cpl: 320,  color: '#1877F2' },
  { source: 'Walk-In',         icon: '🚶', pct: 7,  leads: 0, conv: 78, cpl: 0,    color: '#10B981' },
  { source: 'Website',         icon: '🌐', pct: 4,  leads: 0, conv: 22, cpl: 150,  color: '#8B5CF6' },
];

const CAMPAIGNS = [
  { name: 'Hydra Facial Summer Campaign', platform: 'Instagram', leads: 48, bookings: 12, revenue: 0, cpl: 260, conv: 25, status: 'active'   },
  { name: 'Hair PRP Awareness Drive',     platform: 'Google',    leads: 32, bookings: 9,  revenue: 0, cpl: 480, conv: 28, status: 'active'   },
  { name: 'Ramadan Skin Package',         platform: 'WhatsApp',  leads: 67, bookings: 41, revenue: 0, cpl: 60,  conv: 61, status: 'completed' },
  { name: 'Laser Hair Chennai Launch',    platform: 'Facebook',  leads: 21, bookings: 3,  revenue: 0, cpl: 340, conv: 14, status: 'paused'   },
];

export default function MarketingIntelligence({ data }: { data: any }) {
  const o = data?.overview || {};
  const totalMonthly = o.monthBookings || 100;
  const byLocation: any[] = data?.byLocation || [];

  const enrichedSources = LEAD_SOURCES.map(s => ({
    ...s,
    leads: Math.round((totalMonthly * (s.pct / 100)) / (s.conv / 100)),
    bookings: Math.round(totalMonthly * (s.pct / 100)),
  }));

  const enrichedCampaigns = CAMPAIGNS.map(c => ({
    ...c,
    revenue: c.bookings * Math.round((o.estimatedMonthRevenue || 5000) / Math.max(totalMonthly, 1)),
  }));

  const donutSources = enrichedSources.map(s => ({
    value: s.pct, color: s.color, label: s.source,
  }));

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Marketing Intelligence"
        subtitle="Lead source analysis, campaign performance, and ROI benchmarks. Benchmarked from clinic industry data."
        badge="Marketing Analytics"
      />

      {/* Location-wise Lead & Booking Performance — real Lead/Booking data,
          not a benchmark. Answers "which location gets the most leads/
          bookings and converts best" directly from the database. */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <p className="text-sm font-bold text-[#0B2560]">Location-wise Lead &amp; Booking Performance</p>
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Real Data</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                {['Location', 'Leads', 'Bookings', 'Bookings/Lead', 'Top Service'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {byLocation.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No data available for the selected period.</td></tr>
              )}
              {byLocation.map((l, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800 capitalize">{l.location}</td>
                  <td className="px-4 py-3 text-gray-700">{l.leads}</td>
                  <td className="px-4 py-3 text-gray-700">{l.count}</td>
                  <td className="px-4 py-3">
                    {l.conversionRate == null ? (
                      <span className="text-gray-400">—</span>
                    ) : (
                      // Deliberately not color-coded good/bad — this can
                      // legitimately read over 100% (most bookings don't
                      // originate from a Lead record at all, see footnote),
                      // so a green/red judgment would misrepresent it.
                      <span className="font-semibold text-gray-700">{l.conversionRate}%</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{l.topService || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 bg-gray-50/50 text-[11px] text-gray-500">
          Leads counted from Clinical Intake / Plan My Journey submissions, by preferred clinic. &quot;Bookings/Lead&quot; is bookings ÷ leads per location — it can read over 100% since most bookings (main booking page, homepage bar, AI chat) don&apos;t originate from a Lead record at all. Treat it as directional, not an exact per-patient conversion funnel.
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 flex items-start gap-2">
        <span className="shrink-0">💡</span>
        <span><strong>Sample data below.</strong> Lead source splits and campaign figures are illustrative industry benchmarks, not your actual tracked leads. Connect UTM tracking (coming soon) to see real channel/campaign attribution.</span>
      </div>

      {/* Lead source breakdown */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm font-bold text-[#0B2560] mb-4">Lead Sources</p>
          <DonutChart segments={donutSources} size={110} />
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm font-bold text-[#0B2560] mb-4">Conversion Rate by Source</p>
          <div className="space-y-3">
            {enrichedSources.sort((a, b) => b.conv - a.conv).map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-base w-6 shrink-0 text-center">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] font-medium text-gray-700">{s.source}</span>
                    <span className="text-[11px] font-bold text-gray-900">{s.conv}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${s.conv}%`, backgroundColor: s.color }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Source details table */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <p className="text-sm font-bold text-[#0B2560]">Channel Performance</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50">
                {['Channel', 'Share', 'Est. Leads', 'Est. Bookings', 'Conv. Rate', 'Cost/Lead'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {enrichedSources.map((s, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="font-medium text-gray-800">{s.source}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold text-[#0B2560]">{s.pct}%</td>
                  <td className="px-4 py-3 text-gray-700">{s.leads}</td>
                  <td className="px-4 py-3 text-gray-700">{s.bookings}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${s.conv >= 40 ? 'text-emerald-600' : s.conv >= 20 ? 'text-amber-600' : 'text-red-500'}`}>
                      {s.conv}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {s.cpl > 0 ? `₹${s.cpl}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Campaign performance */}
      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <p className="text-sm font-bold text-[#0B2560]">Recent Campaign Performance</p>
          <span className="text-xs text-gray-400">Benchmarked data</span>
        </div>
        <div className="divide-y divide-gray-50">
          {enrichedCampaigns.map((c, i) => (
            <div key={i} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-gray-800 truncate">{c.name}</p>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                      c.status === 'active'    ? 'bg-emerald-100 text-emerald-700' :
                      c.status === 'paused'   ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{c.status}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">{c.platform}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-extrabold text-[#0B2560]">{c.bookings}</p>
                  <p className="text-[10px] text-gray-400">bookings</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Leads',    value: c.leads },
                  { label: 'Conv.',    value: `${c.conv}%` },
                  { label: 'CPL',      value: `₹${c.cpl}` },
                  { label: 'Revenue',  value: fmtINR(c.revenue) },
                ].map((m, j) => (
                  <div key={j} className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-xs font-bold text-gray-800">{m.value}</p>
                    <p className="text-[10px] text-gray-400">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <InsightCard icon="💬" title="WhatsApp Has Highest Conversion"
          detail="WhatsApp leads convert at 61% vs 32% for Google — highest of all channels. Invest in WhatsApp broadcast lists for promotions."
          pill="Best Channel" pillColor="bg-emerald-50 text-emerald-700" />
        <InsightCard icon="📸" title="Instagram Drives Volume"
          detail="27% of leads come from Instagram at ₹280 CPL. Reels showcasing before/after results drive the best CTR."
          pill="Growth" pillColor="bg-pink-50 text-pink-700" />
        <InsightCard icon="🚶" title="Maximise Walk-In Conversion"
          detail="Walk-ins convert at 78% — your highest-quality lead. Offer a free skin consultation to walk-in visitors to convert them immediately."
          pill="Quick Win" pillColor="bg-amber-50 text-amber-700" />
      </div>
    </div>
  );
}
