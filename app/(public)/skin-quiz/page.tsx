"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useSiteConfig } from "@/app/components/SiteConfigContext";
import { DEFAULT_QUIZ_CONFIG, type AssessmentConfigData, type AssessmentQuestion, type TreatmentRecommendation } from "@/app/lib/quizDefaults";
import { scoreRecommendations, getPrimaryConcernTag, type AssessmentAnswers } from "@/app/lib/assessmentScoring";
import AssessmentChat from "./AssessmentChat";

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

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function IntroScreen({ onStart, clinicLabel }: { onStart: () => void; clinicLabel: string }) {
  const { skinQuizFree, consultationBadge } = useSiteConfig();
  return (
    <div className="flex flex-col items-center text-center py-6 md:py-10">
      <span className="inline-flex items-center gap-1.5 bg-[#0B2560]/10 text-[#0B2560] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
        <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] inline-block" />
        {skinQuizFree ? 'Free · No Commitment · 60 Seconds' : 'No Commitment · 60 Seconds'}
      </span>

      {clinicLabel && (
        <p className="text-sm font-semibold text-[#F5A623] mb-2">Welcome to our {clinicLabel} Clinic</p>
      )}

      <h1 className="text-3xl md:text-5xl font-extrabold text-[#0B2560] leading-tight mb-4 max-w-xl tracking-tight">
        Discover Your<br />
        <span className="text-[#F5A623]">Perfect Treatment</span>
      </h1>

      <p className="text-gray-500 text-base md:text-lg max-w-md mb-10 leading-relaxed">
        Answer a few quick questions. Get an AI-matched treatment plan from DR Youth's experts{skinQuizFree ? ' — free,' : ','} in under a minute.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 w-full max-w-lg">
        {[
          { icon: "🏆", text: "Based on 50,000+", sub: "patient outcomes" },
          { icon: "🔬", text: "Evidence-based", sub: "matching algorithm" },
          { icon: "🎁", text: `${consultationBadge}`, sub: "included with results" },
        ].map((badge) => (
          <div key={badge.text} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 flex flex-col items-center gap-1">
            <span className="text-2xl">{badge.icon}</span>
            <span className="text-xs font-bold text-[#0B2560] text-center leading-snug">{badge.text}</span>
            <span className="text-xs text-gray-400 text-center">{badge.sub}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onStart}
        className="group relative px-10 py-4 bg-[#0B2560] hover:bg-[#0d2d72] text-white font-bold text-lg rounded-2xl shadow-lg shadow-[#0B2560]/25 transition-all duration-200 hover:shadow-xl hover:shadow-[#0B2560]/30 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-3"
      >
        Start My Assessment
        <span className="text-[#F5A623] group-hover:translate-x-1 transition-transform duration-200">→</span>
      </button>

      <p className="mt-4 text-xs text-gray-400">No sign-up required. Results in under a minute.</p>
    </div>
  );
}

function SelectionCheck({ selected }: { selected: boolean }) {
  return (
    <span className={`absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
      selected ? "bg-[#0B2560] scale-100 opacity-100" : "bg-gray-100 scale-90 opacity-0"
    }`}>
      <CheckIcon />
    </span>
  );
}

// Uploads straight to Cloudinary via a dedicated, rate-limited public route
// (app/api/assessment-photo-upload) — never blocks progress: skipping is
// always allowed regardless of the question's Required setting, since asking
// a visitor to mandatorily upload a photo of their face/skin is bad practice.
function PhotoUploadField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError("");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/assessment-photo-upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Upload failed");
      onChange(data.data.secure_url);
    } catch (err: any) {
      setError(err.message || "Upload failed — please try again or skip this step.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 px-6 py-10 text-center">
      {value ? (
        <div className="flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Uploaded photo" className="w-32 h-32 rounded-xl object-cover shadow-sm" />
          <button
            type="button"
            onClick={() => { onChange(""); if (inputRef.current) inputRef.current.value = ""; }}
            className="text-xs font-semibold text-red-500 hover:text-red-700"
          >
            Remove photo
          </button>
        </div>
      ) : (
        <label className="cursor-pointer flex flex-col items-center gap-3">
          <span className="text-4xl">📷</span>
          <span className="text-sm font-bold text-[#0B2560]">{uploading ? "Uploading…" : "Tap to add a photo"}</span>
          <span className="text-xs text-gray-400">Optional — you can skip this step</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </label>
      )}
      {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
    </div>
  );
}

// One generic renderer for every question type — replaces the 5 bespoke
// per-step components the old fixed-question quiz had, since questions are
// now admin-defined and their number/order isn't fixed at build time.
function QuestionStep({
  question,
  value,
  onChange,
}: {
  question: AssessmentQuestion;
  value: string | string[] | number | undefined;
  onChange: (v: string | string[] | number) => void;
}) {
  if (question.type === "photo") {
    return <PhotoUploadField value={typeof value === "string" ? value : ""} onChange={onChange} />;
  }

  if (question.type === "text") {
    const text = typeof value === "string" ? value : "";
    return (
      <div className="bg-white rounded-2xl border-2 border-gray-100 px-5 py-4">
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value.slice(0, 500))}
          maxLength={500}
          rows={5}
          placeholder="Type here… (optional)"
          className="w-full resize-none border-none outline-none text-gray-800 text-sm placeholder-gray-400"
        />
        <p className="text-right text-xs text-gray-300 mt-1">{text.length}/500</p>
      </div>
    );
  }

  if (question.type === "slider" || question.type === "number") {
    const num = typeof value === "number" ? value : question.sliderMin;
    return (
      <div className="bg-white rounded-2xl border-2 border-gray-100 px-6 py-8">
        <div className="flex items-baseline justify-between mb-4">
          <span className="text-3xl font-extrabold text-[#0B2560]">{num}</span>
          {question.sliderUnit && <span className="text-sm text-gray-400">{question.sliderUnit}</span>}
        </div>
        <input
          type="range"
          min={question.sliderMin}
          max={question.sliderMax}
          step={question.sliderStep || 1}
          value={num}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-[#0B2560]"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{question.sliderMin}</span>
          <span>{question.sliderMax}</span>
        </div>
      </div>
    );
  }

  if (question.type === "dropdown") {
    return (
      <select
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 bg-white text-gray-800 font-semibold focus:outline-none focus:border-[#0B2560]"
      >
        <option value="">Select an option</option>
        {question.answers.map((a) => (
          <option key={a.id} value={a.id}>{a.title}</option>
        ))}
      </select>
    );
  }

  if (question.type === "yesno") {
    return (
      <div className="flex gap-3">
        {question.answers.map((a) => {
          const selected = value === a.id;
          return (
            <button
              key={a.id}
              onClick={() => onChange(a.id)}
              className={`flex-1 flex items-center justify-center gap-2 rounded-2xl border-2 px-6 py-6 font-bold text-lg transition-all duration-200 ${
                selected ? "border-[#0B2560] bg-[#0B2560] text-white shadow-md shadow-[#0B2560]/25" : "border-gray-100 bg-white text-gray-700 hover:border-[#0B2560]/30"
              }`}
            >
              {a.icon && <span className="text-2xl">{a.icon}</span>}
              {a.title}
            </button>
          );
        })}
      </div>
    );
  }

  // single / multi / image / emoji — same card-grid visual language
  const isMulti = question.type === "multi";
  const selectedIds = isMulti ? (Array.isArray(value) ? value : []) : [];
  const singleId = !isMulti && typeof value === "string" ? value : "";

  const toggle = (id: string) => {
    if (isMulti) {
      const next = selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id];
      onChange(next);
    } else {
      onChange(id);
    }
  };

  const hasDescriptions = question.answers.some((a) => a.description);

  return (
    <div className={hasDescriptions ? "flex flex-col gap-3" : "grid grid-cols-2 md:grid-cols-3 gap-3"}>
      {question.answers.map((a) => {
        const selected = isMulti ? selectedIds.includes(a.id) : singleId === a.id;
        return (
          <button
            key={a.id}
            onClick={() => toggle(a.id)}
            className={`relative flex items-center gap-4 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer ${
              hasDescriptions ? "px-5 py-4" : "flex-col justify-center gap-2 px-3 py-5 text-center"
            } ${
              selected ? "border-[#0B2560] bg-[#0B2560]/5 shadow-md shadow-[#0B2560]/10" : "border-gray-100 bg-white hover:border-[#0B2560]/30 hover:shadow-sm"
            }`}
          >
            <SelectionCheck selected={selected} />
            {a.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.image} alt={a.title} className="w-12 h-12 rounded-xl object-cover shrink-0" />
            ) : (
              <span className={hasDescriptions ? "text-2xl flex-shrink-0" : "text-3xl leading-none"}>{a.icon}</span>
            )}
            <div>
              <p className={`font-bold text-sm ${selected ? "text-[#0B2560]" : "text-gray-800"}`}>{a.title}</p>
              {a.description && <p className="text-xs text-gray-500 mt-0.5">{a.description}</p>}
            </div>
          </button>
        );
      })}
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
        <p className="text-sm text-gray-500">Matching against 50,000+ patient outcomes</p>
      </div>
      <div className="flex gap-3 mt-2 flex-wrap justify-center">
        {["Matching treatments", "Comparing protocols", "Preparing your plan"].map((label, i) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function TreatmentCard({ treatment, rank }: { treatment: TreatmentRecommendation; rank: number }) {
  const { consultationCta } = useSiteConfig();
  const bookUrl = `/book?service=${encodeURIComponent(treatment.name)}`;

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
      rank === 0 ? "border-[#0B2560] shadow-md shadow-[#0B2560]/10" : "border-gray-100 shadow-sm"
    }`}>
      {rank === 0 && (
        <div className="bg-[#0B2560] text-white text-xs font-bold uppercase tracking-widest text-center py-1.5 px-4">
          Top Match for You
        </div>
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{treatment.icon}</span>
            <h3 className="font-bold text-[#0B2560] text-base leading-tight">{treatment.name}</h3>
          </div>
          <span className="flex-shrink-0 text-sm font-black text-[#0B2560] bg-[#0B2560]/8 rounded-full px-3 py-1">
            {treatment.confidence}%
          </span>
        </div>

        <div className="mb-4">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${treatment.confidence}%`, background: rank === 0 ? "linear-gradient(90deg, #0B2560, #1a4a8a)" : "#0B2560" }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">{treatment.confidence}% match with your profile</p>
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
              <p key={i} className="text-xs text-gray-400 flex items-start gap-1.5"><span>–</span>{d}</p>
            ))}
          </div>
        ) : null}

        <Link
          href={bookUrl}
          className="block w-full text-center py-3 rounded-xl font-bold text-sm transition-all duration-200 bg-[#0B2560] text-white hover:bg-[#0d2d72] shadow-sm hover:shadow-md hover:shadow-[#0B2560]/20"
        >
          {treatment.cta || consultationCta}
        </Link>
      </div>
    </div>
  );
}

