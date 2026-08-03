"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { SiteConfigProvider } from "@/app/components/SiteConfigContext";
import { locations } from "@/app/data/locations";
import type { JourneyGoalSlug, JourneyGoalBundle } from "@/app/lib/journeyGoals";
import type { IJourneyGoal } from "@/app/models/JourneyConfig";
import { DEFAULT_QUIZ_CONFIG, type AssessmentConfigData, type AssessmentQuestion } from "@/app/lib/quizDefaults";
import { scoreRecommendations, getPrimaryConcernTag, type AssessmentAnswers } from "@/app/lib/assessmentScoring";
import {
  seedAnswersFromTags,
  getOrderedQuestions,
  canProceedFromQuestion,
  resolveNextQuestionId,
  hasNextQuestion as computeHasNextQuestion,
  postAssessmentEvent,
  getOrCreateSessionId,
} from "@/app/lib/assessmentFlow";
import QuestionStep from "@/app/components/assessment/QuestionStep";
import UnifiedJourneyResults, { type PatientReport } from "@/app/components/assessment/UnifiedJourneyResults";
import PhotoCaptureScreen, { type CapturedPhoto } from "@/app/components/assessment/PhotoCaptureScreen";

type Screen = "intro" | "goal-pick" | "question" | "photo-capture" | "lead" | "results";
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
  goals,
  bundles,
  siteConfig,
  quizConfig,
  enablePhotoCapture,
}: {
  goals: IJourneyGoal[];
  bundles: Record<JourneyGoalSlug, JourneyGoalBundle>;
  siteConfig: any;
  quizConfig?: AssessmentConfigData;
  enablePhotoCapture: boolean;
}) {
  return (
    <SiteConfigProvider initial={siteConfig}>
      <PlanMyJourneyFlow goals={goals} bundles={bundles} quizConfig={quizConfig || DEFAULT_QUIZ_CONFIG} enablePhotoCapture={enablePhotoCapture} />
    </SiteConfigProvider>
  );
}

