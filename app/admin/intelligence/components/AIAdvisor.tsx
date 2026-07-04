'use client';

import { useState } from 'react';
import { fmtINR, ActionCard } from './Charts';

type Insight = { title: string; detail: string; trend: 'up' | 'down' | 'neutral'; metric: string };
type Rec     = { title: string; action: string; expectedImpact: string; priority: 'high' | 'medium' | 'low'; timeframe: string };
type Opp     = { title: string; description: string; steps: string[]; revenueImpact: string; confidence: string };

interface AIResult {
  insights: Insight[];
  recommendations: Rec[];
  opportunity: Opp;
}

type PanelTab = 'what' | 'why' | 'next';

// Cached across section switches so the result survives unmounting
let sessionCache: AIResult | null = null;

function buildDataFacts(data: Record<string, unknown>): string[] {
  const o          = (data?.overview ?? {}) as Record<string, number>;
  const growthRate = (data?.forecast as { growthRate?: number })?.growthRate ?? 0;
  const cr         = o.cancellationRate ?? 0;
  const inactive   = o.inactivePatients ?? 0;
  const pending    = o.pendingBookings  ?? 0;
  const estRev     = o.estimatedMonthRevenue ?? 0;

  const facts: string[] = [];

  facts.push(
    `${o.monthBookings ?? 0} bookings this month (${growthRate > 0 ? '+' : ''}${growthRate}% vs last month)`
  );

  const crQual = cr < 10 ? 'healthy — below 10% threshold' : cr < 20 ? 'moderate — aim below 10%' : 'high — above 20%, action needed';
  facts.push(`${cr}% cancellation rate (${crQual})`);

  facts.push(`${fmtINR(estRev)} estimated revenue this month`);

  if (inactive > 0) {
    facts.push(`${inactive} patients haven't returned in 90+ days`);
  }

  if (pending > 0) {
    facts.push(`${pending} bookings are awaiting confirmation`);
  }

  if ((o.vipPatients ?? 0) > 0) {
    facts.push(`${o.vipPatients} VIP patients (3+ visits) — your highest-value cohort`);
  }

  facts.push(
    `${o.completedBookings ?? 0} completed bookings — ${o.conversionRate ?? 0}% completion rate`
  );

  return facts;
}

function buildAutoActions(data: Record<string, unknown>): {
  title: string; detail: string; href: string; impact?: string; urgency: 'now' | 'today' | 'this-week';
}[] {
  const o        = (data?.overview ?? {}) as Record<string, number>;
  const pending  = o.pendingBookings   ?? 0;
  const inactive = o.inactivePatients  ?? 0;
  const cr       = o.cancellationRate  ?? 0;
  const estRev   = o.estimatedMonthRevenue ?? 0;

  const actions: { title: string; detail: string; href: string; impact?: string; urgency: 'now' | 'today' | 'this-week' }[] = [];

  if (pending > 0) {
    const atRisk = Math.round((pending / Math.max(o.monthBookings ?? 1, 1)) * estRev);
    actions.push({
      title: `Confirm ${pending} pending bookings`,
      detail: 'Unconfirmed bookings are at risk of drop-off every hour they sit pending.',
      href: '/admin/bookings',
      impact: `~${fmtINR(atRisk)} at risk`,
      urgency: 'now',
    });
  }

  if (cr > 15) {
    actions.push({
      title: 'Enable appointment reminders',
      detail: `${cr}% cancellations — automated reminders cut no-shows by 30–40%.`,
      href: '/admin/settings/booking',
      impact: '~30% fewer no-shows',
      urgency: 'today',
    });
  }

  if (inactive > 10) {
    const potential = Math.round(inactive * 0.2 * 800);
    actions.push({
      title: `Re-engage ${inactive} inactive patients`,
      detail: 'A targeted WhatsApp message to lapsed patients typically recovers 15–20% of them.',
      href: '/admin/settings/whatsapp',
      impact: `~${fmtINR(potential)} potential`,
      urgency: 'this-week',
    });
  }

  return actions.slice(0, 3);
}