type LeadForm = { name: string; phone: string; email: string; city: string };
type LeadStatus = "idle" | "sending" | "sent" | "saved" | "error";

function ResultsScreen({
  recommendations,
  doctorMessage,
  primaryConcern,
  showDoctorMessage,
  showTopRecommendation,
  showAllRecommendations,
  showBookCta,
  showChat,
  leadCaptured,
  emailSent,
  onRetake,
}: {
  recommendations: TreatmentRecommendation[];
  doctorMessage: string;
  primaryConcern: string;
  showDoctorMessage: boolean;
  showTopRecommendation: boolean;
  showAllRecommendations: boolean;
  showBookCta: boolean;
  showChat: boolean;
  leadCaptured: boolean;
  emailSent: boolean;
  onRetake: () => void;
}) {
  const { publicWhatsApp } = useSiteConfig();
  const waQuizHref = publicWhatsApp
    ? `https://wa.me/${publicWhatsApp.replace(/\D/g, '')}?text=Hi%2C%20I%20just%20completed%20the%20AI%20skin%20%26%20hair%20assessment%20and%20would%20like%20to%20know%20more%20about%20my%20treatment%20plan.`
    : null;

  // 'allRecommendations' shows the full ranked list; 'topRecommendation' alone
  // narrows it down to just the #1 match — same data, different Settings toggle.
  const visibleRecommendations = showAllRecommendations
    ? recommendations
    : showTopRecommendation
    ? recommendations.slice(0, 1)
    : [];

  return (
    <div className="py-2">
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
          Your Plan is Ready
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#0B2560] mb-3 tracking-tight">
          Your Personalised Treatment Plan
        </h2>
        {recommendations[0] && (
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Overall match: <span className="font-semibold text-[#0B2560]">{recommendations[0].confidence}%</span>
          </p>
        )}
      </div>

      {visibleRecommendations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 mb-10">
          We couldn't match a treatment to your answers — a specialist will review your responses personally.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {visibleRecommendations.map((rec, i) => (
            <TreatmentCard key={rec.id} treatment={rec} rank={i} />
          ))}
        </div>
      )}

      {leadCaptured && (
        <div className="bg-green-50 border border-green-100 rounded-2xl px-5 py-3 mb-8 flex items-center gap-3 text-sm text-green-800">
          <span className="text-lg">{emailSent ? "✅" : "👍"}</span>
          {emailSent ? "Your full report has been emailed to you — check your inbox (and spam folder)." : "Report unlocked — our team will reach out to you shortly."}
        </div>
      )}

      {showDoctorMessage && doctorMessage && (
        <div className="bg-[#f6faff] border border-[#0B2560]/10 rounded-2xl p-5 mb-8 flex items-start gap-3">
          <span className="text-2xl shrink-0">👨‍⚕️</span>
          <p className="text-sm text-gray-600 leading-relaxed">{doctorMessage}</p>
        </div>
      )}

      {showChat && recommendations.length > 0 && (
        <div className="mb-8">
          <AssessmentChat primaryConcern={primaryConcern} recommendations={recommendations} doctorMessage={doctorMessage} />
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        {showBookCta && waQuizHref && (
          <a
            href={waQuizHref} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-6 py-3 bg-[#25D366] hover:bg-[#1ebe57] text-white font-bold rounded-xl text-sm transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Speak to a doctor now
          </a>
        )}
        <button onClick={onRetake} className="text-sm text-gray-400 hover:text-[#0B2560] underline underline-offset-4 transition-colors">
          Retake the assessment
        </button>
      </div>
    </div>
  );
}

// Reframes match confidence as a motivational "score" — current match quality
// vs. an estimated reachable score once the recommended treatment plan is
// followed. Same underlying number as TreatmentCard's confidence, just
// presented the way a fitness/skin-scoring app would.
function ScoreGauge({ confidence }: { confidence: number }) {
  const potential = Math.min(98, confidence + 18);
  return (
    <div className="flex items-center justify-center gap-8 bg-white rounded-2xl border-2 border-gray-100 px-8 py-6 mb-6">
      <div className="text-center">
        <p className="text-4xl font-extrabold text-[#0B2560]">{confidence}%</p>
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mt-1">Your Score Today</p>
      </div>
      <div className="text-2xl text-[#F5A623]">→</div>
      <div className="text-center">
        <p className="text-4xl font-extrabold text-[#F5A623]">{potential}%</p>
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mt-1">Reachable With Treatment</p>
      </div>
    </div>
  );
}

// Shown right after "Analysing" — a teaser of the top match plus a locked
// preview of the rest, so the visitor invests in reading their result before
// being asked for contact details. Name/Phone/Email submit unlocks the full
// ResultsScreen (same lead-capture endpoint, just moved earlier in the flow).
function ResultsPreview({
  topRecommendation,
  lockedCount,
  lead,
  setLead,
  leadStatus,
  onLeadSubmit,
}: {
  topRecommendation: TreatmentRecommendation | undefined;
  lockedCount: number;
  lead: LeadForm;
  setLead: React.Dispatch<React.SetStateAction<LeadForm>>;
  leadStatus: LeadStatus;
  onLeadSubmit: (e: React.FormEvent) => void;
}) {
  const [unlocking, setUnlocking] = useState(false);

  return (
    <div className="py-2">
      <div className="text-center mb-6">
        <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
          Your Plan is Ready
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#0B2560] mb-1 tracking-tight">
          Your Personalised Treatment Plan
        </h2>
      </div>

      {topRecommendation && <ScoreGauge confidence={topRecommendation.confidence} />}

      {topRecommendation && (
        <div className="mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Top Match</p>
          <TreatmentCard treatment={topRecommendation} rank={0} />
        </div>
      )}

      {lockedCount > 0 && (
        <div className="relative rounded-2xl overflow-hidden mb-6 border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 blur-sm select-none pointer-events-none opacity-60">
            {Array.from({ length: lockedCount }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-100 rounded-xl" />
            ))}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/40 backdrop-blur-[1px]">
            <span className="text-2xl">🔒</span>
            <p className="text-sm font-bold text-[#0B2560]">
              {lockedCount} more personalised treatment{lockedCount > 1 ? "s" : ""} matched to you
            </p>
          </div>
        </div>
      )}

      {!unlocking ? (
        <button
          onClick={() => setUnlocking(true)}
          className="w-full py-4 bg-[#0B2560] hover:bg-[#0d2d72] text-white font-bold text-base rounded-2xl shadow-lg shadow-[#0B2560]/25 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
        >
          🔓 Unlock My Full Report
        </button>
      ) : (
        <div className="bg-gradient-to-br from-[#0B2560] to-[#1a4a8a] rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-[#0B2560]/20">
          <div className="max-w-md mx-auto text-center">
            <h3 className="text-xl font-bold mb-2">Unlock Your Full Report</h3>
            <p className="text-sm text-blue-200 mb-5">
              See every matched treatment, pricing, and your doctor's personal note.
            </p>
            {(leadStatus === "idle" || leadStatus === "sending" || leadStatus === "error") && (
              <form onSubmit={onLeadSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text" value={lead.name} onChange={(e) => setLead((l) => ({ ...l, name: e.target.value }))}
                    placeholder="Your name" required
                    className="px-4 py-3 rounded-xl bg-white/15 border border-white/20 placeholder-blue-300 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F5A623] focus:border-transparent"
                  />
                  <input
                    type="tel" value={lead.phone} onChange={(e) => setLead((l) => ({ ...l, phone: e.target.value }))}
                    placeholder="Phone number" required
                    className="px-4 py-3 rounded-xl bg-white/15 border border-white/20 placeholder-blue-300 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F5A623] focus:border-transparent"
                  />
                </div>
                <input
                  type="email" value={lead.email} onChange={(e) => setLead((l) => ({ ...l, email: e.target.value }))}
                  placeholder="your@email.com" required
                  className="w-full px-4 py-3 rounded-xl bg-white/15 border border-white/20 placeholder-blue-300 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F5A623] focus:border-transparent"
                />
                <button
                  type="submit" disabled={leadStatus === "sending"}
                  className="w-full px-6 py-3 bg-[#F5A623] hover:bg-[#e09520] text-[#0B2560] font-bold rounded-xl text-sm transition-all duration-200 hover:shadow-lg disabled:opacity-60"
                >
                  {leadStatus === "sending" ? "Unlocking…" : "Unlock Full Report"}
                </button>
              </form>
            )}
            {leadStatus === "error" && (
              <p className="text-xs text-red-200 mt-2">Something went wrong — please try again.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SkinQuizPage() {
  // Read directly from window.location instead of next/navigation's
  // useSearchParams() — that hook requires a <Suspense> boundary during
  // static generation, and this value is only ever needed client-side after
  // mount anyway (campaign/QR attribution, not anything rendered on first paint).
  const [campaign, setCampaign] = useState("");
  const [qrSource, setQrSource] = useState(false);
  const [clinicLocation, setClinicLocation] = useState("");
  const [channel, setChannel] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCampaign(params.get("campaign") || "");
    setQrSource(params.get("qr") === "1");
    setClinicLocation(params.get("clinic") || "");
    setChannel(params.get("channel") || "");
  }, []);

  const [quizConfig, setQuizConfig] = useState<AssessmentConfigData>(DEFAULT_QUIZ_CONFIG);
  const [configReady, setConfigReady] = useState(false);
  const [screen, setScreen] = useState<"intro" | "question" | "analysing" | "results">("intro");
  const [visible, setVisible] = useState(true);
  const [path, setPath] = useState<string[]>([]); // visited question ids, in order
  const [answers, setAnswers] = useState<AssessmentAnswers>({});
  const [lead, setLead] = useState<LeadForm>({ name: "", phone: "", email: "", city: "" });
  const [leadStatus, setLeadStatus] = useState<LeadStatus>("idle");
  const startedTracked = useRef(false);
  const completedTracked = useRef(false);

  useEffect(() => {
    fetch("/api/quiz-config")
      .then((r) => r.json())
      .then((d) => { if (d.success && d.data) setQuizConfig(d.data); })
      .catch(() => {})
      .finally(() => setConfigReady(true));
  }, []);

  const trackEvent = useCallback((event: "started" | "completed", primaryConcern?: string) => {
    fetch("/api/assessment-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, primaryConcern: primaryConcern || "", campaign, qrSource, clinicLocation, channel }),
    }).catch(() => {});
  }, [campaign, qrSource, clinicLocation, channel]);

  // "text" (free-text notes) questions have a master on/off switch in
  // Settings, independent of the question itself, so a doctor can toggle
  // note collection off without deleting the question and losing its wording.
  const orderedQuestions = [...quizConfig.questions]
    .filter((q) => q.type !== "text" || quizConfig.settings?.enableNotes !== false)
    .sort((a, b) => a.order - b.order);
  const currentQuestionId = path[path.length - 1];
  const currentQuestion = orderedQuestions.find((q) => q.id === currentQuestionId);
  const currentIndex = orderedQuestions.findIndex((q) => q.id === currentQuestionId);

  const transition = (fn: () => void) => {
    setVisible(false);
    setTimeout(() => { fn(); setVisible(true); }, 200);
  };

  const startAssessment = () => {
    if (!startedTracked.current) { startedTracked.current = true; trackEvent("started"); }
    const first = orderedQuestions[0];
    if (!first) return;
    transition(() => { setPath([first.id]); setScreen("question"); });
  };

  const goToResults = () => {
    transition(() => setScreen("analysing"));
  };

  useEffect(() => {
    if (screen !== "analysing") return;
    const timer = setTimeout(() => {
      const primary = getPrimaryConcernTag(quizConfig.questions, answers);
      if (!completedTracked.current) { completedTracked.current = true; trackEvent("completed", primary); }
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
  const canProceed = !currentQuestion?.required || currentQuestion.type === "photo" || (
    Array.isArray(currentAnswer) ? currentAnswer.length > 0 : currentAnswer !== undefined && currentAnswer !== ""
  );

  const handleNext = () => {
    if (!currentQuestion) return;
    // Branching: a chosen single-select answer can point to a specific next
    // question; otherwise fall through to the next question in order.
    let nextId: string | undefined;
    if (typeof currentAnswer === "string") {
      const chosen = currentQuestion.answers.find((a) => a.id === currentAnswer);
      if (chosen?.nextQuestionId) nextId = chosen.nextQuestionId;
    }
    if (!nextId) nextId = orderedQuestions[currentIndex + 1]?.id;

    // Guard against a misconfigured branch: a dangling nextQuestionId (its
    // question was deleted after the branch was set) or a cycle (points back
    // to an already-visited question) would otherwise strand the visitor on
    // a blank page or in an infinite loop — treat both as "no more questions".
    if (nextId && (!orderedQuestions.some((q) => q.id === nextId) || path.includes(nextId))) {
      nextId = undefined;
    }

    if (nextId) {
      transition(() => setPath((p) => [...p, nextId!]));
    } else {
      goToResults();
    }
  };

  const handleBack = () => {
    if (path.length > 1) {
      transition(() => setPath((p) => p.slice(0, -1)));
    } else {
      transition(() => setScreen("intro"));
    }
  };

  const recommendations = scoreRecommendations(
    quizConfig.questions,
    answers,
    quizConfig.treatmentMap,
    { maxRecommendations: quizConfig.settings?.maxRecommendations, confidenceThreshold: quizConfig.settings?.confidenceThreshold }
  );
  const primaryConcernTag = getPrimaryConcernTag(quizConfig.questions, answers);
  const primaryConcernLabel = quizConfig.treatmentMap.find((e) => e.concernTag === primaryConcernTag)?.concernLabel || primaryConcernTag;

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeadStatus("sending");
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...lead,
          source: 'ai-assessment',
          campaign,
          qrSource,
          clinicLocation,
          channel,
          primaryConcern: getPrimaryConcernTag(quizConfig.questions, answers),
          answers,
          recommendations,
        }),
      });
      const data = await res.json();
      if (!data.success) { setLeadStatus("error"); return; }
      setLeadStatus(data.emailSent ? "sent" : "saved");
    } catch {
      setLeadStatus("error");
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setPath([]);
    setLead({ name: "", phone: "", email: "", city: "" });
    setLeadStatus("idle");
    startedTracked.current = false;
    completedTracked.current = false;
    transition(() => setScreen("intro"));
  };

  const totalQuestions = orderedQuestions.length;
  // Branching means the visitor's actual path can be shorter than the full
  // question set (some questions get skipped), so dividing by totalQuestions
  // understates progress and desyncs the label from what's actually being
  // asked. Estimate the path length instead: what's been visited, plus one
  // more if there's a next question to go to from here.
  const hasNextQuestion = !!currentQuestion && (() => {
    if (typeof currentAnswer === "string") {
      const chosen = currentQuestion.answers.find((a) => a.id === currentAnswer);
      if (chosen?.nextQuestionId) return orderedQuestions.some((q) => q.id === chosen.nextQuestionId) && !path.includes(chosen.nextQuestionId);
    }
    return !!orderedQuestions[currentIndex + 1];
  })();
  const estimatedTotal = Math.max(path.length + (hasNextQuestion ? 1 : 0), path.length, 1);
  const progressPct = screen === "intro" ? 0 : screen !== "question" ? 100 : Math.round((path.length / estimatedTotal) * 100);
  const stepLabel = screen === "intro" ? "Assessment" : screen === "question" ? `Question ${path.length} of ${estimatedTotal}` : "Your Results";

  const resultSections = quizConfig.resultSections?.length ? quizConfig.resultSections : DEFAULT_QUIZ_CONFIG.resultSections;
  const sectionVisible = (key: string) => resultSections.find((s) => s.key === key)?.visible !== false;
  // Full results are gated behind Name/Phone/Email — the doctor can turn this
  // gate off entirely by disabling the "emailForm" results section, which
  // falls back to showing the full report immediately (old behaviour).
  const emailFormEnabled = sectionVisible("emailForm") && quizConfig.settings?.enableEmail !== false;
  const resultsUnlocked = !emailFormEnabled || leadStatus === "sent" || leadStatus === "saved";

  if (configReady && quizConfig.settings && quizConfig.settings.enabled === false) {
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
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100/80 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-[#0B2560] hover:text-[#F5A623] transition-colors text-sm font-semibold group">
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            DR Youth Clinic
          </Link>
          <span className="text-xs text-gray-400 font-medium">{stepLabel}</span>
        </div>
        <div className="max-w-2xl mx-auto px-4 pb-2.5">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#0B2560] rounded-full transition-all duration-500 ease-in-out" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      <div className={`max-w-2xl mx-auto px-4 py-8 md:py-12 transition-all duration-200 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
        {screen === "intro" && !configReady && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-[#0B2560]/20 border-t-[#0B2560] animate-spin" />
            <p className="text-sm text-gray-400">Loading your personalised assessment…</p>
          </div>
        )}
        {screen === "intro" && configReady && <IntroScreen onStart={startAssessment} clinicLabel={clinicLocation ? slugToLabel(clinicLocation) : ""} />}

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

            <QuestionStep
              key={currentQuestion.id}
              question={currentQuestion}
              value={currentAnswer}
              onChange={(v) => setAnswers((a) => ({ ...a, [currentQuestion.id]: v }))}
            />

            <div className="mt-8 flex items-center justify-between">
              <button onClick={handleBack} className="flex items-center gap-2 text-gray-400 hover:text-[#0B2560] transition-colors text-sm font-medium group">
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

        {screen === "results" && (
          resultsUnlocked ? (
            <ResultsScreen
              recommendations={recommendations}
              doctorMessage={quizConfig.doctorMessage}
              primaryConcern={primaryConcernLabel}
              showDoctorMessage={sectionVisible("doctorMessage")}
              showTopRecommendation={sectionVisible("topRecommendation")}
              showAllRecommendations={sectionVisible("allRecommendations")}
              showBookCta={sectionVisible("bookCta")}
              showChat={quizConfig.settings?.enableChat !== false}
              leadCaptured={leadStatus === "sent" || leadStatus === "saved"}
              emailSent={leadStatus === "sent"}
              onRetake={handleRetake}
            />
          ) : (
            <ResultsPreview
              topRecommendation={recommendations[0]}
              lockedCount={Math.max(0, recommendations.length - 1)}
              lead={lead}
              setLead={setLead}
              leadStatus={leadStatus}
              onLeadSubmit={handleLeadSubmit}
            />
          )
        )}
      </div>
    </div>
  );
}
