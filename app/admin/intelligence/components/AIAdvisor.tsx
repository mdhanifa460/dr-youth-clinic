'use client';

import { useState } from 'react';

type Insight = { title: string; detail: string; trend: 'up' | 'down' | 'neutral'; metric: string };
type Rec     = { title: string; action: string; expectedImpact: string; priority: 'high' | 'medium' | 'low'; timeframe: string };
type Opp     = { title: string; description: string; steps: string[]; revenueImpact: string; confidence: string };

interface AIResult {
  insights: Insight[];
  recommendations: Rec[];
  opportunity: Opp;
}

// Cached across section switches so the result survives unmounting
let sessionCache: AIResult | null = null;

export default function AIAdvisor({ data }: { data: any }) {
  const [result, setResult] = useState<AIResult | null>(sessionCache);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [generated, setGenerated] = useState(sessionCache !== null);

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
    } catch (e: any) {
      setError(e.message || 'AI generation failed');
    } finally {
      setLoading(false);
    }
  };

  const prioStyle: Record<string, string> = {
    high:   'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low:    'bg-blue-100 text-blue-700',
  };
  const trendIcon: Record<string, string> = { up: '↑', down: '↓', neutral: '→' };
  const trendColor: Record<string, string> = { up: 'text-emerald-600', down: 'text-red-500', neutral: 'text-gray-500' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <span className="inline-block text-[10px] font-bold tracking-[0.18em] uppercase text-[#F5A623] bg-[#F5A623]/10 px-3 py-1 rounded-full mb-2">
          AI Business Advisor
        </span>
        <h2 className="text-xl font-extrabold text-[#0B2560]">AI Business Advisor</h2>
        <p className="text-sm text-gray-500 mt-1">
          Powered by Claude AI. Analyses your real clinic data and delivers specific, actionable recommendations.
        </p>
      </div>

      {/* Generate button */}
      {!generated && !loading && (
        <div className="bg-gradient-to-br from-[#0B2560] to-[#3B82C4] rounded-2xl p-8 text-white text-center">
          <div className="text-5xl mb-4">🤖</div>
          <h3 className="text-lg font-extrabold mb-2">Get AI-Powered Business Intelligence</h3>
          <p className="text-sm text-white/70 max-w-md mx-auto mb-6">
            Claude AI will analyse your clinic's bookings, revenue, patient retention, and treatment data to generate personalised insights and recommendations.
          </p>
          <div className="grid grid-cols-3 gap-3 mb-6 text-center">
            {['What is happening?', 'Why is it happening?', 'What should we do next?'].map((q, i) => (
              <div key={i} className="bg-white/10 rounded-xl p-3">
                <p className="text-xs font-semibold text-white/90">{q}</p>
              </div>
            ))}
          </div>
          <button
            onClick={generate}
            className="inline-flex items-center gap-2 bg-[#F5A623] text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-[#e49520] transition-all shadow-lg"
          >
            <span>✨</span>
            Generate AI Analysis
          </button>
          <p className="text-[11px] text-white/40 mt-3">Uses Claude Haiku · ~5 seconds · No extra cost</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-2xl p-10 shadow-sm ring-1 ring-gray-100 flex flex-col items-center justify-center">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-[#0B2560]/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-[#0B2560] border-t-transparent rounded-full animate-spin" />
            <div className="absolute inset-3 flex items-center justify-center text-2xl">🤖</div>
          </div>
          <p className="text-sm font-bold text-[#0B2560]">Claude AI is analysing your clinic data…</p>
          <p className="text-xs text-gray-400 mt-1">Generating personalised insights and recommendations</p>
          <div className="flex gap-1 mt-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 bg-[#0B2560] rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}

      {/* Error */}
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
                  <p className="text-xs text-red-600 mt-1">Get your API key at console.anthropic.com</p>
                </div>
              )}
              <button onClick={generate} className="mt-3 text-xs font-semibold text-red-700 underline">Try again</button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-5">
          {/* Regenerate */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              AI analysis complete — powered by Claude Haiku
            </p>
            <button onClick={generate} className="text-xs font-semibold text-[#3B82C4] hover:underline flex items-center gap-1">
              <span>↻</span> Regenerate
            </button>
          </div>

          {/* Insights */}
          <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm font-bold text-[#0B2560] mb-4">📊 Key Business Insights</p>
            <div className="space-y-4">
              {(result.insights || []).map((ins, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-[#f6faff] rounded-xl border border-[#e8eff7]">
                  <div className="w-8 h-8 rounded-full bg-[#0B2560] text-white flex items-center justify-center text-sm font-bold shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-[#0B2560]">{ins.title}</p>
                      <span className={`text-sm font-bold ${trendColor[ins.trend]}`}>
                        {trendIcon[ins.trend]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{ins.detail}</p>
                    {ins.metric && (
                      <p className="text-xs font-bold text-[#3B82C4] mt-2 bg-[#e8eff7] inline-block px-2 py-0.5 rounded-full">
                        📈 {ins.metric}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white rounded-2xl p-5 shadow-sm ring-1 ring-gray-100">
            <p className="text-sm font-bold text-[#0B2560] mb-4">🎯 Actionable Recommendations</p>
            <div className="space-y-4">
              {(result.recommendations || []).map((rec, i) => (
                <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className={`px-4 py-3 flex items-center justify-between ${
                    rec.priority === 'high' ? 'bg-red-50' : rec.priority === 'medium' ? 'bg-amber-50' : 'bg-blue-50'
                  }`}>
                    <p className="text-sm font-bold text-gray-800">{rec.title}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${prioStyle[rec.priority]}`}>
                        {rec.priority}
                      </span>
                    </div>
                  </div>
                  <div className="px-4 py-3 bg-white space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-sm shrink-0">→</span>
                      <p className="text-xs text-gray-700">{rec.action}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="bg-emerald-50 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-gray-500 mb-0.5">Expected Impact</p>
                        <p className="text-xs font-bold text-emerald-700">{rec.expectedImpact}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-gray-500 mb-0.5">Timeframe</p>
                        <p className="text-xs font-bold text-gray-700">{rec.timeframe}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Growth opportunity */}
          {result.opportunity && (
            <div className="bg-gradient-to-br from-[#0B2560] to-[#1a4a8a] rounded-2xl p-6 text-white">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#F5A623] mb-1">Top Growth Opportunity</p>
                  <p className="text-base font-extrabold">{result.opportunity.title}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#F5A623]">{result.opportunity.revenueImpact}</p>
                  <p className="text-[10px] text-white/60">{result.opportunity.confidence} confidence</p>
                </div>
              </div>
              <p className="text-xs text-white/80 mb-4 leading-relaxed">{result.opportunity.description}</p>
              {(result.opportunity.steps || []).length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#F5A623]">Action Steps</p>
                  {result.opportunity.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2.5 bg-white/10 rounded-xl px-3 py-2">
                      <span className="w-5 h-5 rounded-full bg-[#F5A623] text-[#0B2560] flex items-center justify-center text-[10px] font-extrabold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-xs text-white/90">{step}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
