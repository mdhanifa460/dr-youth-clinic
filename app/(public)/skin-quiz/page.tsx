"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useSiteConfig } from "@/app/components/SiteConfigContext";
import { scoreAssessment, type AssessmentResult } from "@/app/lib/assessmentTypeScoring";
import type { AssessmentTypeConfig } from "@/app/lib/assessmentTypeDefaults";
import { getOrderedQuestions, canProceedFromQuestion, resolveNextQuestionId, hasNextQuestion as computeHasNextQuestion, postAssessmentEvent, getOrCreateSessionId } from "@/app/lib/assessmentFlow";
import type { AssessmentAnswers } from "@/app/lib/assessmentScoring";
import { postInterestEvent } from "@/app/lib/personalization";
import { pushDataLayerEvent } from "@/app/lib/trackConversion";
import { locations } from "@/app/data/locations";
import { isValidIndianMobile, INVALID_MOBILE_MESSAGE } from "@/app/lib/phone";
import QuestionStep from "@/app/components/assessment/QuestionStep";
import ScanPanel from "@/app/components/assessment/ScanPanel";
import TypeSelectScreen, { type AssessmentTypeOption } from "@/app/components/assessment/TypeSelectScreen";
import AssessmentResults from "@/app/components/assessment/AssessmentResults";

// The question screen's second style — a dark "AI scan" panel beside the
// genuinely visual/diagnostic questions (what's your main concern, what's
// your skin type), so it reads as meaningful rather than decorative.
// Deliberately a short, curated list, not every question — duration/
// history/lifestyle/free-text questions stay the plain list ScanPanel's
// own comment describes.
const SCAN_QUESTIONS: Record<string, { icon: string; label: string }> = {
  "primary-concern": { icon: "🔍", label: "Mapping your concern" },
  "skin-type": { icon: "💧", label: "Reading skin type" },
  "body-goal-type": { icon: "🎯", label: "Mapping your goal" },
};

// ─── Sub-Components ───────────────────────────────────────────────────────────

