"use client";

// One results screen shared by both Free Clinical Intake (/skin-quiz) and
// Plan My Journey (/plan-my-journey) — extracted so the two flows converge
// into a single "Journey Engine" output instead of maintaining two parallel
// results implementations. Which blocks render is driven entirely by (a)
// the admin's resultSections order/visibility config (app/admin/ai-
// assessment's Settings tab) and (b) which data is actually present:
// Clinical Intake's scored `recommendations` render whenever the visitor
// answered branching questions (both flows can produce these now — see
// GOAL_CONCERN_TAGS bridging in journeyGoals.ts); Plan My Journey's real
// matched-Service presentation (`journey` prop) only renders when a real
// Service document was matched. Neither flow fabricates the other's data —
// a section simply doesn't render when its underlying data doesn't exist.
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, MessageCircle } from "lucide-react";
import { useSiteConfig } from "@/app/components/SiteConfigContext";
import type { TreatmentRecommendation, ResultSectionConfig, ResultSectionKey } from "@/app/lib/quizDefaults";
import { postAssessmentEvent } from "@/app/lib/assessmentFlow";
import TreatmentComparison from "@/app/components/TreatmentComparison";
import TreatmentJourney from "@/app/components/TreatmentJourney";
import TreatmentJourneyExplorer from "@/app/components/TreatmentJourneyExplorer";
import RecoveryTimeline from "@/app/components/RecoveryTimeline";
import AiJourneySimulator from "@/app/components/AiJourneySimulator";
import CostEstimator from "@/app/components/CostEstimator";
import EMICalculator from "@/app/components/EMICalculator";
import SliderCard from "@/app/components/SliderCard";
import AssessmentChat from "./AssessmentChat";

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

const CONFIDENCE_BADGE: Record<string, string> = {
  High: "bg-[#0B2560]/8 text-[#0B2560]",
  Medium: "bg-[#F5A623]/15 text-[#c47e00]",
  Low: "bg-gray-100 text-gray-500",
};

