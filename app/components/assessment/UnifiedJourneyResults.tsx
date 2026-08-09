"use client";

// Plan My Journey's (/plan-my-journey) results screen — skin-quiz uses its
// own, separate AssessmentResults.tsx. Which blocks render is driven by (a)
// the admin's resultSections order/visibility config (app/admin/ai-
// assessment's Settings tab) and (b) which data is actually present:
// `journeyResult` (percentage/severity, from scoreJourneyConcern) renders
// whenever the visitor answered branching questions; the real matched-
// Service presentation (`journey` prop) only renders when a real Service
// document was matched. Neither is fabricated — a section simply doesn't
// render when its underlying data doesn't exist. Treatment Mapping-derived
// content (treatment cards, Root Cause Analysis, Email Me a Copy) was
// removed entirely per a business decision: doctors and patients work from
// the deterministic assessment result, not a system-suggested treatment.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, MessageCircle, Sparkles } from "lucide-react";
import { useSiteConfig } from "@/app/components/SiteConfigContext";
import { useBranchWhatsApp, toWaLink } from "@/app/lib/useBranchWhatsApp";
import type { ResultSectionConfig, ResultSectionKey } from "@/app/lib/quizDefaults";
import type { AssessmentResult } from "@/app/lib/assessmentTypeScoring";
import { postAssessmentEvent } from "@/app/lib/assessmentFlow";
import SliderCard from "@/app/components/SliderCard";

// Pre-consultation booking handoff — same contract skin-quiz's
// AssessmentResults.tsx uses (assessmentType/concern/overallConcern/
// severity/leadId), never a treatment or service name. Plan My Journey used
// to pass `service=<matched treatment name>` here; that's exactly the
// reveal this rework removes (see architecture note above JourneyConcernSummary).
function buildBookUrl(
  opts: {
    assessmentType?: string;
    concern?: string;
    overallConcern?: number;
    severity?: string;
    leadId?: string | null;
    location?: string;
    name?: string;
    phone?: string;
    sessionId?: string;
  }
): string {
  const params = new URLSearchParams();
  if (opts.assessmentType) params.set("assessmentType", opts.assessmentType);
  if (opts.concern) params.set("concern", opts.concern);
  if (opts.overallConcern !== undefined) params.set("overallConcern", String(opts.overallConcern));
  if (opts.severity) params.set("severity", opts.severity);
  if (opts.leadId) params.set("leadId", opts.leadId);
  if (opts.location) params.set("location", opts.location);
  if (opts.name) params.set("name", opts.name);
  if (opts.phone) params.set("phone", opts.phone);
  if (opts.sessionId) params.set("sessionId", opts.sessionId);
  const qs = params.toString();
  return qs ? `/book?${qs}` : "/book";
}

export type PatientReport = {
  summary: string;
  contributingFactors: string[];
  lifestyleFindings: string[];
  questionsForDoctor: string[];
  treatmentOptionsDiscussed: string[];
};

export interface JourneyPresentationData {
  service: any;
  alternatives: any[];
  doctors: any[];
  results: any[];
  goalIcon: string;
  goalLabel: string;
  onSwitchService?: (id: string) => void;
}

function Ring({ percent }: { percent: number }) {
  const r = 42;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - percent / 100);
  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(11,37,96,0.08)" strokeWidth="9" />
        <defs>
          <linearGradient id="pmjConcernGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82C4" />
            <stop offset="100%" stopColor="#F5A623" />
          </linearGradient>
        </defs>
        <circle
          cx="50" cy="50" r={r} fill="none" stroke="url(#pmjConcernGrad)" strokeWidth="9"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-extrabold text-[#0B2560]">{percent}%</span>
      </div>
    </div>
  );
}