export default function AIAdvisor({ data }: { data: Record<string, unknown> }) {
  const [result, setResult]     = useState<AIResult | null>(sessionCache);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [generated, setGenerated] = useState(sessionCache !== null);
  const [activeTab, setActiveTab] = useState<PanelTab>('what');

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/admin/intelligence/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stats: data }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      sessionCache = json;
      setResult(json);
      setGenerated(true);
      setActiveTab('why');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'AI generation failed');
    } finally {
      setLoading(false);
    }
  };

  const dataFacts   = buildDataFacts(data);
  const autoActions = buildAutoActions(data);

  const tabs: { id: PanelTab; label: string; icon: string }[] = [
    { id: 'what',  label: 'What Happened',    icon: '📊' },
    { id: 'why',   label: 'Why It Happened',  icon: '🧠' },
    { id: 'next',  label: 'What to Do Next',  icon: '🎯' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-2">
        <span className="inline-block text-[10px] font-bold tracking-[0.18em] uppercase text-[#F5A623] bg-[#F5A623]/10 px-3 py-1 rounded-full mb-2">
          AI Business Advisor
        </span>
        <h2 className="text-xl font-extrabold text-[#0B2560]">AI Business Advisor</h2>
        <p className="text-sm text-gray-500 mt-1">
          Powered by Claude AI. Three lenses: what happened, why it happened, and what to do next.
        </p>
      </div>

      {/* Pill Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === t.id
                ? 'bg-white text-[#0B2560] shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Panel 1: What Happened ─────────────────────────────────────── */}
      {activeTab === 'what' && (
        <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
          <div className="mb-4">
            <p className="text-sm font-bold text-[#0B2560]">📊 This month at a glance</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Auto-computed from your live clinic data — no AI needed</p>
          </div>
          <ol className="space-y-3">
            {dataFacts.map((fact, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#0B2560] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-gray-700 leading-snug">{fact}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ── Panel 2: Why It Happened ───────────────────────────────────── */}
      {activeTab === 'why' && (
        <div className="space-y-4">
          {!generated && !loading && (
            <div className="bg-gradient-to-br from-[#0B2560] to-[#3B82C4] rounded-2xl p-8 text-white text-center">
              <div className="text-5xl mb-4">🧠</div>
              <h3 className="text-lg font-extrabold mb-2">Ask Claude to explain the patterns</h3>
              <p className="text-sm text-white/70 max-w-md mx-auto mb-6">
                Claude AI will read your clinic&apos;s data and explain the <em>why</em> behind the numbers — in plain, actionable language.
              </p>
              <button
                onClick={generate}
                className="inline-flex items-center gap-2 bg-[#F5A623] text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-[#e49520] transition-all shadow-lg"
              >
                <span>✨</span>
                Generate AI Explanation
              </button>
              <p className="text-[11px] text-white/40 mt-3">Uses Claude Haiku · ~5 seconds</p>
            </div>
          )}

          {loading && (
            <div className="bg-white rounded-2xl p-10 shadow-sm ring-1 ring-gray-100 flex flex-col items-center justify-center">
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 border-4 border-[#0B2560]/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-[#0B2560] border-t-transparent rounded-full animate-spin" />
                <div className="absolute inset-3 flex items-center justify-center text-2xl">🧠</div>
              </div>
              <p className="text-sm font-bold text-[#0B2560]">Claude AI is analysing your clinic data…</p>
              <p className="text-xs text-gray-400 mt-1">Generating pattern explanations</p>
              <div className="flex gap-1 mt-4">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 bg-[#0B2560] rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <span className="text-xl shrink-0">⚠️</span>
                <div>
                  <p className="text-sm font-bold text-red-800">AI Generation Failed</p>
                  <p className="text-xs text-red-600 mt-1">{error}</p>
                  {error.includes('ANTHROPIC_API_KEY') && (
                    <div className="mt-3 p-3 bg-red-100 rounded-xl">
                      <p className="text-xs font-semibold text-red-800 mb-1">Setup Required:</p>
                      <p className="text-xs text-red-700 font-mono">Add ANTHROPIC_API_KEY=sk-ant-... to your .env.local</p>
                    </div>
                  )}
                  <button onClick={generate} className="mt-3 text-xs font-semibold text-red-700 underline">Try again</button>
                </div>
              </div>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  AI analysis complete — powered by Claude Haiku
                </p>
                <button onClick={generate} className="text-xs font-semibold text-[#3B82C4] hover:underline flex items-center gap-1">
                  <span>↻</span> Regenerate
                </button>
              </div>

              {/* Narrative explanation */}
              <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
                <p className="text-sm font-bold text-[#0B2560] mb-4">🧠 Why the patterns look this way</p>
                <div className="space-y-4">
                  {(result.insights || []).map((ins, i) => (
                    <div key={i} className="space-y-1">
                      <p className="text-sm font-semibold text-gray-900">{ins.title}</p>
                      <p className="text-sm text-gray-600 leading-relaxed">{ins.detail}</p>
                      {ins.metric && (
                        <p className="text-xs font-bold text-[#3B82C4] bg-[#e8eff7] inline-block px-2 py-0.5 rounded-full">
                          {ins.metric}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Growth opportunity */}
              {result.opportunity && (
                <div className="bg-gradient-to-br from-[#0B2560] to-[#1a4a8a] rounded-2xl p-6 text-white">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5A623] mb-1">Top Growth Opportunity</p>
                      <p className="text-base font-extrabold">{result.opportunity.title}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-[#F5A623]">{result.opportunity.revenueImpact}</p>
                      <p className="text-[10px] text-white/60">{result.opportunity.confidence} confidence</p>
                    </div>
                  </div>
                  <p className="text-xs text-white/80 leading-relaxed">{result.opportunity.description}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Panel 3: What to Do Next ───────────────────────────────────── */}
      {activeTab === 'next' && (
        <div className="space-y-4">
          {/* Auto-derived priority actions */}
          <div>
            <p className="text-sm font-bold text-[#0B2560] mb-1">Auto-derived from your data</p>
            <p className="text-[11px] text-gray-400 mb-3">No AI call needed — computed from live metrics</p>
            <div className="space-y-3">
              {autoActions.length > 0 ? autoActions.map((a, i) => (
                <ActionCard
                  key={i}
                  title={a.title}
                  detail={a.detail}
                  href={a.href}
                  impact={a.impact}
                  urgency={a.urgency}
                />
              )) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-700 font-medium">
                  ✅ No urgent actions detected — your key metrics are within healthy ranges.
                </div>
              )}
            </div>
          </div>

          {/* AI-generated recommendations (shown when AI has been run) */}
          {result && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-sm font-bold text-[#0B2560]">AI-suggested actions</p>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F5A623]/10 text-[#F5A623]">Claude</span>
              </div>
              <div className="space-y-3">
                {(result.recommendations || []).map((rec, i) => {
                  const urgency: 'now' | 'today' | 'this-week' =
                    rec.priority === 'high' ? 'now' : rec.priority === 'medium' ? 'today' : 'this-week';
                  return (
                    <div key={i} className="bg-white rounded-xl p-4 shadow-sm ring-1 ring-gray-100">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                              urgency === 'now' ? 'bg-red-100 text-red-700' :
                              urgency === 'today' ? 'bg-amber-100 text-amber-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {urgency === 'now' ? 'Do now' : urgency === 'today' ? 'Today' : 'This week'}
                            </span>
                            {rec.expectedImpact && (
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                                {rec.expectedImpact}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-bold text-gray-900">{rec.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-snug">{rec.action}</p>
                          <p className="text-[11px] text-gray-400 mt-1">Timeframe: {rec.timeframe}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Prompt to generate if not yet done */}
          {!generated && !loading && (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-center">
              <p className="text-sm font-semibold text-gray-700 mb-2">Get 3 more AI-suggested actions</p>
              <p className="text-xs text-gray-500 mb-4">Claude AI will analyse your data and suggest additional high-impact actions.</p>
              <button
                onClick={() => { setActiveTab('why'); generate(); }}
                className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0a1f50] transition-all"
              >
                <span>✨</span> Generate AI Actions
              </button>
            </div>
          )}

          {loading && (
            <div className="bg-white rounded-xl p-6 ring-1 ring-gray-100 flex items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#0B2560] border-t-transparent rounded-full animate-spin shrink-0" />
              <p className="text-sm text-gray-600">Claude is generating additional actions…</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
