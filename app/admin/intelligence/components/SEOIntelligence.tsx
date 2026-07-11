'use client';

import { SectionHeader, ProgressBar, HBarChart, InsightCard } from './Charts';

const KEYWORDS = [
  { kw: 'dermatologist in Chennai',         pos: 3,  vol: 4400, ctr: 8.2  },
  { kw: 'skin clinic Chennai',              pos: 5,  vol: 3600, ctr: 5.1  },
  { kw: 'hair transplant Chennai',          pos: 8,  vol: 2900, ctr: 2.8  },
  { kw: 'hydra facial Chennai',             pos: 2,  vol: 2100, ctr: 14.3 },
  { kw: 'laser hair removal Bangalore',     pos: 6,  vol: 1800, ctr: 4.7  },
  { kw: 'PRP hair treatment Chennai',       pos: 4,  vol: 1600, ctr: 6.9  },
  { kw: 'acne treatment clinic Chennai',    pos: 7,  vol: 1400, ctr: 3.2  },
  { kw: 'skin brightening treatment',       pos: 11, vol: 1200, ctr: 1.8  },
  { kw: 'botox clinic Chennai',             pos: 9,  vol: 980,  ctr: 2.4  },
  { kw: 'chemical peel treatment Chennai',  pos: 12, vol: 860,  ctr: 1.4  },
];

const ISSUES = [
  { type: 'warning', icon: '⚠️', label: 'Missing meta descriptions',  count: 3,  action: 'Add meta descriptions to service pages' },
  { type: 'error',   icon: '❌', label: 'Pages missing schema markup',  count: 7,  action: 'Add LocalBusiness + MedicalOrganization schema' },
  { type: 'warning', icon: '⚠️', label: 'Images without alt text',     count: 12, action: 'Add descriptive alt text to all images' },
  { type: 'info',    icon: '💡', label: 'Low word-count service pages', count: 4,  action: 'Expand service pages to 800+ words' },
  { type: 'success', icon: '✅', label: 'Pages with canonical tags',    count: 18, action: '' },
];

export default function SEOIntelligence({ data }: { data: any }) {
  const byService = data?.byService || [];
  // seoScore is a real content-completeness score computed on save (see
  // Service.ts computeSeoScore) — 0 means the record hasn't been saved since
  // that was added yet, not a genuine zero, so exclude it from the average.
  const scoredServices = byService.filter((x: any) => x.seoScore > 0);
  const seoScore = scoredServices.length
    ? Math.round(scoredServices.reduce((s: number, x: any) => s + x.seoScore, 0) / scoredServices.length)
    : null;

  const topByPos  = [...KEYWORDS].sort((a, b) => a.pos - b.pos);
  const needsWork = KEYWORDS.filter(k => k.pos > 10);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="SEO Intelligence"
        subtitle="Search engine visibility, keyword rankings, and on-page health for DR Youth Clinic."
        badge="SEO Analytics"
      />

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-800 flex items-start gap-2">
        <span className="shrink-0">🔍</span>
        <span><strong>Sample data.</strong> Keyword positions, indexed pages, and audit issues below are illustrative placeholders, not live rankings. Connect Google Search Console to see real data. The "SEO Score by Service" section below, however, is real — calculated from each service's actual on-page content.</span>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Avg SEO Score',   value: seoScore !== null ? `${seoScore}/100` : 'Not scored yet',  icon: '📊', color: seoScore !== null && seoScore > 70 ? '#10B981' : '#F5A623' },
          { label: 'Indexed Pages',   value: '34',               icon: '📄', color: '#0B2560' },
          { label: 'Top-10 Keywords', value: KEYWORDS.filter(k => k.pos <= 10).length, icon: '🎯', color: '#0B2560' },
          { label: 'Est. Monthly Clicks', value: '2.8K',         icon: '👆', color: '#10B981' },
        ].map((k, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-gray-100 text-center">
            <span className="text-xl">{k.icon}</span>
            <p className="text-lg font-extrabold mt-1" style={{ color: k.color }}>{k.value}</p>
            <p className="text-xs text-gray-500">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Keyword rankings */}
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm font-bold text-[#0B2560] mb-4">Top Ranking Keywords</p>
          <div className="space-y-2.5">
            {topByPos.map((k, i) => (
              <div key={i} className="group">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700 truncate max-w-[65%]">{k.kw}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-gray-400">{k.vol.toLocaleString()}/mo</span>
                    <span className={`text-[11px] font-bold w-7 text-right ${
                      k.pos <= 3 ? 'text-emerald-600' : k.pos <= 10 ? 'text-[#0B2560]' : 'text-amber-500'
                    }`}>#{k.pos}</span>
                  </div>
                </div>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${k.pos <= 3 ? 'bg-emerald-400' : k.pos <= 10 ? 'bg-[#3B82C4]' : 'bg-amber-300'}`}
                    style={{ width: `${Math.max(5, ((20 - k.pos) / 20) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Issues */}
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm font-bold text-[#0B2560] mb-4">Technical SEO Audit</p>
          <div className="space-y-3">
            {ISSUES.map((issue, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${
                issue.type === 'error'   ? 'bg-red-50 border border-red-100' :
                issue.type === 'warning' ? 'bg-amber-50 border border-amber-100' :
                issue.type === 'success' ? 'bg-emerald-50 border border-emerald-100' :
                'bg-blue-50 border border-blue-100'
              }`}>
                <span className="text-sm shrink-0">{issue.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800">{issue.label}
                    <span className="ml-1 font-bold">({issue.count})</span>
                  </p>
                  {issue.action && <p className="text-[11px] text-gray-500 mt-0.5">{issue.action}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SEO Score */}
      <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-[#0B2560]">SEO Score by Service</p>
          <span className="text-xs text-gray-400">From admin CMS</span>
        </div>
        <div className="space-y-3">
          {byService.slice(0, 6).map((s: any, i: number) => {
            const score: number = s.seoScore || 0;
            const scored = score > 0;
            return (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700 truncate max-w-[70%]">{s.name}</span>
                  <span className={`text-xs font-bold ${!scored ? 'text-gray-400' : score >= 70 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                    {scored ? `${score}/100` : 'Not scored yet'}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${!scored ? 'bg-gray-200' : score >= 70 ? 'bg-emerald-400' : score >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ width: `${scored ? score : 0}%` }} />
                </div>
              </div>
            );
          })}
          {byService.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">Add services with SEO details to see scores here</p>
          )}
        </div>
      </div>

      {/* Opportunities */}
      <div className="grid md:grid-cols-3 gap-4">
        <InsightCard icon="📝" title={`${needsWork.length} Keywords Beyond Page 1`}
          detail="Targeting these with dedicated landing pages or blogs could push them to page 1 and triple organic traffic."
          pill="High Impact" pillColor="bg-amber-50 text-amber-700" />
        <InsightCard icon="🏥" title="Local SEO Opportunity"
          detail='Add "near me" and city-specific keyword variations to all service pages. Local intent searches convert at 3× higher.'
          pill="Quick Win" pillColor="bg-blue-50 text-blue-700" />
        <InsightCard icon="📖" title="Blog Content Gap"
          detail="Publishing 2–3 treatment-focused blogs per week can drive significant organic traffic within 90 days."
          pill="Long-term" pillColor="bg-emerald-50 text-emerald-700" />
      </div>
    </div>
  );
}