function TreatmentCard({ treatment, rank, goal, sessionId }: { treatment: TreatmentRecommendation; rank: number; goal?: string; sessionId?: string }) {
  const { consultationCta } = useSiteConfig();
  const bookUrl = `/book?service=${encodeURIComponent(treatment.name)}`;
  const confidenceLevel = treatment.confidenceLevel || "Medium";

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
      rank === 0 ? "border-[#0B2560] shadow-md shadow-[#0B2560]/10" : "border-gray-100 shadow-sm"
    }`}>
      {rank === 0 && (
        <div className="bg-[#0B2560] text-white text-xs font-bold uppercase tracking-widest text-center py-1.5 px-4">
          Most Relevant Discussion Topic
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{treatment.icon}</span>
            <h3 className="font-bold text-[#0B2560] text-base leading-tight">{treatment.name}</h3>
          </div>
          <span className={`flex-shrink-0 text-xs font-bold rounded-full px-3 py-1 ${CONFIDENCE_BADGE[confidenceLevel] || CONFIDENCE_BADGE.Medium}`}>
            {confidenceLevel} Confidence
          </span>
        </div>

        <p className="text-sm text-gray-600 leading-relaxed mb-4">{treatment.description}</p>

        <div className="flex flex-wrap gap-2 mb-3">
          {treatment.sessions && (
            <span className="inline-flex items-center gap-1 text-xs bg-[#f6faff] text-[#0B2560] rounded-lg px-3 py-1.5 font-medium border border-[#0B2560]/10">
              📅 {treatment.sessions}
            </span>
          )}
          {treatment.price && (
            <span className="inline-flex items-center gap-1 text-xs bg-[#F5A623]/10 text-[#c47e00] rounded-lg px-3 py-1.5 font-medium border border-[#F5A623]/20">
              ₹ {treatment.price}
            </span>
          )}
          {treatment.recovery && (
            <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 rounded-lg px-3 py-1.5 font-medium border border-green-100">
              ⏱ {treatment.recovery}
            </span>
          )}
        </div>

        {(treatment.advantages?.length || treatment.disadvantages?.length) ? (
          <div className="mb-4 space-y-1">
            {treatment.advantages?.slice(0, 2).map((a, i) => (
              <p key={i} className="text-xs text-green-700 flex items-start gap-1.5"><span>✓</span>{a}</p>
            ))}
            {treatment.disadvantages?.slice(0, 1).map((d, i) => (
              <p key={i} className="text-xs text-gray-500 flex items-start gap-1.5"><span>–</span>{d}</p>
            ))}
          </div>
        ) : null}

        <Link
          href={bookUrl}
          onClick={() => postAssessmentEvent({ event: "consultation_booked", goal: goal || "", sessionId: sessionId || "", primaryConcern: treatment.name })}
          className="block w-full text-center py-3 rounded-xl font-bold text-sm transition-all duration-200 bg-[#0B2560] text-white hover:bg-[#0d2d72] shadow-sm hover:shadow-md hover:shadow-[#0B2560]/20"
        >
          {treatment.cta || consultationCta}
        </Link>
      </div>
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

// Surfaces the doctor/AI-drafted-then-doctor-reviewed clinical content that
// already exists on every TreatmentRecommendation (see the admin's Treatment
// Mapping tab + "AI Suggest") but was never shown to the patient before —
// the "why is this happening to you" narrative, not just a treatment card.
// Deliberately excludes `doctorNotes`: that field is internal guidance for
// the doctor reviewing the entry, never patient-facing (see the AI Suggest
// prompt in app/api/admin/quiz/ai-suggest). Honest empty state: renders
// nothing if a concern's content hasn't been authored yet, rather than
// showing an empty shell.
function RootCauseRow({ icon, title, items, tint, caution }: { icon: string; title: string; items: string[]; tint?: boolean; caution?: boolean }) {
  return (
    <div className={`rounded-xl p-4 border ${caution ? "bg-amber-50 border-amber-100" : tint ? "bg-[#f6faff] border-[#0B2560]/10" : "border-gray-100"}`}>
      <p className="text-xs font-bold text-[#0B2560] mb-2 flex items-center gap-1.5">
        <span>{icon}</span> {title}
      </p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-gray-600 leading-relaxed flex items-start gap-2">
            <span className={`mt-1 shrink-0 ${caution ? "text-amber-500" : "text-[#F5A623]"}`}>•</span> {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RootCauseAnalysis({ treatment }: { treatment: TreatmentRecommendation }) {
  const hasContent =
    treatment.clinicalIndicators.length > 0 ||
    treatment.possibleCauses.length > 0 ||
    treatment.suggestedEvaluation.length > 0 ||
    treatment.patientEducation.length > 0;
  if (!hasContent) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="bg-[#0B2560] px-5 py-3.5 flex items-center gap-2.5">
        <span className="text-lg">🔬</span>
        <div>
          <p className="text-white font-bold text-sm leading-tight">Your Root Cause Analysis</p>
          <p className="text-white/60 text-[11px] leading-tight">Based on your answers — confirmed by your doctor at consultation</p>
        </div>
      </div>
      <div className="p-5 space-y-3">
        {treatment.clinicalIndicators.length > 0 && (
          <RootCauseRow icon="🔍" title="What we noticed in your answers" items={treatment.clinicalIndicators} />
        )}
        {treatment.possibleCauses.length > 0 && (
          <RootCauseRow icon="🧭" title="Possible causes to explore with your doctor" items={treatment.possibleCauses} tint />
        )}
        {treatment.suggestedEvaluation.length > 0 && (
          <RootCauseRow icon="🩺" title="What your doctor will likely check" items={treatment.suggestedEvaluation} />
        )}
        {treatment.contraindications.length > 0 && (
          <RootCauseRow icon="⚠️" title="Worth mentioning to your doctor" items={treatment.contraindications} caution />
        )}
        {treatment.patientEducation.length > 0 && (
          <RootCauseRow icon="📘" title="In plain terms" items={treatment.patientEducation} />
        )}
      </div>
    </div>
  );
}

// Small, self-contained "email me a copy" affordance — not a gate (the
// report is already unlocked once a lead exists), purely an optional
// convenience. Calls the same PATCH endpoint that persists completed
// answers, this time with an email attached.
function EmailCopyForm({ leadId }: { leadId: string | null }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadId || !email.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, email: email.trim() }),
      });
      const data = await res.json();
      setStatus(data.success ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div className="bg-green-50 border border-green-100 rounded-2xl px-5 py-3 flex items-center gap-3 text-sm text-green-800">
        <span className="text-lg">✅</span> Sent — check your inbox (and spam folder).
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col sm:flex-row items-stretch gap-2">
      <input
        type="email" value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder="Email me a copy of this report (optional)"
        className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-100 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#0B2560]/40"
      />
      <button
        type="submit" disabled={status === "sending" || !email.trim()}
        className="px-5 py-3 bg-[#0B2560] hover:bg-[#0d2d72] text-white font-bold text-sm rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
      >
        {status === "sending" ? "Sending…" : "Email Me a Copy"}
      </button>
      {status === "error" && <p className="text-xs text-red-500 sm:self-center">Something went wrong — please try again.</p>}
    </form>
  );
}

export default function UnifiedJourneyResults({
  resultSections,
  recommendations,
  doctorMessage,
  primaryConcern,
  patientReport,
  enableChat,
  enableEmail,
  leadId,
  onRetake,
  journey,
  goal,
  sessionId,
}: {
  resultSections: ResultSectionConfig[];
  recommendations: TreatmentRecommendation[];
  doctorMessage: string;
  primaryConcern: string;
  patientReport: PatientReport | null;
  enableChat: boolean;
  enableEmail: boolean;
  leadId: string | null;
  onRetake?: () => void;
  journey?: JourneyPresentationData;
  // Analytics only (Phase 4) — empty string is a valid, expected value for
  // skin-quiz, which has no goal concept of its own.
  goal?: string;
  sessionId?: string;
}) {
  const { publicWhatsApp, consultationCta, showPriceOnCards } = useSiteConfig() as any;

  // Plan My Journey with no matched Service at all (e.g. weight-loss before
  // Phase 3 content lands) — nothing clinical to show either, since no
  // questions were asked for this goal. Keep this as its own simple screen
  // rather than forcing it through the full clinical-intake-flavored layout
  // below, which assumes there's at least a recommendation or a service.
  if (journey && !journey.service && recommendations.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-16 text-center">
        <span className="text-5xl">{journey.goalIcon}</span>
        <h2 className="text-2xl font-headline font-bold text-[#0B2560] mt-4">{journey.goalLabel} treatments coming soon</h2>
        <p className="text-gray-500 max-w-md mx-auto mt-2">We're preparing options for this goal. Book a consultation and our specialists will guide you directly.</p>
        <Link href="/book" className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-7 py-3.5 rounded-xl font-bold text-sm hover:-translate-y-0.5 transition mt-6">
          {consultationCta || "Book a Consultation"} <ArrowRight size={15} />
        </Link>
      </div>
    );
  }

  const sectionVisible = (key: ResultSectionKey) => resultSections.find((s) => s.key === key)?.visible !== false;
  const orderOf = (key: ResultSectionKey) => resultSections.find((s) => s.key === key)?.order ?? 999;

  const svc = journey?.service;
  const alternatives = journey?.alternatives || [];

  // Same combined semantics as the original two independent toggles: "All"
  // wins if both happen to be visible, "Top" narrows to just the #1 match,
  // neither visible means no recommendation card renders at all.
  const showAll = sectionVisible("allRecommendations");
  const showTop = sectionVisible("topRecommendation");
  const visibleRecommendations = showAll ? recommendations : showTop ? recommendations.slice(0, 1) : [];
  const recommendationsOrder = showAll ? orderOf("allRecommendations") : orderOf("topRecommendation");

  const bookServiceName = recommendations[0]?.name || svc?.name || "";
  const bookUrl = bookServiceName ? `/book?service=${encodeURIComponent(bookServiceName)}` : "/book";
  const waHref = publicWhatsApp
    ? `https://wa.me/${String(publicWhatsApp).replace(/\D/g, "")}${bookServiceName ? `?text=${encodeURIComponent(`Hi, I just completed my clinical intake and would like to know more about ${bookServiceName} before my consultation.`)}` : ""}`
    : "";

  type Block = { key: ResultSectionKey; order: number; node: React.ReactNode };
  const blocks: Block[] = [];

  if (visibleRecommendations.length > 0) {
    blocks.push({
      key: showAll ? "allRecommendations" : "topRecommendation",
      order: recommendationsOrder,
      node: (
        <div key="recommendations" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {visibleRecommendations.map((rec, i) => (
            <TreatmentCard key={rec.id} treatment={rec} rank={i} goal={goal} sessionId={sessionId} />
          ))}
        </div>
      ),
    });
  } else if (recommendations.length === 0 && !svc) {
    // Neither engine matched anything — the one case worth an explicit
    // empty state, mirroring the original honest "no fabrication" fallback.
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

  if (sectionVisible("rootCauseAnalysis") && recommendations[0]) {
    blocks.push({
      key: "rootCauseAnalysis",
      order: orderOf("rootCauseAnalysis"),
      node: <RootCauseAnalysis key="root-cause" treatment={recommendations[0]} />,
    });
  }

  if (sectionVisible("journeyExplorer") && svc) {
    blocks.push({
      key: "journeyExplorer",
      order: orderOf("journeyExplorer"),
      node: (
        <div key="journey" className="space-y-6">
          <div>
            <h3 className="text-xl font-headline font-bold text-[#0B2560] mb-1">{svc.name}</h3>
            {alternatives.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {alternatives.map((alt: any) => (
                  <button
                    key={String(alt._id)}
                    onClick={() => journey?.onSwitchService?.(String(alt._id))}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-600 hover:border-[#0B2560]/30"
                  >
                    Compare: {alt.name}
                  </button>
                ))}
              </div>
            )}
            {alternatives.length > 0 && (
              <div className="mt-5">
                <TreatmentComparison current={svc} alternatives={alternatives} showPrice={showPriceOnCards} />
              </div>
            )}
          </div>

          {svc.journeyExplorer?.length ? (
            <TreatmentJourneyExplorer stages={svc.journeyExplorer} serviceName={svc.name} />
          ) : (
            <TreatmentJourney sessions={svc.sessionsCount || 6} treatmentName={svc.name} phases={svc.journeyPhases} />
          )}

          <RecoveryTimeline recoveryTime={svc.recoveryTime} stages={svc.recoveryStages} />

          <AiJourneySimulator key={String(svc._id)} serviceId={String(svc._id)} serviceName={svc.name} />
        </div>
      ),
    });
  }

  if (sectionVisible("costEstimator") && svc) {
    blocks.push({
      key: "costEstimator",
      order: orderOf("costEstimator"),
      node: (
        <div key="cost" className="grid sm:grid-cols-2 gap-6">
          <CostEstimator basePrice={svc.price} sessionsRequired={svc.sessionsRequired} serviceName={svc.name} />
          <EMICalculator price={svc.price} />
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

  if (sectionVisible("emailForm") && enableEmail && leadId) {
    blocks.push({
      key: "emailForm",
      order: orderOf("emailForm"),
      node: <EmailCopyForm key="email" leadId={leadId} />,
    });
  }

  blocks.sort((a, b) => a.order - b.order);

  return (
    <div className="py-2 space-y-8">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
          {recommendations.length > 0 ? "Your Clinical Intake Is Complete" : `Your ${journey?.goalLabel || "Journey"}`}
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#0B2560] mb-3 tracking-tight">
          {recommendations.length > 0 ? "Possible Discussion Topics for Your Consultation" : svc?.name || "Your Personalised Plan"}
        </h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          {patientReport?.summary || "Based on what you shared — your doctor will confirm what's right for you after a full evaluation."}
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

      {enableChat && recommendations.length > 0 && (
        <AssessmentChat primaryConcern={primaryConcern} recommendations={recommendations} doctorMessage={doctorMessage} />
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