function PlanMyJourneyFlow({
  goals,
  bundles,
  quizConfig,
  enablePhotoCapture,
}: {
  goals: IJourneyGoal[];
  bundles: Record<JourneyGoalSlug, JourneyGoalBundle>;
  quizConfig: AssessmentConfigData;
  enablePhotoCapture: boolean;
}) {
  const clinic = useClinicParam();
  const goalMap = useMemo(() => Object.fromEntries(goals.map((g) => [g.slug, g])), [goals]);
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
  const [leadId, setLeadId] = useState<string | null>(null);
  const [patientReport, setPatientReport] = useState<PatientReport | null>(null);
  const resultsPatched = useRef(false);
  const [sessionId, setSessionId] = useState("");
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  useEffect(() => {
    if (clinic) setLead((l) => ({ ...l, preferredClinic: clinic }));
  }, [clinic]);

  const transition = (fn: () => void) => {
    setVisible(false);
    setTimeout(() => { fn(); setVisible(true); }, 150);
  };

  // Where the flow goes once Smart Conversation's questions are done (or
  // skipped entirely for a goal with no mapped questions) — AI Photo
  // Capture when the admin has it enabled, straight to lead capture
  // otherwise, same as before this module existed.
  const afterQuestionsScreen = (): Screen => (enablePhotoCapture ? "photo-capture" : "lead");

  const handlePhotoCaptureDone = (captured: CapturedPhoto[]) => {
    setPhotos(captured);
    if (goal) {
      fetch("/api/patient-journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, goal, currentModule: "lead_capture", photos: captured }),
      }).catch(() => {});
    }
    transition(() => setScreen("lead"));
  };

  const pickGoal = (g: JourneyGoalSlug) => {
    setGoal(g);
    setServiceId(String(bundles[g]?.services?.[0]?._id || ""));
    // Fired alongside goal_selected (not instead of it) so the top-line
    // Intakes Started / Completed funnel — previously skin-quiz-only —
    // reflects Plan My Journey traffic too, and the goal funnel can pair
    // each goal's "completed" sessions against how many started it.
    postAssessmentEvent({ event: "started", goal: g, sessionId });
    postAssessmentEvent({ event: "goal_selected", goal: g, sessionId });
    const seeded = seedAnswersFromTags(quizConfig.questions, goalMap[g]?.concernTags || []);
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
    // until real content lands) — skip straight past Smart Conversation.
    setAnswers({});
    setPath([]);
    transition(() => setScreen(afterQuestionsScreen()));
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
    postAssessmentEvent({ event: "step_completed", stepId: currentQuestion.id, goal, sessionId });
    const nextId = resolveNextQuestionId(currentQuestion, currentAnswer, orderedQuestions, currentIndex, path);
    if (nextId) {
      transition(() => setPath((p) => [...p, nextId]));
    } else {
      transition(() => setScreen(afterQuestionsScreen()));
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
      const data = await res.json();
      if (!res.ok || !data.success || !data.leadId) throw new Error("failed");
      setLeadId(data.leadId);
      setLeadStatus("sent");
      if (lead.preferredClinic) {
        postAssessmentEvent({ event: "branch_selected", clinicLocation: lead.preferredClinic, goal, sessionId });
      }
      // Mirrors skin-quiz's "completed" — reaching results counts as
      // finishing the funnel here too, whether or not intake questions were
      // asked for this goal (e.g. weight-loss's straight-to-lead path still
      // ends in a real results screen).
      postAssessmentEvent({ event: "completed", goal, sessionId });
      setScreen("results");
    } catch {
      setLeadStatus("error");
    }
  };

  // Same scoring engine skin-quiz uses — only produces real recommendations
  // when goal-filtered intake questions were actually answered (see
  // goal.concernTags bridging); empty for goals with no mapped questions
  // yet, in which case UnifiedJourneyResults falls back to the matched
  // Service data alone.
  const recommendations = scoreRecommendations(
    quizConfig.questions,
    answers,
    quizConfig.treatmentMap,
    { maxRecommendations: quizConfig.settings?.maxRecommendations, confidenceThreshold: quizConfig.settings?.confidenceThreshold }
  );
  const primaryConcernTag = getPrimaryConcernTag(quizConfig.questions, answers);
  const primaryConcernLabel = quizConfig.treatmentMap.find((e) => e.concernTag === primaryConcernTag)?.concernLabel || primaryConcernTag;

  // Mirrors skin-quiz's own results-patch effect exactly — attach the
  // completed answers/recommendations to the lead already captured, then
  // generate a patient report, but only when there's an actual clinical
  // intake to report on (recommendations.length > 0).
  useEffect(() => {
    if (screen !== "results" || !leadId || resultsPatched.current || recommendations.length === 0) return;
    resultsPatched.current = true;
    fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, answers, recommendations, primaryConcern: primaryConcernTag }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`PATCH failed (${res.status})`))))
      .then((data) => {
        if (!data.success) throw new Error(data.message || "PATCH failed");
        return fetch("/api/patient-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId }),
        });
      })
      .then((res) => res.json())
      .then((data) => { if (data.success) setPatientReport(data.data); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, leadId]);

  return (
    <main className="bg-[#f6faff] min-h-screen">
      <div className={`max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12 transition-all duration-200 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
        {screen === "intro" && <IntroScreen goals={goals} onStart={() => setScreen("goal-pick")} />}
        {screen === "goal-pick" && <GoalPickScreen goals={goals} bundles={bundles} onPick={pickGoal} />}
        {screen === "question" && currentQuestion && (
          <QuestionScreen
            question={currentQuestion}
            value={currentAnswer}
            onChange={(v) => setAnswers((a) => ({ ...a, [currentQuestion.id]: v }))}
            canProceed={canProceed}
            hasNext={hasNext}
            stepNumber={path.length}
            totalSteps={orderedQuestions.length}
            goalLabel={goal ? goalMap[goal]?.label || "" : ""}
            onNext={handleQuestionNext}
            onBack={handleQuestionBack}
          />
        )}
        {screen === "photo-capture" && (
          <PhotoCaptureScreen goalLabel={goal ? goalMap[goal]?.label || "" : ""} onDone={handlePhotoCaptureDone} />
        )}
        {screen === "lead" && (
          <LeadCaptureScreen lead={lead} setLead={setLead} status={leadStatus} onSubmit={submitLead} goalLabel={goal ? goalMap[goal]?.label || "" : ""} />
        )}
      </div>

      {screen === "results" && goal && goalMap[goal] && (() => {
        const bundle = bundles[goal];
        const services = bundle?.services || [];
        const svc = services.find((s: any) => String(s._id) === serviceId) || services[0];
        const alternatives = services.filter((s: any) => String(s._id) !== String(svc?._id));
        const meta = goalMap[goal];
        return (
          <div>
            {/* Sticky goal switcher */}
            <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-100 py-3">
              <div className="max-w-4xl mx-auto px-4 flex items-center gap-2 overflow-x-auto">
                {goals.map((g) => (
                  <button
                    key={g.slug}
                    onClick={() => { setGoal(g.slug); setServiceId(String(bundles[g.slug]?.services?.[0]?._id || "")); }}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition ${g.slug === goal ? "bg-[#0B2560] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                  >
                    {g.icon} {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-10">
              <UnifiedJourneyResults
                resultSections={quizConfig.resultSections?.length ? quizConfig.resultSections : DEFAULT_QUIZ_CONFIG.resultSections}
                recommendations={recommendations}
                doctorMessage={quizConfig.doctorMessage}
                primaryConcern={primaryConcernLabel}
                patientReport={patientReport}
                enableChat={quizConfig.settings?.enableChat !== false}
                enableEmail={quizConfig.settings?.enableEmail !== false}
                leadId={leadId}
                journey={{
                  service: svc,
                  alternatives,
                  doctors: bundle?.doctors || [],
                  results: bundle?.results || [],
                  goalIcon: meta.icon,
                  goalLabel: meta.label,
                  onSwitchService: (id: string) => {
                    setServiceId(id);
                    postAssessmentEvent({ event: "service_selected", goal, sessionId });
                  },
                }}
                goal={goal}
                sessionId={sessionId}
              />
            </div>
          </div>
        );
      })()}
    </main>
  );
}

function IntroScreen({ goals, onStart }: { goals: IJourneyGoal[]; onStart: () => void }) {
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
        {goals.map((g) => (
          <div key={g.slug} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-3 py-4 flex flex-col items-center gap-1">
            <span className="text-2xl">{g.icon}</span>
            <span className="text-[11px] font-bold text-[#0B2560] text-center leading-snug">{g.label}</span>
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

function GoalPickScreen({
  goals,
  bundles,
  onPick,
}: {
  goals: IJourneyGoal[];
  bundles: Record<JourneyGoalSlug, JourneyGoalBundle>;
  onPick: (g: JourneyGoalSlug) => void;
}) {
  return (
    <div className="py-6 md:py-10">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#0B2560] mb-2 tracking-tight">What's your goal?</h2>
        <p className="text-gray-500 text-sm md:text-base">We'll build your journey around it.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
        {goals.map((meta) => {
          const count = bundles[meta.slug]?.services?.length || 0;
          return (
            <button
              key={meta.slug}
              onClick={() => onPick(meta.slug)}
              className={`relative overflow-hidden rounded-3xl p-6 text-left text-white shadow-lg transition-transform hover:-translate-y-1 bg-gradient-to-br ${meta.heroGrad}`}
            >
              <span className="text-3xl">{meta.icon}</span>
              <p className="font-headline font-extrabold text-lg mt-3">{meta.label}</p>
              <p className="text-white/70 text-xs mt-1">{count > 0 ? `${count} treatment${count !== 1 ? "s" : ""} available` : "Ask about options"}</p>
              <span className="inline-flex items-center gap-1 text-xs font-bold mt-4">
                {meta.ctaLabel || "Choose"} <ArrowRight size={12} />
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
  totalSteps,
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
  totalSteps: number;
  goalLabel: string;
  onNext: () => void;
  onBack: () => void;
}) {
  // Branching means totalSteps can shift as answers change (a later
  // question may become irrelevant and drop out of the count) — this is
  // an approximation of "how far along", same caveat any branching quiz
  // progress bar has, not an exact step count promise.
  const progressPct = totalSteps > 0 ? Math.min(100, Math.round((stepNumber / totalSteps) * 100)) : 0;

  return (
    <div className="py-6 md:py-10">
      <div className="mb-7">
        <span className="inline-flex items-center gap-1.5 bg-[#0B2560]/10 text-[#0B2560] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
          {goalLabel} · Question {stepNumber}{totalSteps > 0 ? ` of ${totalSteps}` : ""}
        </span>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-5">
          <div className="h-full bg-[#0B2560] rounded-full transition-all duration-300 ease-out" style={{ width: `${progressPct}%` }} />
        </div>
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

