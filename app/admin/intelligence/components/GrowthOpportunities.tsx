'use client';

import { SectionHeader } from './Charts';

const PRIORITY_COLORS = {
  high:   { bg: 'bg-red-50',   badge: 'bg-red-100 text-red-700',   border: 'border-red-200',   label: 'High Priority' },
  medium: { bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-700', border: 'border-amber-200', label: 'Medium' },
  low:    { bg: 'bg-blue-50',  badge: 'bg-blue-100 text-blue-700',  border: 'border-blue-200',  label: 'Quick Win' },
};

// Universal hardcoded growth plays that apply to any aesthetic clinic
const EVERGREEN: any[] = [
  {
    id: 'birthday',
    icon: '🎂',
    priority: 'medium',
    title: 'Birthday & Anniversary Campaign',
    description: 'Patients who receive a personalised birthday offer convert at 3× the normal rate with higher average spend.',
    action: 'Send a "Happy Birthday — 20% off your next treatment" WhatsApp message 3 days before each patient\'s birthday.',
    potential: '₹15–30K extra per month',
  },
  {
    id: 'bundle',
    icon: '📦',
    priority: 'high',
    title: 'Treatment Bundle Packages',
    description: 'Bundling 3–5 sessions at a 15% discount increases average order value by 40% and reduces single-visit cancellations.',
    action: 'Create 3 bundles: Skin Glow Package (Hydra Facial × 3), Hair Revival Package (PRP × 4), and Laser Complete Package.',
    potential: '₹50–1.2L monthly uplift',
  },
  {
    id: 'referral',
    icon: '👨‍👩‍👧',
    priority: 'high',
    title: 'Patient Referral Programme',
    description: 'Referred patients have a 37% higher retention rate and 25% higher lifetime value than self-acquired patients.',
    action: 'Give existing patients a ₹500 clinic credit for every friend they refer who completes a treatment.',
    potential: '₹30–80K monthly',
  },
  {
    id: 'google-ads',
    icon: '🔍',
    priority: 'medium',
    title: 'Google Ads for High-Intent Keywords',
    description: '"Dermatologist near me" and "skin clinic [city]" keywords show purchase intent. CPC is ₹40–120 with 3–8% conversion.',
    action: 'Start with ₹15K/month Google Ads budget targeting your top 3 cities with booking-page landing pages.',
    potential: '25–40 new patients/month',
  },
  {
    id: 'subscription',
    icon: '🔄',
    priority: 'medium',
    title: 'Monthly Maintenance Subscriptions',
    description: 'Maintenance subscriptions create predictable recurring revenue and reduce patient churn by 60%.',
    action: 'Offer a ₹2,999/month "Glow Membership" — 1 Hydra Facial + 1 consultation + priority booking each month.',
    potential: '₹1–3L recurring monthly',
  },
];

export default function GrowthOpportunities({ data }: { data: any }) {
  const fromData   = data?.growthOpportunities || [];
  const all        = [...fromData, ...EVERGREEN.filter(e => !fromData.find((f: any) => f.id === e.id))];
  const highPrio   = all.filter((o: any) => o.priority === 'high');
  const medPrio    = all.filter((o: any) => o.priority === 'medium');
  const lowPrio    = all.filter((o: any) => o.priority === 'low');

  const Card = ({ opp }: { opp: any }) => {
    const cfg = PRIORITY_COLORS[opp.priority as keyof typeof PRIORITY_COLORS] || PRIORITY_COLORS.low;
    return (
      <div className={`${cfg.bg} border ${cfg.border} rounded-2xl p-5`}>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{opp.icon}</span>
            <p className="text-sm font-bold text-gray-900">{opp.title}</p>
          </div>
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed mb-3">{opp.description}</p>
        <div className="bg-white/70 rounded-xl p-3 mb-3">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Recommended Action</p>
          <p className="text-xs text-gray-800 leading-relaxed">{opp.action}</p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">💰</span>
            <span className="text-xs font-bold text-emerald-700">{opp.potential}</span>
          </div>
          <button className="text-xs font-bold text-[#0B2560] bg-white border border-[#0B2560]/20 hover:bg-[#0B2560] hover:text-white transition px-3 py-1.5 rounded-lg">
            Start Now →
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Growth Opportunities"
        subtitle="AI-identified revenue opportunities ranked by estimated impact on your clinic's monthly revenue."
        badge="Revenue Opportunities"
      />

      {/* Total potential */}
      <div className="bg-[#0B2560] rounded-2xl p-5 text-white">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5A623] mb-2">Total Growth Potential</p>
        <p className="text-3xl font-extrabold">₹3–8 Lakhs</p>
        <p className="text-sm text-white/70 mt-1">additional monthly revenue if all high-priority opportunities are executed</p>
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: 'High Priority', count: highPrio.length, color: 'text-red-400' },
            { label: 'Medium',        count: medPrio.length,  color: 'text-amber-400' },
            { label: 'Quick Wins',    count: lowPrio.length,  color: 'text-blue-400' },
          ].map((s, i) => (
            <div key={i} className="bg-white/10 rounded-xl p-3 text-center">
              <p className={`text-lg font-extrabold ${s.color}`}>{s.count}</p>
              <p className="text-[10px] text-white/60">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {highPrio.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-bold text-red-700 flex items-center gap-1.5">
            🔥 High Priority — Highest Revenue Impact
          </p>
          {highPrio.map((opp: any) => <Card key={opp.id} opp={opp} />)}
        </div>
      )}

      {medPrio.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-bold text-amber-700 flex items-center gap-1.5">
            ⭐ Medium Priority — Strong ROI
          </p>
          {medPrio.map((opp: any) => <Card key={opp.id} opp={opp} />)}
        </div>
      )}

      {lowPrio.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-bold text-blue-700 flex items-center gap-1.5">
            💡 Quick Wins — Low Effort, Good Returns
          </p>
          {lowPrio.map((opp: any) => <Card key={opp.id} opp={opp} />)}
        </div>
      )}

      {/* Growth roadmap */}
      <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
        <p className="text-sm font-bold text-[#0B2560] mb-4">90-Day Growth Roadmap</p>
        <div className="space-y-3">
          {[
            { phase: 'Week 1–2',  title: 'Quick Wins',      desc: 'Launch referral programme, send re-engagement campaign to inactive patients, request Google reviews via WhatsApp.' },
            { phase: 'Week 3–4',  title: 'Revenue Boost',   desc: 'Create and promote treatment bundles. Start birthday campaign automation. Offer first-month subscription.' },
            { phase: 'Month 2',   title: 'Marketing Push',  desc: 'Launch Google Ads for top 3 keywords per city. Post 3× weekly on Instagram with before/after content.' },
            { phase: 'Month 3',   title: 'Scale & Retain',  desc: 'Analyse results, double budget on best-performing channels, launch VIP loyalty programme.' },
          ].map((r, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-[#f6faff] border border-[#e8eff7]">
              <div className="w-20 shrink-0">
                <p className="text-[10px] font-bold text-[#F5A623] uppercase">{r.phase}</p>
                <p className="text-xs font-bold text-[#0B2560]">{r.title}</p>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