// Replaces the old TreatmentCard/CostRangeCard/Journey Explorer trio — this
// is the ONLY place the matched treatment/service used to be named and
// priced pre-consultation. Percentage + severity + contributing factors
// instead, same "no treatment reveal" contract as skin-quiz's
// AssessmentResults.tsx (see app/lib/assessmentScoring.ts's
// scoreJourneyConcern, which computes `result` from the same tag-weight
// data the old TreatmentCard's matching used — nothing here is fabricated,
// it's the same signal, just not translated into a treatment name).
function JourneyConcernSummary({ result }: { result: AssessmentResult }) {
  const whatWeFound = result.categoryScores
    .filter((c) => c.percent >= 20)
    .map((c) => `${c.label} identified based on your responses`);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8">
      <div className="flex items-center gap-6 mb-6">
        <Ring percent={result.overallConcern} />
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#F5A623] mb-1">
            {result.severity} Concern
          </p>
          <p className="text-sm text-gray-500 leading-relaxed">
            Based on your answers — your doctor will confirm the full picture at consultation.
          </p>
        </div>
      </div>

      {result.categoryScores.length > 0 && (
        <div className="space-y-2.5 mb-2">
          {result.categoryScores.map((c) => (
            <div key={c.key} className="flex items-center gap-2.5 text-xs">
              <span className="w-32 shrink-0 text-gray-500">{c.label}</span>
              <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-[#3B82C4] to-[#F5A623]" style={{ width: `${c.percent}%` }} />
              </div>
              <span className="w-9 text-right font-bold text-[#0B2560]">{c.percent}%</span>
            </div>
          ))}
        </div>
      )}

      {whatWeFound.length > 0 && (
        <>
          <hr className="border-gray-100 my-5" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#0B2560] mb-2">What We Found</p>
          <ul className="text-sm text-gray-600 space-y-1.5 pl-4 list-disc marker:text-[#F5A623]">
            {whatWeFound.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </>
      )}

      {result.contributingFactors.length > 0 && (
        <>
          <hr className="border-gray-100 my-5" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#0B2560] mb-2">Possible Contributing Factors</p>
          <ul className="text-sm text-gray-600 space-y-1.5 pl-4 list-disc marker:text-[#F5A623]">
            {result.contributingFactors.map((f, i) => <li key={i}>{f.label}</li>)}
          </ul>
        </>
      )}
    </div>
  );
}

function ReportList({ title, icon, items }: { title: string; icon: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <p className="text-xs font-bold text-[#0B2560] mb-2.5 flex items-center gap-1.5">
        <span>{icon}</span> {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-gray-600 leading-relaxed flex items-start gap-2">
            <span className="text-[#F5A623] mt-1 shrink-0">•</span> {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// AI Beauty Journey Module 10 — a short, AI-generated "take-home summary"
// wrapping up the patient's concern, generated once per session (guarded by
// `started` ref) and persisted onto PatientJourney.aiSummaryReport the same
// way Module 5's Journey Timeline persists via AiJourneySimulator's
// onGenerated. AI Beauty Journey only (goal/sessionId both required) — Skin
// Quiz has no PatientJourney session to persist onto. Renders nothing on
// error or while there isn't yet enough journey context to summarize.
// Percentage/severity only, same no-treatment-name contract as everywhere
// else on this screen — see /api/journey-summary's prompt.
function AiSummaryReportCard({
  goal,
  sessionId,
  goalLabel,
  primaryConcern,
  overallConcern,
  severity,
}: {
  goal?: string;
  sessionId?: string;
  goalLabel?: string;
  primaryConcern?: string;
  overallConcern?: number;
  severity?: string;
}) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !goal || !sessionId) return;
    if (!goalLabel && !primaryConcern) return;
    started.current = true;
    setStatus("loading");

    fetch("/api/journey-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalLabel, primaryConcern, overallConcern, severity }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data?.text) {
          setText(data.data.text);
          setStatus("done");
          fetch("/api/patient-journey", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, goal, aiSummaryReport: data.data.text }),
          }).catch(() => {});
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
    // Deliberately mount-once (see `started` ref) — re-running this on every
    // prop change would re-bill the AI call each time cost range/whatever
    // recomputes on re-render; the ref guard makes the dependency array's
    // exhaustiveness moot here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal, sessionId]);

  if (status === "idle" || status === "error") return null;

  return (
    <div className="bg-gradient-to-br from-[#0B2560] to-[#1a3a7a] rounded-2xl p-6 text-white">
      <p className="text-xs font-bold uppercase tracking-widest text-[#F5A623] mb-3 flex items-center gap-1.5">
        <Sparkles size={13} /> Your AI Summary
      </p>
      {status === "loading" ? (
        <div className="space-y-2.5 animate-pulse" aria-label="Generating your summary">
          <div className="h-3 bg-white/15 rounded-full w-full" />
          <div className="h-3 bg-white/15 rounded-full w-5/6" />
          <div className="h-3 bg-white/15 rounded-full w-4/6" />
        </div>
      ) : (
        <p className="text-sm text-white/90 leading-relaxed">{text}</p>
      )}
    </div>
  );
}

export default function UnifiedJourneyResults({
  resultSections,
  journeyResult,
  aiExplanation,
  doctorMessage,
  primaryConcern,
  patientReport,
  leadId,
  onRetake,
  journey,
  goal,
  sessionId,
  preferredClinic,
  leadName,
  leadPhone,
}: {
  resultSections: ResultSectionConfig[];
  // Percentage/severity/contributing-factors result — the no-treatment-
  // reveal replacement for the old TreatmentCard/CostRangeCard/Journey
  // Explorer/Root-Cause-Analysis/Email-Me-a-Copy blocks (all removed along
  // with Treatment Mapping — see scoreJourneyConcern in
  // assessmentScoring.ts). Null while it hasn't been computed yet, or for a
  // goal with no mapped intake questions at all.
  journeyResult: AssessmentResult | null;
  // Plain-language explanation of journeyResult — same "In Your Own Words"
  // contract as skin-quiz's AssessmentResults.tsx (/api/patient-report's
  // assessmentType branch). Undefined while generating or unconfigured.
  aiExplanation?: string;
  doctorMessage: string;
  primaryConcern: string;
  patientReport: PatientReport | null;
  leadId: string | null;
  onRetake?: () => void;
  journey?: JourneyPresentationData;
  // Analytics only (Phase 4) — empty string is a valid, expected value for
  // skin-quiz, which has no goal concept of its own.
  goal?: string;
  sessionId?: string;
  // AI Beauty Journey Module 9 — already known by the time the patient
  // reaches results (Branch Selection / Lead Capture), threaded into the
  // booking handoff so /book can prefill instead of re-asking. Undefined
  // for Skin Quiz, which has no branch-selection step of its own.
  preferredClinic?: string;
  leadName?: string;
  leadPhone?: string;
}) {
  const { publicWhatsApp, consultationCta } = useSiteConfig() as any;
  const hasResult = !!journeyResult && journeyResult.categoryScores.length > 0;

  // Plan My Journey with no matched Service at all (e.g. weight-loss before
  // Phase 3 content lands) — nothing clinical to show either, since no
  // questions were asked for this goal. Keep this as its own simple screen
  // rather than forcing it through the full clinical-intake-flavored layout
  // below, which assumes there's at least a scored result or a service.
  if (journey && !journey.service && !hasResult) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-16 text-center">
        <span className="text-5xl">{journey.goalIcon}</span>
        <h2 className="text-2xl font-headline font-bold text-[#0B2560] mt-4">{journey.goalLabel} — let's talk it through</h2>
        <p className="text-gray-500 max-w-md mx-auto mt-2">We're preparing options for this goal. Book a consultation and our specialists will guide you directly.</p>
        <Link href="/book" className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-7 py-3.5 rounded-xl font-bold text-sm hover:-translate-y-0.5 transition mt-6">
          {consultationCta || "Book a Consultation"} <ArrowRight size={15} />
        </Link>
      </div>
    );
  }

  const sectionVisible = (key: ResultSectionKey) => resultSections.find((s) => s.key === key)?.visible !== false;
  const orderOf = (key: ResultSectionKey) => resultSections.find((s) => s.key === key)?.order ?? 999;

  const primaryCategoryLabel = journeyResult?.categoryScores[0]?.label || journey?.goalLabel || primaryConcern || "";
  const bookUrl = buildBookUrl({
    assessmentType: "journey",
    concern: primaryCategoryLabel,
    overallConcern: journeyResult?.overallConcern,
    severity: journeyResult?.severity,
    leadId,
    location: preferredClinic,
    name: leadName,
    phone: leadPhone,
    sessionId,
  });
  // Branch-aware — /plan-my-journey and /skin-quiz aren't location-scoped
  // URLs, so the visitor's already-selected branch (Module 8) is passed
  // explicitly rather than relying on useBranchWhatsApp's own pathname/
  // cookie inference, which has nothing to detect here.
  const branchWhatsApp = useBranchWhatsApp(publicWhatsApp || "", preferredClinic);
  const waBaseHref = branchWhatsApp ? toWaLink(branchWhatsApp) : "";
  const waHref = waBaseHref
    ? `${waBaseHref}${primaryCategoryLabel ? `?text=${encodeURIComponent(`Hi, I just completed my Plan My Journey intake for ${primaryCategoryLabel} and would like to know more before my consultation.`)}` : ""}`
    : "";

  type Block = { key: ResultSectionKey; order: number; node: React.ReactNode };
  const blocks: Block[] = [];

  if (hasResult && journeyResult) {
    blocks.push({
      key: "topRecommendation",
      order: orderOf("topRecommendation"),
      node: <JourneyConcernSummary key="concern-summary" result={journeyResult} />,
    });
  } else if (!journey?.service) {
    // Nothing matched — the one case worth an explicit empty state,
    // mirroring the original honest "no fabrication" fallback.
    blocks.push({
      key: "topRecommendation",
      order: orderOf("topRecommendation"),
      node: (
        <div key="no-match" className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-500">
          We couldn't match a discussion topic to your answers — a specialist will review your responses personally.
        </div>
      ),
    });
  }

  if (sectionVisible("doctors") && journey && journey.doctors.length > 0) {
    blocks.push({
      key: "doctors",
      order: orderOf("doctors"),
      node: (
        <div key="doctors">
          <h3 className="text-xl font-headline font-bold text-[#0B2560] mb-4">Doctors For This Goal</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {journey.doctors.slice(0, 3).map((d: any) => (
              <Link key={String(d._id)} href={`/doctors/${d._id}`} className="bg-white rounded-2xl border border-gray-100 p-3 text-center hover:shadow-md transition">
                {d.photo?.url ? (
                  <Image src={d.photo.url} alt={d.name} width={64} height={64} className="rounded-full w-16 h-16 object-cover mx-auto mb-2" />
                ) : (
                  <span className="w-16 h-16 rounded-full bg-[#0B2560]/10 flex items-center justify-center mx-auto mb-2 font-bold text-[#0B2560]">{d.name?.[0]}</span>
                )}
                <p className="text-xs font-bold text-[#0B2560] leading-snug">{d.name}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{d.title}</p>
              </Link>
            ))}
          </div>
        </div>
      ),
    });
  }

  if (sectionVisible("realResults") && journey) {
    blocks.push({
      key: "realResults",
      order: orderOf("realResults"),
      node: (
        <div key="results">
          <h3 className="text-xl font-headline font-bold text-[#0B2560] mb-4">Real Patient Results</h3>
          {journey.results.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {journey.results.slice(0, 4).map((r: any) => (
                <SliderCard key={String(r._id)} pair={r} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
              <p className="text-sm text-gray-500">Photos for this goal are being curated.</p>
              <Link href="/results" className="text-xs font-semibold text-[#3B82C4] hover:underline mt-1 inline-block">See all patient results →</Link>
            </div>
          )}
        </div>
      ),
    });
  }

  if (sectionVisible("doctorMessage") && doctorMessage) {
    blocks.push({
      key: "doctorMessage",
      order: orderOf("doctorMessage"),
      node: (
        <div key="doctor-message" className="bg-[#f6faff] border border-[#0B2560]/10 rounded-2xl p-5 flex items-start gap-3">
          <span className="text-2xl shrink-0">👨‍⚕️</span>
          <p className="text-sm text-gray-600 leading-relaxed">{doctorMessage}</p>
        </div>
      ),
    });
  }

  if (sectionVisible("aiSummaryReport") && goal && sessionId) {
    blocks.push({
      key: "aiSummaryReport",
      order: orderOf("aiSummaryReport"),
      node: (
        <AiSummaryReportCard
          key="ai-summary-report"
          goal={goal}
          sessionId={sessionId}
          goalLabel={journey?.goalLabel}
          primaryConcern={primaryConcern}
          overallConcern={journeyResult?.overallConcern}
          severity={journeyResult?.severity}
        />
      ),
    });
  }

  if (sectionVisible("bookCta")) {
    blocks.push({
      key: "bookCta",
      order: orderOf("bookCta"),
      node: (
        <div key="book-cta" className="flex flex-col sm:flex-row gap-3">
          <Link
            href={bookUrl}
            onClick={() => postAssessmentEvent({ event: "consultation_booked", goal: goal || "", sessionId: sessionId || "", primaryConcern })}
            className="flex-1 flex items-center justify-center gap-2 bg-[#0B2560] text-white px-6 py-3.5 rounded-xl font-bold text-sm hover:-translate-y-0.5 transition"
          >
            {consultationCta || "Book Consultation"} <ArrowRight size={15} />
          </Link>
          {waHref && (
            <a href={waHref} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 border border-[#25D366]/40 bg-[#25D366]/10 text-[#128C4A] px-6 py-3.5 rounded-xl font-bold text-sm hover:bg-[#25D366]/20 transition">
              <MessageCircle size={15} /> WhatsApp an Expert
            </a>
          )}
        </div>
      ),
    });
  }

  blocks.sort((a, b) => a.order - b.order);

  return (
    <div className="py-2 space-y-8">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
          {hasResult ? "Your Clinical Intake Is Complete" : `Your ${journey?.goalLabel || "Journey"}`}
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#0B2560] mb-3 tracking-tight">
          {hasResult ? "Your Pre-Consultation Summary" : `Your ${journey?.goalLabel || "Personalised"} Plan`}
        </h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          {aiExplanation || patientReport?.summary || "Based on what you shared — your doctor will confirm what's right for you after a full evaluation."}
        </p>
      </div>

      {patientReport && (patientReport.contributingFactors.length > 0 || patientReport.lifestyleFindings.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ReportList title="Contributing Factors" icon="🔎" items={patientReport.contributingFactors} />
          <ReportList title="Lifestyle Findings" icon="🌿" items={patientReport.lifestyleFindings} />
        </div>
      )}

      {blocks.map((b) => b.node)}

      {patientReport && patientReport.questionsForDoctor.length > 0 && (
        <ReportList title="Questions to Ask Your Doctor" icon="💬" items={patientReport.questionsForDoctor} />
      )}

      {onRetake && (
        <div className="text-center">
          <button onClick={onRetake} className="text-sm text-gray-500 hover:text-[#0B2560] underline underline-offset-4 transition-colors">
            Retake the assessment
          </button>
        </div>
      )}

      <p className="text-center text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
        This report is educational and does not replace a doctor's consultation. Every topic above is
        something your doctor may discuss with you after their own evaluation — not a diagnosis,
        prescription, or guaranteed outcome.
      </p>
    </div>
  );
}
