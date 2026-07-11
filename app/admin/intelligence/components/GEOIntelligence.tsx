'use client';

import { SectionHeader, ProgressBar, InsightCard } from './Charts';

const AI_PLATFORMS = [
  { name: 'Google AI Overview', icon: '🔮', mentions: 12, trending: true,  coverage: 68, color: '#4285F4' },
  { name: 'ChatGPT',            icon: '🤖', mentions: 7,  trending: true,  coverage: 42, color: '#10A37F' },
  { name: 'Google Gemini',      icon: '💎', mentions: 9,  trending: true,  coverage: 55, color: '#8B5CF6' },
  { name: 'Perplexity',         icon: '🔭', mentions: 4,  trending: false, coverage: 28, color: '#F59E0B' },
  { name: 'Bing Copilot',       icon: '🔵', mentions: 3,  trending: false, coverage: 22, color: '#0078D4' },
];

const AI_QUESTIONS = [
  { q: 'Best skin clinic in Chennai?',           answered: true,  platform: 'Google AI' },
  { q: 'Hair PRP treatment cost in Chennai?',    answered: true,  platform: 'ChatGPT'   },
  { q: 'Is hydra facial safe for acne?',         answered: true,  platform: 'Gemini'    },
  { q: 'Best dermatologist in Bangalore?',       answered: false, platform: 'ChatGPT'   },
  { q: 'Laser hair removal permanent or not?',   answered: true,  platform: 'Perplexity'},
  { q: 'Chemical peel recovery time?',           answered: false, platform: 'Google AI' },
  { q: 'GFC vs PRP for hair loss?',              answered: false, platform: 'ChatGPT'   },
  { q: 'Skin clinic near me in Coimbatore?',     answered: false, platform: 'Gemini'    },
];

const SERVICES_VISIBILITY = [
  { service: 'Hydra Facial',    visibility: 78 },
  { service: 'Hair PRP',        visibility: 61 },
  { service: 'Laser Hair',      visibility: 55 },
  { service: 'Acne Treatment',  visibility: 48 },
  { service: 'Botox',           visibility: 34 },
  { service: 'Chemical Peel',   visibility: 29 },
];

export default function GEOIntelligence({ data }: { data: any }) {
  const totalMentions = AI_PLATFORMS.reduce((s, p) => s + p.mentions, 0);
  const avgCoverage   = Math.round(AI_PLATFORMS.reduce((s, p) => s + p.coverage, 0) / AI_PLATFORMS.length);
  const unanswered    = AI_QUESTIONS.filter(q => !q.answered).length;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="GEO & AEO Intelligence"
        subtitle="AI Search Visibility — how DR Youth Clinic appears in ChatGPT, Gemini, and Google AI Overview answers."
        badge="AI Search Visibility"
      />

      <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-xs text-purple-800 flex items-start gap-2">
        <span className="shrink-0">🤖</span>
        <span><strong>Sample data.</strong> <strong>GEO</strong> (Generative Engine Optimisation) is the new SEO — 40% of users now get answers directly from AI without clicking a website. The figures below are illustrative, not live-tracked mentions. No AI-visibility monitoring is connected yet.</span>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'AI Mentions',      value: totalMentions, icon: '💬', color: '#8B5CF6' },
          { label: 'Avg AI Coverage',  value: `${avgCoverage}%`, icon: '🎯', color: '#0B2560' },
          { label: 'Questions Answered', value: AI_QUESTIONS.filter(q => q.answered).length, icon: '✅', color: '#10B981' },
          { label: 'Gaps to Fill',     value: unanswered, icon: '⚠️', color: '#F59E0B' },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-gray-100 text-center">
            <span className="text-xl">{k.icon}</span>
            <p className="text-lg font-extrabold mt-1" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs text-gray-500">{k.label}</p>
          </div>
        ))}
      </div>

      {/* AI Platform breakdown */}
      <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
        <p className="text-sm font-bold text-[#0B2560] mb-4">AI Platform Coverage</p>
        <div className="space-y-4">
          {AI_PLATFORMS.map((p, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xl w-8 shrink-0">{p.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-800">{p.name}</span>
                    {p.trending && <span className="text-[9px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded-full">TRENDING</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{p.mentions} mentions</span>
                    <span className="text-xs font-bold text-gray-900">{p.coverage}%</span>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${p.coverage}%`, backgroundColor: p.color }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* AI Questions */}
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm font-bold text-[#0B2560] mb-4">Top AI Questions in Your Space</p>
          <div className="space-y-2">
            {AI_QUESTIONS.map((q, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${
                q.answered ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'
              }`}>
                <span className="text-sm shrink-0 mt-0.5">{q.answered ? '✅' : '⚠️'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-gray-800">{q.q}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{q.platform}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Service visibility */}
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm font-bold text-[#0B2560] mb-4">AI Visibility by Service</p>
          <div className="space-y-3">
            {SERVICES_VISIBILITY.map((s, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700">{s.service}</span>
                  <span className={`text-xs font-bold ${s.visibility >= 60 ? 'text-emerald-600' : s.visibility >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                    {s.visibility}%
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${s.visibility >= 60 ? 'bg-emerald-400' : s.visibility >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ width: `${s.visibility}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* GEO strategy */}
      <div className="grid md:grid-cols-3 gap-4">
        <InsightCard icon="📝" title={`${unanswered} Unanswered AI Questions`}
          detail="Write detailed FAQ pages and blog posts for each unanswered question. AI models pull from authoritative, structured content."
          pill="Critical" pillColor="bg-red-50 text-red-700" />
        <InsightCard icon="🏗️" title="Add Structured FAQ Schema"
          detail="Every service page and blog post should have FAQ schema markup. This is the #1 factor for appearing in AI Overview answers."
          pill="High Impact" pillColor="bg-purple-50 text-purple-700" />
        <InsightCard icon="📍" title="Location Entity Optimisation"
          detail='Add "in Chennai/Bangalore/Coimbatore/Kochi" to your FAQ answers so AI models cite you for location-specific queries.'
          pill="AEO Strategy" pillColor="bg-blue-50 text-blue-700" />
      </div>
    </div>
  );
}
