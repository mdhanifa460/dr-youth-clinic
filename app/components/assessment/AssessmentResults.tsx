'use client';

// Pre-Consultation Assessment result screen (architecture review §09).
// Concern Level + Risk Level side by side, per-category bars, "What We
// Found," "Possible Contributing Factors," and a severity-driven CTA — and
// nothing else. No treatment name, no price, anywhere in this component,
// by construction: it only ever receives an AssessmentResult (see
// app/lib/assessmentTypeScoring.ts), which structurally cannot carry one.
import { useRouter } from 'next/navigation';
import type { AssessmentResult } from '@/app/lib/assessmentTypeScoring';
import type { CtaRule } from '@/app/lib/assessmentTypeDefaults';

function Ring({ percent, label, gradientId, colors }: { percent: number; label: string; gradientId: string; colors: [string, string] }) {
  const r = 42;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - percent / 100);
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="9" />
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors[0]} />
              <stop offset="100%" stopColor={colors[1]} />
            </linearGradient>
          </defs>
          <circle
            cx="50" cy="50" r={r} fill="none" stroke={`url(#${gradientId})`} strokeWidth="9"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-extrabold text-white">{percent}%</span>
        </div>
      </div>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-white/60">{label}</p>
    </div>
  );
}

// Deterministic — never LLM-generated. Each category above a noticeability
// threshold gets one plain-language bullet built from its own admin-set
// label; nothing here infers or invents a cause.
function buildWhatWeFound(categoryScores: AssessmentResult['categoryScores']): string[] {
  return categoryScores
    .filter((c) => c.percent >= 20)
    .sort((a, b) => b.percent - a.percent)
    .map((c) => `${c.label} identified based on your responses`);
}

export interface AssessmentResultsProps {
  typeLabel: string;
  resultHeadline: string;
  disclaimer: string;
  result: AssessmentResult;
  ctaRules: CtaRule[];
  // AI's only role on this screen — a plain-language explanation of the
  // already-final deterministic result (architecture review §10). Optional
  // and additive: absent while it's still generating or if AI isn't
  // configured, in which case this section just doesn't render — every
  // other section on this screen is already complete without it.
  aiExplanation?: string;
  leadId: string | null;
  location?: string;
  name?: string;
  phone?: string;
  onRetake: () => void;
}

