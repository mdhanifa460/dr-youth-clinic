"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Sparkles, MapPin, Star, Check } from "lucide-react";
import { SiteConfigProvider } from "@/app/components/SiteConfigContext";
import { locations } from "@/app/data/locations";
import type { JourneyGoalSlug, JourneyGoalBundle } from "@/app/lib/journeyGoals";
import type { IJourneyGoal } from "@/app/models/JourneyConfig";
import { DEFAULT_QUIZ_CONFIG, type AssessmentConfigData, type AssessmentQuestion } from "@/app/lib/quizDefaults";
import { scoreJourneyConcern, getPrimaryConcernTag, type AssessmentAnswers } from "@/app/lib/assessmentScoring";
import { postInterestEvent } from "@/app/lib/personalization";
import { pushDataLayerEvent } from "@/app/lib/trackConversion";
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
import AiObservationsScreen, { type AiObservationsResult } from "@/app/components/assessment/AiObservationsScreen";

type Screen = "intro" | "goal-pick" | "question" | "photo-capture" | "ai-observations" | "lead" | "results";
type LeadStatus = "idle" | "sending" | "sent" | "error";

interface LeadForm {
  name: string;
  phone: string;
  preferredClinic: string;
}

// "Weight Loss" -> "weight-loss" already matches JourneyGoalSlug; the
// clinic-label helper mirrors skin-quiz's ?clinic= convention exactly
// (same query param, same locations data source) so a shared QR/link
// campaign format works across both pages. Falls back to the
// preferred_location cookie (same one Navbar.tsx reads client-side,
// middleware.ts sets from IP geolocation) when no ?clinic= is present —
// this is the "client narrows to the visitor's clinic once known" signal
// Doctor Matching (Module 7) uses to re-fetch a location-filtered doctor
// list via /api/journey-doctors.
function useClinicParam(): string {
  const [clinic, setClinic] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromParam = (params.get("clinic") || "").toLowerCase();
    if (fromParam && locations[fromParam]) {
      setClinic(fromParam);
      return;
    }
    const match = document.cookie.match(/(?:^|; )preferred_location=([^;]+)/);
    const fromCookie = match ? decodeURIComponent(match[1]).toLowerCase() : "";
    if (fromCookie && locations[fromCookie]) setClinic(fromCookie);
  }, []);
  return clinic;
}

export default function PlanMyJourneyClient({
  goals,
  bundles,
  siteConfig,
  quizConfig,
  enablePhotoCapture,
  enableAiObservations,
  aiObservationsDisclaimer,
  costPlanningNote,
}: {
  goals: IJourneyGoal[];
  bundles: Record<JourneyGoalSlug, JourneyGoalBundle>;
  siteConfig: any;
  quizConfig?: AssessmentConfigData;
  enablePhotoCapture: boolean;
  enableAiObservations: boolean;
  aiObservationsDisclaimer: string;
  costPlanningNote: string;
}) {
  return (
    <SiteConfigProvider initial={siteConfig}>
      <PlanMyJourneyFlow
        goals={goals}
        bundles={bundles}
        quizConfig={quizConfig || DEFAULT_QUIZ_CONFIG}
        enablePhotoCapture={enablePhotoCapture}
        enableAiObservations={enableAiObservations}
        aiObservationsDisclaimer={aiObservationsDisclaimer}
        costPlanningNote={costPlanningNote}
      />
    </SiteConfigProvider>
  );
}

