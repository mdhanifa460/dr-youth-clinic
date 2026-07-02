'use client';

import { SectionHeader, DonutChart, ProgressBar, InsightCard } from './Charts';

export default function PatientIntelligence({ data }: { data: any }) {
  const o   = data?.overview   || {};
  const ps  = data?.patientSegments || {};
  const top = ps.topPatients || [];

  const total = ps.totalUnique || 1;
  const retentionPct   = Math.round((ps.returning  / total) * 100) || 0;
  const newPct         = Math.round((ps.new        / total) * 100) || 0;
  const vipPct         = Math.round((ps.vip        / total) * 100) || 0;
  const inactivePct    = Math.round((ps.inactive   / total) * 100) || 0;

  const donutSegments = [
    { value: ps.new      || 0, color: '#3B82F6',  label: 'New' },
    { value: ps.returning || 0, color: '#10B981', label: 'Returning' },
    { value: ps.vip      || 0, color: '#8B5CF6',  label: 'VIP' },
    { value: ps.inactive || 0, color: '#F59E0B',  label: 'Inactive' },
  ].filter(s => s.value > 0);

  // Sample patient journey (typical for aesthetics clinics)
  const JOURNEY = [
    { step: 'Consultation',    icon: '🤝', desc: 'First visit — skin assessment, treatment plan' },
    { step: 'Initial Treatment', icon: '💉', desc: 'Hydra Facial / Hair PRP / Laser session' },
    { step: 'Follow-up',       icon: '📋', desc: '2–4 weeks later — progress review' },
    { step: 'Repeat Treatment',icon: '🔄', desc: 'Maintenance or second service' },
    { step: 'Package Upgrade', icon: '👑', desc: 'Multi-session package or new category' },
    { step: 'VIP Patient',     icon: '⭐', desc: '3+ visits — highest lifetime value' },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Patient Intelligence"
        subtitle="Understand patient behaviour, retention, lifetime value, and treatment journeys."
        badge="Patient Analytics"
      />

      {/* Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Unique Patients',   value: o.uniquePatients ?? 0, color: '#0B2560', sub: 'all time' },
          { label: 'Returning Patients',       value: ps.returning ?? 0,    color: '#10B981', sub: `${retentionPct}% retention` },
          { label: 'VIP (3+ visits)',          value: ps.vip ?? 0,          color: '#8B5CF6', sub: `${vipPct}% of base` },
          { label: 'Inactive (90d+)',          value: ps.inactive ?? 0,     color: '#F59E0B', sub: `${inactivePct}% at risk` },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-gray-100 text-center">
            <p className="text-2xl font-extrabold" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs font-semibold text-gray-700 mt-1 leading-snug">{k.label}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Segmentation donut */}
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm font-bold text-[#0B2560] mb-4">Patient Segmentation</p>
          {donutSegments.length > 0 ? (
            <DonutChart segments={donutSegments} size={120} />
          ) : (
            <p className="text-xs text-gray-400 text-center py-6">No patient data yet</p>
          )}
          <div className="mt-4 pt-4 border-t border-gray-50">
            <p className="text-xs text-gray-600 font-medium">Retention Health</p>
            <ProgressBar value={retentionPct} max={100} color="#10B981"
              label={`${retentionPct}% retention rate`} />
            <p className="text-[11px] text-gray-400 mt-1">
              Industry benchmark: 60%+ · {retentionPct >= 60 ? '✅ On target' : '⚠️ Below target — launch loyalty campaign'}
            </p>
          </div>
        </div>

        {/* Metrics */}
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100 space-y-4">
          <p className="text-sm font-bold text-[#0B2560]">Key Retention Metrics</p>
          {[
            { label: 'Avg Bookings / Patient', value: ps.avgBookingsPerPatient ?? 0, suffix: 'visits', good: 2, target: 4 },
            { label: 'Retention Rate',         value: retentionPct, suffix: '%', good: 50, target: 70 },
            { label: 'VIP Rate',               value: vipPct, suffix: '%', good: 10, target: 20 },
            { label: 'Churn Risk',             value: inactivePct, suffix: '%', good: 100, target: 100, invert: true },
          ].map((m, i) => {
            const isGood = m.invert ? m.value < 30 : m.value >= m.good;
            return (
              <div key={i} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">{m.label}</span>
                    <span className="text-xs font-bold text-gray-900">{m.value}{m.suffix}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${isGood ? 'bg-emerald-400' : 'bg-amber-400'}`}
                      style={{ width: `${Math.min(100, m.invert ? Math.max(0, 100 - m.value) : m.value)}%` }} />
                  </div>
                </div>
                <span className="ml-3 text-sm">{isGood ? '✅' : '⚠️'}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Patient Journey */}
      <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
        <p className="text-sm font-bold text-[#0B2560] mb-1">Typical Patient Journey</p>
        <p className="text-xs text-gray-500 mb-5">How patients typically progress at DR Youth Clinic</p>
        <div className="relative">
          <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-100" />
          <div className="space-y-4">
            {JOURNEY.map((step, i) => (
              <div key={i} className="relative flex items-start gap-4">
                <div className="relative z-10 w-10 h-10 rounded-full bg-[#0B2560] flex items-center justify-center shrink-0 text-lg shadow-md">
                  {step.icon}
                </div>
                <div className="bg-[#f6faff] rounded-xl p-3 flex-1 border border-[#e8eff7]">
                  <p className="text-xs font-bold text-[#0B2560]">{step.step}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top patients */}
      {top.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-[#0B2560]">Your Most Loyal Patients</p>
            <span className="text-xs text-gray-400">(phone masked for privacy)</span>
          </div>
          <div className="space-y-2">
            {top.slice(0, 8).map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[#f6faff] border border-[#e8eff7]">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                  i === 0 ? 'bg-[#F5A623]' : i < 3 ? 'bg-[#3B82C4]' : 'bg-[#0B2560]'
                }`}>
                  {i < 3 ? ['👑', '🥈', '🥉'][i] : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800">{p.phone}</p>
                  <p className="text-[11px] text-gray-400 truncate">{p.services.slice(0, 2).join(', ')}{p.services.length > 2 ? ` +${p.services.length - 2}` : ''}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-extrabold text-[#0B2560]">{p.count}</p>
                  <p className="text-[10px] text-gray-400">visits</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Retention strategy */}
      <div className="grid md:grid-cols-3 gap-4">
        <InsightCard icon="💌" title="Re-engage Inactive Patients"
          detail={`${ps.inactive ?? 0} patients haven't visited in 90+ days. Send a personalised WhatsApp with a 15% comeback offer.`}
          pill="High Impact" pillColor="bg-amber-50 text-amber-700" />
        <InsightCard icon="👑" title="Launch VIP Programme"
          detail={`Only ${ps.vip ?? 0} VIP patients currently. A 3-tier loyalty programme (Silver/Gold/Platinum) could 3× this number.`}
          pill="Growth" pillColor="bg-purple-50 text-purple-700" />
        <InsightCard icon="🎂" title="Birthday & Anniversary Campaigns"
          detail="Patients who receive personalised birthday offers convert at 3× the normal rate. Set up automated birthday discounts."
          pill="Quick Win" pillColor="bg-emerald-50 text-emerald-700" />
      </div>
    </div>
  );
}
