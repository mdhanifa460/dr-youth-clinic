"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, MessageCircle, Sparkles } from "lucide-react";
import { SiteConfigProvider, useSiteConfig } from "@/app/components/SiteConfigContext";
import { locations } from "@/app/data/locations";
import { JOURNEY_GOALS, JOURNEY_GOAL_META, GOAL_CONCERN_TAGS, type JourneyGoalSlug, type JourneyGoalBundle } from "@/app/lib/journeyGoals";
import { DEFAULT_QUIZ_CONFIG, type AssessmentConfigData, type AssessmentQuestion } from "@/app/lib/quizDefaults";
import type { AssessmentAnswers } from "@/app/lib/assessmentScoring";
import {
  seedAnswersFromTags,
  getOrderedQuestions,
  canProceedFromQuestion,
  resolveNextQuestionId,
  hasNextQuestion as computeHasNextQuestion,
} from "@/app/lib/assessmentFlow";
import QuestionStep from "@/app/components/assessment/QuestionStep";
import TreatmentComparison from "@/app/components/TreatmentComparison";
import TreatmentJourney from "@/app/components/TreatmentJourney";
import TreatmentJourneyExplorer from "@/app/components/TreatmentJourneyExplorer";
import RecoveryTimeline from "@/app/components/RecoveryTimeline";
import AiJourneySimulator from "@/app/components/AiJourneySimulator";
import CostEstimator from "@/app/components/CostEstimator";
import EMICalculator from "@/app/components/EMICalculator";
import SliderCard from "@/app/components/SliderCard";

type Screen = "intro" | "goal-pick" | "question" | "lead" | "results";
type LeadStatus = "idle" | "sending" | "sent" | "error";

interface LeadForm {
  name: string;
  phone: string;
  preferredClinic: string;
}

// "Weight Loss" -> "weight-loss" already matches JourneyGoalSlug; the
// clinic-label helper mirrors skin-quiz's ?clinic= convention exactly
// (same query param, same locations data source) so a shared QR/link
// campaign format works across both pages.
function useClinicParam(): string {
  const [clinic, setClinic] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = (params.get("clinic") || "").toLowerCase();
    if (raw && locations[raw]) setClinic(raw);
  }, []);
  return clinic;
}

export default function PlanMyJourneyClient({
  bundles,
  siteConfig,
  quizConfig,
}: {
  bundles: Record<JourneyGoalSlug, JourneyGoalBundle>;
  siteConfig: any;
  quizConfig?: AssessmentConfigData;
}) {
  return (
    <SiteConfigProvider initial={siteConfig}>
      <PlanMyJourneyFlow bundles={bundles} quizConfig={quizConfig || DEFAULT_QUIZ_CONFIG} />
    </SiteConfigProvider>
  );
}