export default function AssessmentResults({
  typeLabel, resultHeadline, disclaimer, result, ctaRules, aiExplanation, leadId, location, name, phone, onRetake,
}: AssessmentResultsProps) {
  const router = useRouter();
  const whatWeFound = buildWhatWeFound(result.categoryScores);
  const cta = ctaRules.find((r) => r.severity === result.severity) || ctaRules[0];
  const primaryCategory = [...result.categoryScores].sort((a, b) => b.percent - a.percent)[0];

  const handleCta = (btn: CtaRule['buttons'][number]) => {
    if (btn.type === 'content' && btn.href) {
      router.push(btn.href);
      return;
    }
    // "book" (and "chat" falling back to book, since no chat UI ships in
    // this pass) — assessment context passed through, never a treatment
    // name, since none exists at this point in the journey (§11).
    const params = new URLSearchParams();
    if (typeLabel) params.set('assessmentType', typeLabel.toLowerCase());
    if (primaryCategory?.label) params.set('concern', primaryCategory.label);
    params.set('overallConcern', String(result.overallConcern));
    params.set('severity', result.severity);
    if (leadId) params.set('leadId', leadId);
    if (location) params.set('location', location);
    if (name) params.set('name', name);
    if (phone) params.set('phone', phone);
    router.push(`/book?${params.toString()}`);
  };

  const printSummary = () => window.print();

  return (
    <div className="py-6 md:py-10">
      <div id="assessment-print-area" className="rounded-3xl bg-[#0B2560] text-white p-6 md:p-8 shadow-xl max-w-md mx-auto">
        <p className="text-center text-[11px] font-bold uppercase tracking-[0.18em] text-[#F5A623] mb-1">
          {resultHeadline}
        </p>

        <div className="flex justify-center gap-8 my-4">
          <Ring percent={result.overallConcern} label="Concern Level" gradientId="concernGrad" colors={['#3B82C4', '#F5A623']} />
          {/* Risk Level needs its own weighted answer data (riskWeight per
              answer) — not every caller has authored that yet (Plan My
              Journey's QuizConfig doesn't), so this ring only renders once
              there's a real risk band to show, rather than a misleading 0%. */}
          {result.riskLevel && (
            <Ring percent={result.riskScore} label="Risk Level" gradientId="riskGrad" colors={['#3B82C4', '#60A5FA']} />
          )}
        </div>
        <p className="text-center text-[#F5A623] font-bold text-xs tracking-wide mb-6">
          {result.severity.toUpperCase()} CONCERN{result.riskLevel ? ` · ${result.riskLevel.toUpperCase()} RISK` : ''}
        </p>

        {result.categoryScores.length > 0 && (
          <>
            <div className="space-y-2.5 mb-5">
              {result.categoryScores.map((c) => (
                <div key={c.key} className="flex items-center gap-2.5 text-xs">
                  <span className="w-28 shrink-0 text-white/75">{c.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#3B82C4] to-[#F5A623]" style={{ width: `${c.percent}%` }} />
                  </div>
                  <span className="w-9 text-right font-bold">{c.percent}%</span>
                </div>
              ))}
            </div>
            <hr className="border-white/10 mb-5" />
          </>
        )}

        {whatWeFound.length > 0 && (
          <>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#F5A623] mb-2">What We Found</p>
            <ul className="text-xs text-white/85 space-y-1.5 mb-5 pl-4 list-disc marker:text-[#F5A623]">
              {whatWeFound.map((line) => <li key={line}>{line}</li>)}
            </ul>
          </>
        )}

        {result.contributingFactors.length > 0 && (
          <>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#F5A623] mb-2">Possible Contributing Factors</p>
            <p className="text-[11px] text-white/50 mb-2">Based on your responses, possible contributing factors may include:</p>
            <ul className="text-xs text-white/85 space-y-1.5 mb-5 pl-4 list-disc marker:text-[#F5A623]">
              {result.contributingFactors.map((f) => <li key={f.tag}>{f.label}</li>)}
            </ul>
          </>
        )}

        {aiExplanation && (
          <>
            <hr className="border-white/10 mb-5" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#F5A623] mb-2">In Your Own Words</p>
            <p className="text-xs text-white/80 leading-relaxed mb-5">{aiExplanation}</p>
          </>
        )}

        {cta && (
          <>
            <hr className="border-white/10 mb-5" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#F5A623] mb-2">What's Next?</p>
            <p className="text-xs text-white/80 mb-4 leading-relaxed">{cta.headline} {cta.body}</p>
            <div className="space-y-2">
              {cta.buttons.map((btn, i) => (
                <button
                  key={i}
                  onClick={() => handleCta(btn)}
                  className={i === 0
                    ? 'w-full py-3.5 rounded-2xl bg-[#F5A623] text-[#0B2560] font-extrabold text-sm shadow-lg hover:-translate-y-0.5 transition-transform'
                    : 'w-full py-3.5 rounded-2xl border border-white/25 text-white font-semibold text-sm hover:bg-white/10 transition-colors'}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </>
        )}

        <button
          onClick={printSummary}
          className="w-full mt-3 py-2.5 rounded-xl border border-white/15 text-white/60 text-xs font-medium hover:bg-white/5 transition-colors print:hidden"
        >
          🖨 Print / Save Assessment Summary
        </button>

        <p className="mt-4 text-center text-[10px] text-white/40 leading-relaxed">{disclaimer}</p>
      </div>

      <div className="text-center mt-6 print:hidden">
        <button onClick={onRetake} className="text-xs text-gray-400 hover:text-[#0B2560] underline">
          Retake assessment
        </button>
      </div>

      {/* Print stylesheet — clean, nav-free view of just the summary card
          (architecture review §09, item 3). No new backend: window.print()
          against this same DOM, styled for paper. */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #assessment-print-area, #assessment-print-area * { visibility: visible; }
          #assessment-print-area {
            position: absolute; left: 0; top: 0; width: 100%;
            background: white !important; color: black !important; box-shadow: none !important;
          }
          #assessment-print-area * { color: black !important; }
          #assessment-print-area .bg-white\\/10, #assessment-print-area .bg-white\\/15 { background: #eee !important; }
        }
      `}</style>
    </div>
  );
}