// Turns a QR/link's ?clinic= slug (e.g. "anna-nagar") into a display label
// ("Anna Nagar") without needing a lookup table — any branch label works,
// not just the 4 main cities.
function slugToLabel(slug: string): string {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

function IntroScreen({ onStart, clinicLabel }: { onStart: () => void; clinicLabel: string }) {
  const { skinQuizFree, consultationBadge } = useSiteConfig();
  return (
    <div className="flex flex-col items-center text-center py-6 md:py-10">
      <span className="inline-flex items-center gap-1.5 bg-[#0B2560]/10 text-[#0B2560] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
        <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] inline-block" />
        {skinQuizFree ? 'Free · No Commitment · 30-60 Seconds' : 'No Commitment · 30-60 Seconds'}
      </span>

      {clinicLabel && (
        <p className="text-sm font-semibold text-[#F5A623] mb-2">Welcome to our {clinicLabel} Clinic</p>
      )}

      <h1 className="text-3xl md:text-5xl font-extrabold text-[#0B2560] leading-tight mb-4 max-w-xl tracking-tight">
        Let's Prepare For<br />
        <span className="text-[#F5A623]">Your Consultation</span>
      </h1>

      <p className="text-gray-500 text-base md:text-lg max-w-md mb-10 leading-relaxed">
        We'll ask a few questions to understand your concern and prepare your consultation{skinQuizFree ? ' — free,' : ','} in about 30-60 seconds.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 w-full max-w-lg">
        {[
          { icon: "🩺", text: "Doctor-reviewed", sub: "before your visit" },
          { icon: "🔬", text: "Evidence-based", sub: "clinical questions" },
          { icon: "🎁", text: `${consultationBadge}`, sub: "included with intake" },
        ].map((badge) => (
          <div key={badge.text} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 flex flex-col items-center gap-1">
            <span className="text-2xl">{badge.icon}</span>
            <span className="text-xs font-bold text-[#0B2560] text-center leading-snug">{badge.text}</span>
            <span className="text-xs text-gray-500 text-center">{badge.sub}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onStart}
        className="group relative px-10 py-4 bg-[#0B2560] hover:bg-[#0d2d72] text-white font-bold text-lg rounded-2xl shadow-lg shadow-[#0B2560]/25 transition-all duration-200 hover:shadow-xl hover:shadow-[#0B2560]/30 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-3"
      >
        Start Analysis
        <span className="text-[#F5A623] group-hover:translate-x-1 transition-transform duration-200">→</span>
      </button>

      <p className="mt-4 text-xs text-gray-500">No sign-up required. Takes about 30-60 seconds.</p>
    </div>
  );
}

// Step 2 of Clinical Intake — captured immediately, before the patient has
// invested any time answering questions, so the clinic has a lead even if
// they abandon the rest of the flow. Deliberately just 3 fields (name,
// mobile, preferred clinic) — email is never asked here.
function LeadCaptureScreen({
  lead,
  setLead,
  status,
  errorMessage,
  onSubmit,
}: {
  lead: LeadCaptureForm;
  setLead: React.Dispatch<React.SetStateAction<LeadCaptureForm>>;
  status: LeadCaptureStatus;
  errorMessage: string;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <div className="py-6 md:py-10">
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 bg-[#0B2560]/10 text-[#0B2560] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] inline-block" />
          Your Details
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#0B2560] mb-2 tracking-tight">
          Let's get your consultation ready
        </h2>
        <p className="text-gray-500 text-sm md:text-base max-w-sm mx-auto">
          Just your name, number, and preferred clinic — we'll ask about your concern next.
        </p>
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
          className="w-full py-4 bg-[#0B2560] hover:bg-[#0d2d72] text-white font-bold text-base rounded-2xl shadow-lg shadow-[#0B2560]/25 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {status === "sending" ? "Saving…" : "Continue →"}
        </button>
        {status === "error" && (
          <p className="text-xs text-red-500 text-center">{errorMessage}</p>
        )}
        <p className="text-center text-xs text-gray-500">We'll never share your details. No spam, ever.</p>
      </form>
    </div>
  );
}

function AnalysingScreen() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#0B2560] animate-spin" />
        <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-[#F5A623] animate-spin [animation-direction:reverse] [animation-duration:0.8s]" />
      </div>
      <div>
        <p className="text-lg font-bold text-[#0B2560] mb-1">Analysing your answers…</p>
        <p className="text-sm text-gray-500">Preparing your assessment</p>
      </div>
      <div className="flex gap-3 mt-2 flex-wrap justify-center">
        {["Scoring your responses", "Checking your history", "Preparing your report"].map((label, i) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

// Step 2 — captured immediately, before the concern/question screens. No
// email here (see app/(public)/skin-quiz's flow-restructuring notes) —
// email is only ever collected later, as a non-blocking affordance on the
// Results screen for patients who want a copy sent to their inbox.
type LeadCaptureForm = { name: string; phone: string; preferredClinic: string };
type LeadCaptureStatus = "idle" | "sending" | "error";
const GENERIC_LEAD_ERROR = "Something went wrong — please check your details and try again.";

// ─── Main Page ────────────────────────────────────────────────────────────────

// Pre-Consultation Assessment (Hair / Skin / Body) — architecture review
// (Enterprise Connector-style artifact, "Pre-Consultation Assessment
// Redesign"). Flow: Intro -> body-area Select -> Lead Capture -> Predefined
// Questions -> deterministic scoreAssessment() -> Results (Concern % + Risk
// % + severity + contributing factors, never a treatment name) -> Book.
export default function SkinQuizPage() {
  // Read directly from window.location instead of next/navigation's
  // useSearchParams() — that hook requires a <Suspense> boundary during
  // static generation, and this value is only ever needed client-side after
  // mount anyway (campaign/QR attribution, not anything rendered on first paint).
  const [campaign, setCampaign] = useState("");
  const [qrSource, setQrSource] = useState(false);
  const [clinicLocation, setClinicLocation] = useState("");
  const [channel, setChannel] = useState("");
  const [sessionId, setSessionId] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCampaign(params.get("campaign") || "");
    setQrSource(params.get("qr") === "1");
    setClinicLocation(params.get("clinic") || "");
    setChannel(params.get("channel") || "");
    setSessionId(getOrCreateSessionId());
  }, []);

  const [typeOptions, setTypeOptions] = useState<AssessmentTypeOption[]>([]);
  const [assessmentType, setAssessmentType] = useState<string | null>(null);
  const [typeConfig, setTypeConfig] = useState<AssessmentTypeConfig | null>(null);
  const [configReady, setConfigReady] = useState(false);
  const [typeConfigLoading, setTypeConfigLoading] = useState(false);
  const [screen, setScreen] = useState<"intro" | "type" | "lead" | "question" | "analysing" | "results">("intro");
  const [visible, setVisible] = useState(true);
  const [path, setPath] = useState<string[]>([]); // visited question ids, in order
  const [answers, setAnswers] = useState<AssessmentAnswers>({});
  // Step 2 — captured immediately, before any concern/question screens.
  const [leadForm, setLeadForm] = useState<LeadCaptureForm>({ name: "", phone: "", preferredClinic: "" });
  const [leadCaptureStatus, setLeadCaptureStatus] = useState<LeadCaptureStatus>("idle");
  const [leadCaptureError, setLeadCaptureError] = useState(GENERIC_LEAD_ERROR);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string>("");
  const startedTracked = useRef(false);
  const completedTracked = useRef(false);
  const resultsPatched = useRef(false);

  useEffect(() => {
    fetch("/api/assessment-config")
      .then((r) => r.json())
      .then((d) => { if (d.success && Array.isArray(d.data)) setTypeOptions(d.data); })
      .catch(() => {})
      .finally(() => setConfigReady(true));
  }, []);

  const trackEvent = useCallback((event: "started" | "completed", opts?: { severity?: string }) => {
    postAssessmentEvent({
      event, campaign, qrSource, clinicLocation, channel, sessionId,
      assessmentType: assessmentType || "", severity: opts?.severity || "",
    });
    // Personalization Engine (Phase 1) — a completed assessment is the one
    // event type with a clean, unambiguous category (assessmentType IS
    // "hair"/"skin"/"body" already, no taxonomy mapping needed) and the
    // highest-confidence interest signal available. Other emission points
    // (treatment page views, blog reads, etc.) are deliberately not wired
    // yet — see app/lib/personalization.ts's header comment.
    if (event === "completed" && assessmentType) {
      postInterestEvent("assessment_completed", assessmentType);
    }
  }, [campaign, qrSource, clinicLocation, channel, sessionId, assessmentType]);

  const orderedQuestions = typeConfig ? getOrderedQuestions(typeConfig.questions, answers) : [];
  const currentQuestionId = path[path.length - 1];
  const currentQuestion = orderedQuestions.find((q) => q.id === currentQuestionId);
  const currentIndex = orderedQuestions.findIndex((q) => q.id === currentQuestionId);

  const transition = (fn: () => void) => {
    setVisible(false);
    setTimeout(() => {
      fn();
      // Every screen change (intro→type→lead→question, Back/Next between
      // questions, →results) goes through here — without resetting scroll,
      // a screen renders wherever the user happened to have scrolled to on
      // the PREVIOUS (often taller) screen, so a shorter new screen can
      // land mid-content or with its CTA already flush against the fixed
      // mobile bottom bar, looking like a sizing/layout bug rather than a
      // scroll-position one.
      window.scrollTo({ top: 0, behavior: "auto" });
      setVisible(true);
    }, 200);
  };

  // Welcome → body-area Select, not straight into Lead capture.
  const startAssessment = () => {
    transition(() => setScreen("type"));
  };

  const pickType = async (key: string) => {
    setTypeConfigLoading(true);
    setAssessmentType(key);
    try {
      const res = await fetch(`/api/assessment-config?type=${key}`);
      const data = await res.json();
      if (data.success && data.data) {
        setTypeConfig(data.data);
        // Track "started" only once a real assessment type is committed to —
        // matches the existing convention of tracking at the first
        // irreversible step, not on the earlier marketing screens.
        if (!startedTracked.current) { startedTracked.current = true; trackEvent("started"); }
        transition(() => setScreen("lead"));
      }
    } finally {
      setTypeConfigLoading(false);
    }
  };

  const handleLeadCaptureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidIndianMobile(leadForm.phone)) {
      setLeadCaptureError(INVALID_MOBILE_MESSAGE);
      setLeadCaptureStatus("error");
      return;
    }
    setLeadCaptureStatus("sending");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...leadForm, source: "skin-quiz", campaign, qrSource, clinicLocation, channel }),
      });
      const data = await res.json();
      if (!data.success || !data.leadId) {
        setLeadCaptureError(data.message || GENERIC_LEAD_ERROR);
        setLeadCaptureStatus("error");
        return;
      }
      setLeadId(data.leadId);
      setLeadCaptureStatus("idle");
      // GTM-routable lead conversion event — same dataLayer bridge
      // booking_confirmed already uses (see trackConversion.ts). No name/
      // phone/email — only the same non-identifying fields the booking
      // event already sends.
      pushDataLayerEvent("lead_submitted", {
        source: "skin-quiz",
        preferred_clinic: leadForm.preferredClinic || undefined,
      });
      // Reuses the clinicLocation field, but with a different meaning here:
      // for started/completed it's QR/link attribution (?clinic=), for
      // branch_selected it's the patient's own choice — both answer "which
      // physical clinic is this event about," just from different sources.
      if (leadForm.preferredClinic) {
        postAssessmentEvent({ event: "branch_selected", clinicLocation: leadForm.preferredClinic, sessionId });
      }
      const first = orderedQuestions[0];
      if (!first) { transition(() => setScreen("results")); return; }
      transition(() => { setPath([first.id]); setScreen("question"); });
    } catch {
      setLeadCaptureError(GENERIC_LEAD_ERROR);
      setLeadCaptureStatus("error");
    }
  };

  const goToResults = () => {
    transition(() => setScreen("analysing"));
  };

  useEffect(() => {
    if (screen !== "analysing" || !typeConfig) return;
    const timer = setTimeout(() => {
      const result = scoreAssessment(typeConfig, answers);
      setAssessmentResult(result);
      if (!completedTracked.current) { completedTracked.current = true; trackEvent("completed", { severity: result.severity }); }
      transition(() => setScreen("results"));
    }, 2200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // Slider/number inputs render a default value (sliderMin) as soon as they're
  // shown, but `answers` stays undefined until the user actually drags/types —
  // without this, a required slider question blocks "Next" despite already
  // displaying a valid value.
  useEffect(() => {
    if (!currentQuestion) return;
    if ((currentQuestion.type === "slider" || currentQuestion.type === "number") && answers[currentQuestion.id] === undefined) {
      setAnswers((a) => ({ ...a, [currentQuestion.id]: currentQuestion.sliderMin ?? 0 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion]);

  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const canProceed = canProceedFromQuestion(currentQuestion, currentAnswer);

  const handleNext = () => {
    if (!currentQuestion) return;
    postAssessmentEvent({ event: "step_completed", stepId: currentQuestion.id, sessionId, assessmentType: assessmentType || "" });
    const nextId = resolveNextQuestionId(currentQuestion, currentAnswer, orderedQuestions, currentIndex, path);
    if (nextId) {
      transition(() => setPath((p) => [...p, nextId]));
    } else {
      goToResults();
    }
  };

  const handleBack = () => {
    if (path.length > 1) {
      transition(() => setPath((p) => p.slice(0, -1)));
    } else {
      transition(() => setScreen("type"));
    }
  };

  // The lead already exists (captured at Step 2) by the time the patient
  // reaches Results — this silently attaches the completed answers/
  // assessmentResult to that same lead, then asks AI to explain the
  // (already-final) deterministic result in plain language — same
  // sequencing as the legacy patient-report flow. Guarded by a ref so it
  // only fires once per visit.
  useEffect(() => {
    if (screen !== "results" || !leadId || !assessmentResult || resultsPatched.current) return;
    resultsPatched.current = true;
    fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, answers, assessmentType, assessmentResult }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!data.success) throw new Error();
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
  }, [screen, leadId, assessmentResult]);

  const handleRetake = () => {
    setAnswers({});
    setPath([]);
    setLeadForm({ name: "", phone: "", preferredClinic: "" });
    setLeadCaptureStatus("idle");
    setLeadId(null);
    setAssessmentResult(null);
    setAiExplanation("");
    setAssessmentType(null);
    setTypeConfig(null);
    startedTracked.current = false;
    completedTracked.current = false;
    resultsPatched.current = false;
    transition(() => setScreen("intro"));
  };

  const totalQuestions = orderedQuestions.length;
  // Branching means the visitor's actual path can be shorter than the full
  // question set (some questions get skipped), so dividing by totalQuestions
  // understates progress and desyncs the label from what's actually being
  // asked. Estimate the path length instead: what's been visited, plus one
  // more if there's a next question to go to from here.
  const hasNextQuestion = computeHasNextQuestion(currentQuestion, currentAnswer, orderedQuestions, currentIndex, path);
  const estimatedTotal = Math.max(path.length + (hasNextQuestion ? 1 : 0), path.length, 1);
  const progressPct = screen === "intro" || screen === "type" || screen === "lead" ? 0 : screen !== "question" ? 100 : Math.round((path.length / estimatedTotal) * 100);
  const stepLabel = screen === "intro" ? "Welcome" : screen === "type" ? "Choose Assessment" : screen === "lead" ? "Your Details" : screen === "question" ? `Question ${path.length} of ${estimatedTotal}` : "Your Report";

  if (configReady && typeOptions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6faff] text-center px-6">
        <div>
          <p className="text-4xl mb-4">🩺</p>
          <p className="text-lg font-bold text-[#0B2560] mb-2">This assessment is temporarily unavailable</p>
          <Link href="/book" className="text-sm text-[#3B82C4] underline">Book a consultation instead →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6faff] via-white to-[#edf4fc]">
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100/80 shadow-sm print:hidden">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[#0B2560] hover:text-[#F5A623] transition-colors text-sm font-semibold group">
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            DR Youth Clinic
          </Link>
          <span className="text-xs text-gray-500 font-medium">{stepLabel}</span>
        </div>
        <div className="max-w-2xl mx-auto px-4 pb-2.5">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#0B2560] rounded-full transition-all duration-500 ease-in-out" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      {/* pb-28 clears the fixed MobileStickyBar (WhatsApp/Call/Book, ~62-72px
          tall incl. safe-area) on mobile — without it, in-flow CTAs like the
          question screen's Back/Next row can land underneath the bar instead
          of above it, since the bar is always pinned to the viewport bottom
          regardless of how tall this page's own content is. */}
      <div className={`max-w-2xl mx-auto px-4 py-8 pb-28 lg:pb-12 md:py-12 transition-all duration-200 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
        {screen === "intro" && !configReady && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-[#0B2560]/20 border-t-[#0B2560] animate-spin" />
            <p className="text-sm text-gray-500">Loading your personalised assessment…</p>
          </div>
        )}
        {screen === "intro" && configReady && <IntroScreen onStart={startAssessment} clinicLabel={clinicLocation ? slugToLabel(clinicLocation) : ""} />}

        {screen === "type" && (
          typeConfigLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-10 h-10 rounded-full border-4 border-[#0B2560]/20 border-t-[#0B2560] animate-spin" />
              <p className="text-sm text-gray-500">Loading…</p>
            </div>
          ) : (
            <TypeSelectScreen types={typeOptions} onPick={pickType} />
          )
        )}

        {screen === "lead" && (
          <LeadCaptureScreen
            lead={leadForm}
            setLead={setLeadForm}
            status={leadCaptureStatus}
            errorMessage={leadCaptureError}
            onSubmit={handleLeadCaptureSubmit}
          />
        )}

        {screen === "question" && currentQuestion && (
          <div>
            <div className="mb-7">
              <div className="flex items-center gap-2 mb-3">
                {Array.from({ length: estimatedTotal }).map((_, i) => (
                  <div key={i} className={`h-1 rounded-full flex-1 transition-all duration-300 ${
                    i < path.length - 1 ? "bg-[#0B2560]" : i === path.length - 1 ? "bg-[#F5A623]" : "bg-gray-200"
                  }`} />
                ))}
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-[#0B2560] mb-2 tracking-tight">{currentQuestion.title}</h2>
              {currentQuestion.subtitle && <p className="text-gray-500 text-sm md:text-base">{currentQuestion.subtitle}</p>}
            </div>

            {SCAN_QUESTIONS[currentQuestion.id] ? (
              <div className="md:grid md:grid-cols-[240px_1fr] md:gap-6 md:items-start">
                <div className="mb-5 md:mb-0 max-w-[240px] md:max-w-none mx-auto md:mx-0">
                  <ScanPanel icon={SCAN_QUESTIONS[currentQuestion.id].icon} label={SCAN_QUESTIONS[currentQuestion.id].label} />
                </div>
                <QuestionStep
                  key={currentQuestion.id}
                  question={currentQuestion}
                  value={currentAnswer}
                  onChange={(v) => setAnswers((a) => ({ ...a, [currentQuestion.id]: v }))}
                />
              </div>
            ) : (
              <QuestionStep
                key={currentQuestion.id}
                question={currentQuestion}
                value={currentAnswer}
                onChange={(v) => setAnswers((a) => ({ ...a, [currentQuestion.id]: v }))}
              />
            )}

            <div className="mt-8 flex items-center justify-between">
              <button onClick={handleBack} className="flex items-center gap-2 text-gray-500 hover:text-[#0B2560] transition-colors text-sm font-medium group">
                <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={!canProceed}
                className="group flex items-center gap-2 px-8 py-3 bg-[#0B2560] text-white font-bold rounded-xl shadow-md shadow-[#0B2560]/20 hover:bg-[#0d2d72] hover:shadow-lg hover:shadow-[#0B2560]/25 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-md transition-all duration-200 active:translate-y-0"
              >
                {currentIndex >= totalQuestions - 1 ? "See My Results" : "Next"}
                <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform group-disabled:translate-x-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {screen === "analysing" && <AnalysingScreen />}

        {screen === "results" && assessmentResult && typeConfig && (
          <AssessmentResults
            typeLabel={typeConfig.label}
            resultHeadline={typeConfig.resultTemplate?.headline || `Your ${typeConfig.label} Assessment`}
            disclaimer={typeConfig.resultTemplate?.disclaimer || "This assessment provides general guidance and is not a medical diagnosis."}
            result={assessmentResult}
            ctaRules={typeConfig.ctaRules}
            aiExplanation={aiExplanation}
            leadId={leadId}
            location={leadForm.preferredClinic}
            name={leadForm.name}
            phone={leadForm.phone}
            onRetake={handleRetake}
          />
        )}
      </div>
    </div>
  );
}