function PlanMyJourneyFlow({ bundles, quizConfig }: { bundles: Record<JourneyGoalSlug, JourneyGoalBundle>; quizConfig: AssessmentConfigData }) {
  const clinic = useClinicParam();
  const [screen, setScreen] = useState<Screen>("intro");
  const [goal, setGoal] = useState<JourneyGoalSlug | null>(null);
  const [serviceId, setServiceId] = useState<string>("");
  const [lead, setLead] = useState<LeadForm>({ name: "", phone: "", preferredClinic: clinic });
  const [leadStatus, setLeadStatus] = useState<LeadStatus>("idle");
  // Goal-filtered intake questions (Clinical Intake's engine, reused rather
  // than duplicated — see seedAnswersFromTags in assessmentFlow.ts).
  const [path, setPath] = useState<string[]>([]);
  const [answers, setAnswers] = useState<AssessmentAnswers>({});
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (clinic) setLead((l) => ({ ...l, preferredClinic: clinic }));
  }, [clinic]);

  const transition = (fn: () => void) => {
    setVisible(false);
    setTimeout(() => { fn(); setVisible(true); }, 150);
  };

  const pickGoal = (g: JourneyGoalSlug) => {
    setGoal(g);
    setServiceId(String(bundles[g]?.services?.[0]?._id || ""));
    const seeded = seedAnswersFromTags(quizConfig.questions, GOAL_CONCERN_TAGS[g]);
    if (Object.keys(seeded).length > 0) {
      const ordered = getOrderedQuestions(quizConfig.questions, seeded, quizConfig.settings);
      const firstUnanswered = ordered.find((q) => !(q.id in seeded));
      if (firstUnanswered) {
        setAnswers(seeded);
        transition(() => { setPath([firstUnanswered.id]); setScreen("question"); });
        return;
      }
    }
    // No mapped concern questions for this goal yet (e.g. weight-loss,
    // until real content lands) — go straight to lead capture, same as
    // before this bridging existed.
    setAnswers({});
    setPath([]);
    transition(() => setScreen("lead"));
  };

  const orderedQuestions = getOrderedQuestions(quizConfig.questions, answers, quizConfig.settings);
  const currentQuestionId = path[path.length - 1];
  const currentQuestion = orderedQuestions.find((q) => q.id === currentQuestionId);
  const currentIndex = orderedQuestions.findIndex((q) => q.id === currentQuestionId);
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const canProceed = canProceedFromQuestion(currentQuestion, currentAnswer);
  const hasNext = computeHasNextQuestion(currentQuestion, currentAnswer, orderedQuestions, currentIndex, path);

  const handleQuestionNext = () => {
    if (!currentQuestion) return;
    const nextId = resolveNextQuestionId(currentQuestion, currentAnswer, orderedQuestions, currentIndex, path);
    if (nextId) {
      transition(() => setPath((p) => [...p, nextId]));
    } else {
      transition(() => setScreen("lead"));
    }
  };

  const handleQuestionBack = () => {
    if (path.length > 1) {
      transition(() => setPath((p) => p.slice(0, -1)));
    } else {
      transition(() => { setPath([]); setScreen("goal-pick"); });
    }
  };

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeadStatus("sending");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...lead, source: "plan-my-journey", city: lead.preferredClinic, clinicLocation: lead.preferredClinic }),
      });
      if (!res.ok) throw new Error("failed");
      setLeadStatus("sent");
      setScreen("results");
    } catch {
      setLeadStatus("error");
    }
  };

  return (
    <main className="bg-[#f6faff] min-h-screen">
      <div className={`max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12 transition-all duration-200 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
        {screen === "intro" && <IntroScreen onStart={() => setScreen("goal-pick")} />}
        {screen === "goal-pick" && <GoalPickScreen bundles={bundles} onPick={pickGoal} />}
        {screen === "question" && currentQuestion && (
          <QuestionScreen
            question={currentQuestion}
            value={currentAnswer}
            onChange={(v) => setAnswers((a) => ({ ...a, [currentQuestion.id]: v }))}
            canProceed={canProceed}
            hasNext={hasNext}
            stepNumber={path.length}
            goalLabel={goal ? JOURNEY_GOAL_META[goal].label : ""}
            onNext={handleQuestionNext}
            onBack={handleQuestionBack}
          />
        )}
        {screen === "lead" && (
          <LeadCaptureScreen lead={lead} setLead={setLead} status={leadStatus} onSubmit={submitLead} goalLabel={goal ? JOURNEY_GOAL_META[goal].label : ""} />
        )}
      </div>

      {screen === "results" && goal && (
        <ResultsScreen
          bundles={bundles}
          goal={goal}
          serviceId={serviceId}
          onSwitchGoal={(g) => { setGoal(g); setServiceId(String(bundles[g]?.services?.[0]?._id || "")); }}
          onSwitchService={setServiceId}
        />
      )}
    </main>
  );
}

function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center text-center py-6 md:py-10">
      <span className="inline-flex items-center gap-1.5 bg-[#0B2560]/10 text-[#0B2560] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
        <Sparkles size={12} className="text-[#F5A623]" />
        AI-Personalised · Real Doctors · Real Results
      </span>

      <h1 className="text-3xl md:text-5xl font-extrabold text-[#0B2560] leading-tight mb-4 max-w-xl tracking-tight">
        Plan Your<br />
        <span className="text-[#F5A623]">Treatment Journey</span>
      </h1>

      <p className="text-gray-500 text-base md:text-lg max-w-md mb-10 leading-relaxed">
        Pick your goal and get an AI-personalised month-by-month journey, matched doctors, real
        patient results, and a cost plan — all in one place.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10 w-full max-w-lg">
        {JOURNEY_GOALS.map((g) => (
          <div key={g} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-3 py-4 flex flex-col items-center gap-1">
            <span className="text-2xl">{JOURNEY_GOAL_META[g].icon}</span>
            <span className="text-[11px] font-bold text-[#0B2560] text-center leading-snug">{JOURNEY_GOAL_META[g].label}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onStart}
        className="group relative px-10 py-4 bg-[#0B2560] hover:bg-[#0d2d72] text-white font-bold text-lg rounded-2xl shadow-lg shadow-[#0B2560]/25 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-3"
      >
        Get Started
        <ArrowRight size={18} className="text-[#F5A623] group-hover:translate-x-1 transition-transform duration-200" />
      </button>

      <p className="mt-4 text-xs text-gray-500">Takes about a minute. No sign-up required to start.</p>
    </div>
  );
}

function GoalPickScreen({ bundles, onPick }: { bundles: Record<JourneyGoalSlug, JourneyGoalBundle>; onPick: (g: JourneyGoalSlug) => void }) {
  return (
    <div className="py-6 md:py-10">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#0B2560] mb-2 tracking-tight">What's your goal?</h2>
        <p className="text-gray-500 text-sm md:text-base">We'll build your journey around it.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
        {JOURNEY_GOALS.map((g) => {
          const meta = JOURNEY_GOAL_META[g];
          const count = bundles[g]?.services?.length || 0;
          return (
            <button
              key={g}
              onClick={() => onPick(g)}
              className={`relative overflow-hidden rounded-3xl p-6 text-left text-white shadow-lg transition-transform hover:-translate-y-1 bg-gradient-to-br ${meta.heroGrad}`}
            >
              <span className="text-3xl">{meta.icon}</span>
              <p className="font-headline font-extrabold text-lg mt-3">{meta.label}</p>
              <p className="text-white/70 text-xs mt-1">{count > 0 ? `${count} treatment${count !== 1 ? "s" : ""} available` : "Ask about options"}</p>
              <span className="inline-flex items-center gap-1 text-xs font-bold mt-4">
                Choose <ArrowRight size={12} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Renders one Clinical Intake question, goal-filtered — same QuestionStep
// component and branching engine skin-quiz uses (see assessmentFlow.ts),
// just wrapped in Plan My Journey's own visual chrome/copy.
function QuestionScreen({
  question,
  value,
  onChange,
  canProceed,
  hasNext,
  stepNumber,
  goalLabel,
  onNext,
  onBack,
}: {
  question: AssessmentQuestion;
  value: string | string[] | number | undefined;
  onChange: (v: string | string[] | number) => void;
  canProceed: boolean;
  hasNext: boolean;
  stepNumber: number;
  goalLabel: string;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="py-6 md:py-10">
      <div className="mb-7">
        <span className="inline-flex items-center gap-1.5 bg-[#0B2560]/10 text-[#0B2560] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5">
          {goalLabel} · Question {stepNumber}
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#0B2560] mb-2 tracking-tight">{question.title}</h2>
        {question.subtitle && <p className="text-gray-500 text-sm md:text-base">{question.subtitle}</p>}
      </div>

      <QuestionStep key={question.id} question={question} value={value} onChange={onChange} />

      <div className="mt-8 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-[#0B2560] transition-colors text-sm font-medium">
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="group flex items-center gap-2 px-8 py-3 bg-[#0B2560] text-white font-bold rounded-xl shadow-md shadow-[#0B2560]/20 hover:bg-[#0d2d72] hover:shadow-lg hover:shadow-[#0B2560]/25 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-md transition-all duration-200 active:translate-y-0"
        >
          {hasNext ? "Next" : "Continue →"}
          <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}

function LeadCaptureScreen({
  lead,
  setLead,
  status,
  onSubmit,
  goalLabel,
}: {
  lead: LeadForm;
  setLead: React.Dispatch<React.SetStateAction<LeadForm>>;
  status: LeadStatus;
  onSubmit: (e: React.FormEvent) => void;
  goalLabel: string;
}) {
  return (
    <div className="py-6 md:py-10">
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 bg-[#0B2560]/10 text-[#0B2560] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5">
          {goalLabel} · Almost there
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#0B2560] mb-2 tracking-tight">Where should we send your plan?</h2>
        <p className="text-gray-500 text-sm md:text-base max-w-sm mx-auto">Just your name, number, and preferred clinic.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 max-w-sm mx-auto">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Full Name</label>
          <input
            type="text" required value={lead.name}
            onChange={(e) => setLead((l) => ({ ...l, name: e.target.value }))}
            placeholder="Your name"
            className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-100 bg-white text-gray-800 text-sm focus:outline-none focus:border-[#0B2560]/40"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Mobile Number</label>
          <input
            type="tel" required value={lead.phone}
            onChange={(e) => setLead((l) => ({ ...l, phone: e.target.value }))}
            placeholder="10-digit mobile number"
            className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-100 bg-white text-gray-800 text-sm focus:outline-none focus:border-[#0B2560]/40"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Preferred Clinic</label>
          <select
            value={lead.preferredClinic}
            onChange={(e) => setLead((l) => ({ ...l, preferredClinic: e.target.value }))}
            className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-100 bg-white text-gray-800 text-sm font-semibold focus:outline-none focus:border-[#0B2560]/40"
          >
            <option value="">Select a clinic (optional)</option>
            {Object.entries(locations).map(([key, loc]) => (
              <option key={key} value={key}>{loc.name}</option>
            ))}
          </select>
        </div>
        <button
          type="submit" disabled={status === "sending"}
          className="w-full py-4 bg-[#0B2560] hover:bg-[#0d2d72] text-white font-bold text-base rounded-2xl shadow-lg shadow-[#0B2560]/25 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-60"
        >
          {status === "sending" ? "Saving…" : "See My Journey →"}
        </button>
        {status === "error" && (
          <p className="text-xs text-red-500 text-center">Something went wrong — please check your details and try again.</p>
        )}
        <p className="text-center text-xs text-gray-500">We'll never share your details. No spam, ever.</p>
      </form>
    </div>
  );
}

function ResultsScreen({
  bundles,
  goal,
  serviceId,
  onSwitchGoal,
  onSwitchService,
}: {
  bundles: Record<JourneyGoalSlug, JourneyGoalBundle>;
  goal: JourneyGoalSlug;
  serviceId: string;
  onSwitchGoal: (g: JourneyGoalSlug) => void;
  onSwitchService: (id: string) => void;
}) {
  const { showPriceOnCards, consultationCta, publicWhatsApp } = useSiteConfig() as any;
  const bundle = bundles[goal];
  const services = bundle?.services || [];
  const svc = services.find((s: any) => String(s._id) === serviceId) || services[0];
  const alternatives = services.filter((s: any) => String(s._id) !== String(svc?._id));
  const meta = JOURNEY_GOAL_META[goal];
  const waHref = publicWhatsApp ? `https://wa.me/${String(publicWhatsApp).replace(/\D/g, "")}` : "";

  if (!svc) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-16 text-center">
        <span className="text-5xl">{meta.icon}</span>
        <h2 className="text-2xl font-headline font-bold text-[#0B2560] mt-4">{meta.label} treatments coming soon</h2>
        <p className="text-gray-500 max-w-md mx-auto mt-2">We're preparing options for this goal. Book a consultation and our specialists will guide you directly.</p>
        <Link href="/book" className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-7 py-3.5 rounded-xl font-bold text-sm hover:-translate-y-0.5 transition mt-6">
          {consultationCta || "Book a Consultation"} <ArrowRight size={15} />
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Sticky goal switcher */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-100 py-3">
        <div className="max-w-4xl mx-auto px-4 flex items-center gap-2 overflow-x-auto">
          {JOURNEY_GOALS.map((g) => (
            <button
              key={g}
              onClick={() => onSwitchGoal(g)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition ${g === goal ? "bg-[#0B2560] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
            >
              {JOURNEY_GOAL_META[g].icon} {JOURNEY_GOAL_META[g].label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-10 space-y-10">
        {/* Primary service + alternates */}
        <div>
          <h2 className="text-2xl md:text-3xl font-headline font-bold text-[#0B2560]">{svc.name}</h2>
          {alternatives.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {alternatives.map((alt: any) => (
                <button
                  key={String(alt._id)}
                  onClick={() => onSwitchService(String(alt._id))}
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

        {/* Journey */}
        {svc.journeyExplorer?.length ? (
          <TreatmentJourneyExplorer stages={svc.journeyExplorer} serviceName={svc.name} />
        ) : (
          <TreatmentJourney sessions={svc.sessionsCount || 6} treatmentName={svc.name} phases={svc.journeyPhases} />
        )}

        <RecoveryTimeline recoveryTime={svc.recoveryTime} stages={svc.recoveryStages} />

        <AiJourneySimulator key={String(svc._id)} serviceId={String(svc._id)} serviceName={svc.name} />

        {/* Matched doctors */}
        {bundle.doctors?.length > 0 && (
          <div>
            <h3 className="text-xl font-headline font-bold text-[#0B2560] mb-4">Doctors For This Goal</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {bundle.doctors.slice(0, 3).map((d: any) => (
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
        )}

        {/* Real results */}
        <div>
          <h3 className="text-xl font-headline font-bold text-[#0B2560] mb-4">Real Patient Results</h3>
          {bundle.results?.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {bundle.results.slice(0, 4).map((r: any) => (
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

        {/* Cost + EMI */}
        <div className="grid sm:grid-cols-2 gap-6">
          <CostEstimator basePrice={svc.price} sessionsRequired={svc.sessionsRequired} serviceName={svc.name} />
          <EMICalculator price={svc.price} />
        </div>

        {/* Book CTA */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/book" className="flex-1 flex items-center justify-center gap-2 bg-[#0B2560] text-white px-6 py-3.5 rounded-xl font-bold text-sm hover:-translate-y-0.5 transition">
            {consultationCta || "Book Consultation"} <ArrowRight size={15} />
          </Link>
          {waHref && (
            <a href={waHref} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 border border-[#25D366]/40 bg-[#25D366]/10 text-[#128C4A] px-6 py-3.5 rounded-xl font-bold text-sm hover:bg-[#25D366]/20 transition">
              <MessageCircle size={15} /> WhatsApp an Expert
            </a>
          )}
        </div>

        <p className="text-center text-[11px] text-gray-500 max-w-lg mx-auto">
          This journey is AI-personalised guidance based on typical cases, not a diagnosis. Your doctor confirms the right plan for you at consultation.
        </p>
      </div>
    </div>
  );
}