function PlanMyJourneyFlow({
  goals,
  bundles,
  quizConfig,
  enablePhotoCapture,
  enableAiObservations,
  aiObservationsDisclaimer,
  costPlanningNote,
}: {
  goals: IJourneyGoal[];
  bundles: Record<JourneyGoalSlug, JourneyGoalBundle>;
  quizConfig: AssessmentConfigData;
  enablePhotoCapture: boolean;
  enableAiObservations: boolean;
  aiObservationsDisclaimer: string;
  costPlanningNote: string;
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
  // Plain-language explanation of journeyResult (percentage/severity) —
  // replaces patientReport as the AI narrative now that this flow's leads
  // route through /api/patient-report's assessmentType branch (see the
  // results-patch effect below), same "In Your Own Words" contract as
  // skin-quiz's AssessmentResults.tsx.
  const [aiExplanation, setAiExplanation] = useState("");
  const resultsPatched = useRef(false);
  const [sessionId, setSessionId] = useState("");
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  // Module 7 (Doctor Matching) — starts as the wider, unfiltered pool the
  // server already resolved (bundles[goal].doctors), then narrows once the
  // visitor's clinic is known (see useClinicParam). null = "no re-fetch
  // has resolved yet, still showing the wider pool."
  const [locationDoctors, setLocationDoctors] = useState<any[] | null>(null);

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  useEffect(() => {
    if (clinic) setLead((l) => ({ ...l, preferredClinic: clinic }));
  }, [clinic]);

  // Module 7 — re-fetches the doctor list scoped to the visitor's clinic
  // once both are known. lead.preferredClinic (Module 8's explicit Branch
  // Selection cards) wins over the passively auto-detected `clinic` once
  // the patient has actually confirmed/changed a branch — falls back to
  // `clinic` before that point. Resets to null (falls back to the wider
  // server-resolved pool) on goal change so switching goals via the
  // results screen's sticky switcher doesn't show a stale goal's doctors.
  const effectiveClinic = lead.preferredClinic || clinic;
  useEffect(() => {
    if (!goal || !effectiveClinic) { setLocationDoctors(null); return; }
    let cancelled = false;
    fetch(`/api/journey-doctors?goal=${encodeURIComponent(goal)}&location=${encodeURIComponent(effectiveClinic)}`)
      .then((res) => res.json())
      .then((data) => { if (!cancelled && data.success) setLocationDoctors(data.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [goal, effectiveClinic]);

  const transition = (fn: () => void) => {
    setVisible(false);
    setTimeout(() => {
      fn();
      // Every screen/question change goes through here — without resetting
      // scroll, a new (often shorter) screen renders wherever the user
      // happened to have scrolled to on the previous one, landing mid-
      // content instead of at the top. Same fix as skin-quiz/page.tsx's
      // own transition() wrapper.
      window.scrollTo({ top: 0, behavior: "auto" });
      setVisible(true);
    }, 150);
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
        body: JSON.stringify({
          sessionId,
          goal,
          currentModule: captured.length > 0 && enableAiObservations ? "ai_observations" : "lead_capture",
          photos: captured,
        }),
      }).catch(() => {});
    }
    // AI Observations needs an actual photo to look at — skip straight to
    // lead capture if the patient skipped Photo Capture, same as the
    // photo-capture step itself skipping when enablePhotoCapture is off.
    transition(() => setScreen(captured.length > 0 && enableAiObservations ? "ai-observations" : "lead"));
  };

  const handleAiObservationsDone = (result: AiObservationsResult | null) => {
    if (goal && result) {
      fetch("/api/patient-journey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          goal,
          currentModule: "lead_capture",
          aiObservations: { ...result, generatedAt: new Date().toISOString() },
        }),
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
    // seedAnswersFromTags only pre-fills answers whose OWN tags match the
    // goal's concernTags — most questions here have no seedable answer at
    // all and are meant to be asked normally, gated only by their own
    // conditionTags (getOrderedQuestions' filter), independent of whether
    // anything got seeded. Bailing out here whenever `seeded` came back
    // empty used to skip every question for a goal even when real,
    // unconditional ones existed — confirmed against Hair: 12 of 13
    // questions are conditionTags:["hair"]-gated, but the 1 unconditional
    // question that's supposed to bootstrap that tag never got a chance to
    // show, because this returned before ever computing `ordered`.
    //
    // Passing the goal's own concernTags as getOrderedQuestions' extraTags
    // closes a second, deeper gap found after that fix shipped: even the
    // one unconditional question showing didn't help if NO answer
    // anywhere carries the matching tag — conditionTags-gated questions
    // stayed unreachable forever regardless of what got answered. A goal
    // should always unlock its own gated questions; see assessmentFlow.ts.
    const concernTags = goalMap[g]?.concernTags || [];
    const seeded = seedAnswersFromTags(quizConfig.questions, concernTags);
    const ordered = getOrderedQuestions(quizConfig.questions, seeded, quizConfig.settings, concernTags);
    const firstUnanswered = ordered.find((q) => !(q.id in seeded));
    if (firstUnanswered) {
      setAnswers(seeded);
      transition(() => { setPath([firstUnanswered.id]); setScreen("question"); });
      return;
    }
    // Genuinely no question is visible for this goal at all (e.g.
    // weight-loss, until real content lands) — skip straight past Smart
    // Conversation.
    setAnswers({});
    setPath([]);
    transition(() => setScreen(afterQuestionsScreen()));
  };

  // Same extraTags as pickGoal() above — the current goal's concernTags
  // stay "unlocked" for the whole question flow, not just the initial
  // computation, so conditionTags-gated questions keep showing correctly
  // as the visitor moves from step to step.
  const orderedQuestions = getOrderedQuestions(quizConfig.questions, answers, quizConfig.settings, goal ? goalMap[goal]?.concernTags || [] : []);
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
      // GTM-routable lead conversion event — same dataLayer bridge
      // booking_confirmed uses (see trackConversion.ts). No name/phone/
      // email — only the goal category and branch, same non-identifying
      // shape as every other conversion event in this codebase.
      pushDataLayerEvent("lead_submitted", {
        source: "plan-my-journey",
        goal: goal || undefined,
        preferred_clinic: lead.preferredClinic || undefined,
      });
      if (lead.preferredClinic) {
        postAssessmentEvent({ event: "branch_selected", clinicLocation: lead.preferredClinic, goal, sessionId });
        if (goal) {
          fetch("/api/patient-journey", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, goal, currentModule: "results", matchedBranch: lead.preferredClinic }),
          }).catch(() => {});
        }
      }
      // Mirrors skin-quiz's "completed" — reaching results counts as
      // finishing the funnel here too, whether or not intake questions were
      // asked for this goal (e.g. weight-loss's straight-to-lead path still
      // ends in a real results screen).
      postAssessmentEvent({ event: "completed", goal, sessionId });
      // Personalization Engine (Phase 1) — goal is already the clean
      // category slug (hair/skin/laser/weight-loss), no mapping needed.
      // See the same note in skin-quiz/page.tsx's trackEvent.
      if (goal) postInterestEvent("assessment_completed", goal);
      setScreen("results");
    } catch {
      setLeadStatus("error");
    }
  };

  // The no-treatment-reveal, percentage-based result — same tag-weight
  // signal the old treatment-matching engine used, reframed as concern %/
  // severity instead of a treatment name (Treatment Mapping was removed
  // per a business decision: doctors and patients work from this
  // deterministic result and the raw answers, not a system-suggested
  // treatment list — see architecture note on scoreJourneyConcern).
  const journeyResult = scoreJourneyConcern(quizConfig.questions, answers, quizConfig.treatmentMap);
  const primaryConcernTag = getPrimaryConcernTag(quizConfig.questions, answers);
  const primaryConcernLabel = quizConfig.treatmentMap.find((e) => e.concernTag === primaryConcernTag)?.concernLabel || primaryConcernTag;

  // Mirrors skin-quiz's own results-patch effect — attach the completed
  // answers/journeyResult to the lead already captured, then generate a
  // patient report, but only when there's an actual clinical intake to
  // report on (journeyResult.categoryScores.length > 0). Setting
  // assessmentType: "journey" here routes this lead through
  // /api/patient-report's assessmentType branch (percentage-based, never
  // names a treatment).
  useEffect(() => {
    if (screen !== "results" || !leadId || resultsPatched.current || journeyResult.categoryScores.length === 0) return;
    resultsPatched.current = true;
    fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId, answers, primaryConcern: primaryConcernTag,
        assessmentType: "journey", assessmentResult: journeyResult,
      }),
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
      .then((data) => { if (data.success && data.data?.aiExplanation) setAiExplanation(data.data.aiExplanation); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, leadId]);

  return (
    <main className="relative bg-[#f6faff] min-h-screen">
      {/* Ambient background — see globals.css .pmj-ambient-* for why this is
          safe to leave always-on (fixed layer, compositor-only animation,
          zero network cost). Sits behind everything (z-0); the content
          column below is explicitly z-10 to stay on top of it. */}
      <div className="pmj-ambient-bg" aria-hidden="true">
        <div className="pmj-ambient-blob pmj-ambient-blob--1" />
        <div className="pmj-ambient-blob pmj-ambient-blob--2" />
        <div className="pmj-ambient-blob pmj-ambient-blob--3" />
      </div>
      <div className={`relative z-10 max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12 transition-all duration-200 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
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
        {screen === "ai-observations" && photos[0] && (
          <AiObservationsScreen
            goalLabel={goal ? goalMap[goal]?.label || "" : ""}
            photoUrl={photos[0].url}
            disclaimerText={aiObservationsDisclaimer}
            onDone={handleAiObservationsDone}
          />
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
                journeyResult={journeyResult}
                aiExplanation={aiExplanation}
                doctorMessage={quizConfig.doctorMessage}
                primaryConcern={primaryConcernLabel}
                patientReport={patientReport}
                leadId={leadId}
                journey={{
                  service: svc,
                  alternatives,
                  // Location-filtered once the visitor's clinic is known
                  // (Module 7) — falls back to the wider server-resolved
                  // pool until that re-fetch resolves.
                  doctors: locationDoctors ?? bundle?.doctors ?? [],
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
                preferredClinic={effectiveClinic}
                leadName={lead.name}
                leadPhone={lead.phone}
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
        <span className="inline-flex items-center gap-1.5 bg-[#F5A623]/15 text-[#0B2560] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
          {goalLabel} · Question {stepNumber}{totalSteps > 0 ? ` of ${totalSteps}` : ""}
        </span>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-5">
          <div className="h-full bg-[#F5A623] rounded-full transition-all duration-300 ease-out" style={{ width: `${progressPct}%` }} />
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#0B2560] mb-2 tracking-tight">
          <HighlightedTitle title={question.title} />
          {question.icon && <span className="ml-2 align-middle">{question.icon}</span>}
        </h2>
        {question.subtitle && <p className="text-gray-500 text-sm md:text-base">{question.subtitle}</p>}
      </div>

      <QuestionStep key={question.id} question={question} value={value} onChange={onChange} theme="gold" />

      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-gray-100 text-[#0B2560] font-bold rounded-xl hover:border-gray-200 transition-all duration-200"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="group relative flex items-center gap-2 px-8 py-3 text-[#0B2560] font-bold rounded-xl transition-all duration-200 disabled:cursor-not-allowed enabled:shadow-md enabled:shadow-[#F5A623]/25 enabled:hover:shadow-lg enabled:hover:shadow-[#F5A623]/35 enabled:hover:-translate-y-0.5 active:translate-y-0"
          style={
            canProceed
              ? { background: "linear-gradient(90deg, #F9D889 0%, #F5A623 55%, #E08E12 100%)" }
              : { background: "#E7E9F2", color: "#9CA3AF" }
          }
        >
          {hasNext ? "Next" : "Continue →"}
          <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}

// Question titles can mark a phrase for the gold-accent treatment shown in
// the redesign — e.g. "What's your **skin type**?" — by wrapping it in
// double asterisks (plain-text convention, no schema/admin-UI change
// needed since `title` is already a free-text field). A title with no
// markers renders exactly as before, in solid navy.
function HighlightedTitle({ title }: { title: string }) {
  const parts = title.split(/\*\*(.+?)\*\*/g);
  if (parts.length === 1) return <>{title}</>;
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="text-[#F5A623]">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// AI Beauty Journey Module 8 — an explicit, visible branch confirmation
// instead of a bare <select>, pre-selected from Module 7's auto-detected
// clinic (still changeable). Picking a card here is the same signal that
// drives Doctor Matching's location filter (see the useClinicParam /
// locationDoctors effect above) — so confirming a branch here immediately
// narrows the doctor list the results screen will show.
function BranchSelectionCards({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Object.entries(locations).map(([key, loc]) => {
        const selected = value === key;
        return (
          <button
            type="button"
            key={key}
            onClick={() => onChange(key)}
            className={`relative text-left rounded-2xl border-2 p-4 transition-all duration-200 ${
              selected ? "border-[#0B2560] bg-[#0B2560]/5 shadow-md shadow-[#0B2560]/10" : "border-gray-100 bg-white hover:border-[#0B2560]/30"
            }`}
          >
            {selected && (
              <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#0B2560] flex items-center justify-center">
                <Check size={12} className="text-white" />
              </span>
            )}
            <p className={`font-bold text-sm ${selected ? "text-[#0B2560]" : "text-gray-800"}`}>{loc.name}</p>
            <p className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              <MapPin size={11} className="shrink-0" /> {loc.address}
            </p>
            <p className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              <Star size={11} className="fill-[#F5A623] text-[#F5A623] shrink-0" /> {loc.rating} ({loc.reviewCount} reviews) · {loc.doctorCount} specialists
            </p>
          </button>
        );
      })}
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

      <form onSubmit={onSubmit} className="space-y-4 max-w-lg mx-auto">
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
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Choose Your Branch</label>
          <BranchSelectionCards value={lead.preferredClinic} onChange={(key) => setLead((l) => ({ ...l, preferredClinic: key }))} />
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

