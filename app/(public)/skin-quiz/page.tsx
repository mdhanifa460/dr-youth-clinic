"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSiteConfig } from "@/app/components/SiteConfigContext";

// ─── Types ───────────────────────────────────────────────────────────────────

type Answers = {
  concern: string;
  skinType: string;
  experience: string;
  budget: string;
  timeline: string;
};

type Treatment = {
  name: string;
  desc: string;
  sessions: string;
  price: string;
  match: number;
  icon: string;
};

// ─── Quiz Data ────────────────────────────────────────────────────────────────

const CONCERNS = [
  { id: "Acne & Breakouts", emoji: "🔴", label: "Acne & Breakouts" },
  { id: "Pigmentation & Dark Spots", emoji: "🟫", label: "Pigmentation & Dark Spots" },
  { id: "Ageing & Fine Lines", emoji: "⏳", label: "Ageing & Fine Lines" },
  { id: "Hair Loss & Thinning", emoji: "💇", label: "Hair Loss & Thinning" },
  { id: "Unwanted Hair Removal", emoji: "✨", label: "Unwanted Hair Removal" },
  { id: "General Glow & Refresh", emoji: "🌟", label: "General Glow & Refresh" },
];

const SKIN_TYPES = [
  { id: "Oily", emoji: "💧", label: "Oily", desc: "Shiny, large pores, prone to acne" },
  { id: "Dry", emoji: "🌵", label: "Dry", desc: "Tight, flaky, dull" },
  { id: "Combination", emoji: "🌊", label: "Combination", desc: "Oily T-zone, dry cheeks" },
  { id: "Sensitive", emoji: "🌹", label: "Sensitive", desc: "Redness, reacts easily" },
  { id: "Normal", emoji: "✅", label: "Normal", desc: "Balanced, few issues" },
];

const EXPERIENCES = [
  { id: "First timer", emoji: "🌱", label: "First timer", desc: "Never had professional treatment" },
  { id: "Some experience", emoji: "🌿", label: "Some experience", desc: "Had basic facials or peels" },
  { id: "Experienced", emoji: "🌳", label: "Experienced", desc: "Done PRP, laser, or advanced treatments" },
];

const BUDGETS = [
  "Under ₹5,000 per session",
  "₹5,000 – ₹15,000 per session",
  "₹15,000+ (premium treatments)",
  "Open to packages",
];

const TIMELINES = [
  { id: "ASAP", emoji: "⚡", label: "ASAP", desc: "I want to start this week" },
  { id: "This month", emoji: "📅", label: "This month", desc: "Planning within 30 days" },
  { id: "Exploring", emoji: "🔍", label: "Exploring", desc: "Just researching options" },
];

const STEP_META: Record<number, { title: string; subtitle: string }> = {
  1: {
    title: "What's your main concern?",
    subtitle: "Select the skin or hair issue that matters most to you right now",
  },
  2: {
    title: "What's your skin type?",
    subtitle: "This helps us choose the safest, most effective treatments for you",
  },
  3: {
    title: "Your treatment experience?",
    subtitle: "So we can recommend the right level of treatment",
  },
  4: {
    title: "What's your budget per session?",
    subtitle: "We have excellent options at every price point",
  },
  5: {
    title: "When do you want to start?",
    subtitle: "We'll tailor the urgency of our recommendations accordingly",
  },
};

// ─── Treatment Matching Logic ─────────────────────────────────────────────────

const RECOMMENDATIONS: Record<string, Treatment[]> = {
  "Acne & Breakouts": [
    {
      name: "Chemical Peel",
      desc: "Removes dead skin, unclogs pores, reduces active acne and post-acne marks",
      sessions: "4–6 sessions, every 3 weeks",
      price: "₹3,000 – ₹8,000/session",
      match: 96,
      icon: "⚗️",
    },
    {
      name: "Hydra Facial",
      desc: "Deep cleanse + extraction + hydration. Immediate glow, zero downtime",
      sessions: "Monthly maintenance",
      price: "₹5,000 – ₹12,000",
      match: 88,
      icon: "💧",
    },
    {
      name: "Laser Acne Treatment",
      desc: "Kills acne-causing bacteria and reduces oil production at the source",
      sessions: "6–8 sessions",
      price: "₹8,000 – ₹18,000/session",
      match: 82,
      icon: "⚡",
    },
  ],
  "Pigmentation & Dark Spots": [
    {
      name: "Q-Switch Laser",
      desc: "Targets melanin clusters to break up pigmentation without damaging surrounding skin",
      sessions: "4–8 sessions",
      price: "₹6,000 – ₹15,000/session",
      match: 95,
      icon: "🎯",
    },
    {
      name: "Chemical Peel",
      desc: "Accelerates cell turnover to fade dark spots and even skin tone",
      sessions: "4–6 sessions",
      price: "₹3,000 – ₹8,000/session",
      match: 87,
      icon: "⚗️",
    },
    {
      name: "Vitamin C Infusion",
      desc: "Medical-grade brightening treatment that inhibits melanin production",
      sessions: "6 sessions",
      price: "₹4,000 – ₹9,000/session",
      match: 80,
      icon: "🍋",
    },
  ],
  "Ageing & Fine Lines": [
    {
      name: "Anti-Ageing Facial",
      desc: "Collagen-boosting treatment with peptides and growth factors for firmer, plumper skin",
      sessions: "6–8 sessions",
      price: "₹8,000 – ₹20,000/session",
      match: 94,
      icon: "✨",
    },
    {
      name: "Botox / Fillers",
      desc: "Smooths expression lines and restores volume for a refreshed, natural look",
      sessions: "Once every 4–6 months",
      price: "₹15,000 – ₹40,000",
      match: 89,
      icon: "💉",
    },
    {
      name: "HIFU Skin Tightening",
      desc: "Non-surgical facelift using high-intensity ultrasound energy to lift and tighten",
      sessions: "1–2 sessions/year",
      price: "₹25,000 – ₹60,000",
      match: 83,
      icon: "🔊",
    },
  ],
  "Hair Loss & Thinning": [
    {
      name: "PRP Hair Treatment",
      desc: "Your own platelet-rich plasma injected into the scalp to stimulate dormant follicles",
      sessions: "6–8 sessions, monthly",
      price: "₹8,000 – ₹15,000/session",
      match: 96,
      icon: "🩸",
    },
    {
      name: "GFC Hair Treatment",
      desc: "Next-generation Growth Factor Concentrate — 3x more potent than standard PRP",
      sessions: "4–6 sessions",
      price: "₹12,000 – ₹20,000/session",
      match: 91,
      icon: "🧬",
    },
    {
      name: "Mesotherapy for Hair",
      desc: "Micro-injections of vitamins and minerals directly into the scalp for maximum absorption",
      sessions: "8–10 sessions",
      price: "₹5,000 – ₹10,000/session",
      match: 83,
      icon: "💊",
    },
  ],
  "Unwanted Hair Removal": [
    {
      name: "Laser Hair Removal",
      desc: "Permanent reduction of unwanted hair. Safe for all skin tones with our diode laser",
      sessions: "6–8 sessions per area",
      price: "₹2,000 – ₹15,000/area",
      match: 98,
      icon: "⚡",
    },
    {
      name: "Full Body Laser Package",
      desc: "Complete hair-free solution for face + arms + legs + underarms + bikini",
      sessions: "8 sessions",
      price: "₹45,000 – ₹80,000 package",
      match: 90,
      icon: "🌟",
    },
    {
      name: "IPL Hair Reduction",
      desc: "Intense Pulsed Light for lighter hair colours. Gentler than laser",
      sessions: "8–10 sessions",
      price: "₹3,000 – ₹12,000/area",
      match: 78,
      icon: "💡",
    },
  ],
  "General Glow & Refresh": [
    {
      name: "Hydra Facial",
      desc: "Cleanse + exfoliate + extract + hydrate + protect. Instant glow, zero downtime",
      sessions: "Monthly",
      price: "₹5,000 – ₹12,000",
      match: 97,
      icon: "💧",
    },
    {
      name: "Skin Brightening Peel",
      desc: "Medical-grade fruit acid peel that reveals fresher, brighter skin underneath",
      sessions: "4–6 sessions",
      price: "₹3,500 – ₹8,000/session",
      match: 89,
      icon: "🍑",
    },
    {
      name: "IV Glow Drip",
      desc: "Glutathione + Vitamin C intravenous infusion for full-body skin brightening and radiance",
      sessions: "8–12 sessions",
      price: "₹4,000 – ₹8,000/session",
      match: 82,
      icon: "✨",
    },
  ],
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function getStepAnswer(step: number, answers: Answers): string {
  switch (step) {
    case 1: return answers.concern;
    case 2: return answers.skinType;
    case 3: return answers.experience;
    case 4: return answers.budget;
    case 5: return answers.timeline;
    default: return "";
  }
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function IntroScreen({ onStart }: { onStart: () => void }) {
  const { skinQuizFree, consultationBadge } = useSiteConfig();
  return (
    <div className="flex flex-col items-center text-center py-6 md:py-10">
      {/* Badge */}
      <span className="inline-flex items-center gap-1.5 bg-[#0B2560]/10 text-[#0B2560] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
        <span className="w-1.5 h-1.5 rounded-full bg-[#F5A623] inline-block" />
        {skinQuizFree ? 'Free · No Commitment · 60 Seconds' : 'No Commitment · 60 Seconds'}
      </span>

      {/* Headline */}
      <h1 className="text-3xl md:text-5xl font-extrabold text-[#0B2560] leading-tight mb-4 max-w-xl tracking-tight">
        Discover Your<br />
        <span className="text-[#F5A623]">Perfect Treatment</span>
      </h1>

      <p className="text-gray-500 text-base md:text-lg max-w-md mb-10 leading-relaxed">
        Answer 5 quick questions. Get a personalised treatment plan from DR Youth's experts{skinQuizFree ? ' — free,' : ','} in 60 seconds.
      </p>

      {/* Trust badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 w-full max-w-lg">
        {[
          { icon: "🏆", text: "Based on 50,000+", sub: "patient outcomes" },
          { icon: "🔬", text: "Evidence-based", sub: "matching algorithm" },
          { icon: "🎁", text: `${consultationBadge}`, sub: "included with results" },
        ].map((badge) => (
          <div
            key={badge.text}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 flex flex-col items-center gap-1"
          >
            <span className="text-2xl">{badge.icon}</span>
            <span className="text-xs font-bold text-[#0B2560] text-center leading-snug">{badge.text}</span>
            <span className="text-xs text-gray-400 text-center">{badge.sub}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        onClick={onStart}
        className="group relative px-10 py-4 bg-[#0B2560] hover:bg-[#0d2d72] text-white font-bold text-lg rounded-2xl shadow-lg shadow-[#0B2560]/25 transition-all duration-200 hover:shadow-xl hover:shadow-[#0B2560]/30 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-3"
      >
        Start My Skin Quiz
        <span className="text-[#F5A623] group-hover:translate-x-1 transition-transform duration-200">→</span>
      </button>

      <p className="mt-4 text-xs text-gray-400">No sign-up required. Results in under a minute.</p>
    </div>
  );
}

function SelectionCheck({ selected }: { selected: boolean }) {
  return (
    <span
      className={`absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
        selected ? "bg-[#0B2560] scale-100 opacity-100" : "bg-gray-100 scale-90 opacity-0"
      }`}
    >
      <CheckIcon />
    </span>
  );
}

function ConcernStep({
  answers,
  setAnswers,
}: {
  answers: Answers;
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {CONCERNS.map((c) => {
        const selected = answers.concern === c.id;
        return (
          <button
            key={c.id}
            onClick={() => setAnswers((a) => ({ ...a, concern: c.id }))}
            className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 px-3 py-5 text-center transition-all duration-200 cursor-pointer
              ${
                selected
                  ? "border-[#0B2560] bg-[#0B2560]/5 shadow-md shadow-[#0B2560]/10"
                  : "border-gray-100 bg-white hover:border-[#0B2560]/30 hover:shadow-sm"
              }`}
          >
            <SelectionCheck selected={selected} />
            <span className="text-3xl leading-none">{c.emoji}</span>
            <span
              className={`text-sm font-semibold leading-snug ${
                selected ? "text-[#0B2560]" : "text-gray-700"
              }`}
            >
              {c.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SkinTypeStep({
  answers,
  setAnswers,
}: {
  answers: Answers;
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
}) {
  return (
    <div className="flex flex-col gap-3">
      {SKIN_TYPES.map((s) => {
        const selected = answers.skinType === s.id;
        return (
          <button
            key={s.id}
            onClick={() => setAnswers((a) => ({ ...a, skinType: s.id }))}
            className={`relative flex items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition-all duration-200 cursor-pointer
              ${
                selected
                  ? "border-[#0B2560] bg-[#0B2560]/5 shadow-md shadow-[#0B2560]/10"
                  : "border-gray-100 bg-white hover:border-[#0B2560]/30 hover:shadow-sm"
              }`}
          >
            <SelectionCheck selected={selected} />
            <span className="text-2xl flex-shrink-0">{s.emoji}</span>
            <div>
              <p className={`font-bold text-sm ${selected ? "text-[#0B2560]" : "text-gray-800"}`}>
                {s.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ExperienceStep({
  answers,
  setAnswers,
}: {
  answers: Answers;
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
}) {
  return (
    <div className="flex flex-col gap-3">
      {EXPERIENCES.map((e) => {
        const selected = answers.experience === e.id;
        return (
          <button
            key={e.id}
            onClick={() => setAnswers((a) => ({ ...a, experience: e.id }))}
            className={`relative flex items-center gap-4 rounded-2xl border-2 px-5 py-5 text-left transition-all duration-200 cursor-pointer
              ${
                selected
                  ? "border-[#0B2560] bg-[#0B2560]/5 shadow-md shadow-[#0B2560]/10"
                  : "border-gray-100 bg-white hover:border-[#0B2560]/30 hover:shadow-sm"
              }`}
          >
            <SelectionCheck selected={selected} />
            <span className="text-3xl flex-shrink-0">{e.emoji}</span>
            <div>
              <p className={`font-bold ${selected ? "text-[#0B2560]" : "text-gray-800"}`}>{e.label}</p>
              <p className="text-sm text-gray-500 mt-0.5">{e.desc}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function BudgetStep({
  answers,
  setAnswers,
}: {
  answers: Answers;
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {BUDGETS.map((b) => {
        const selected = answers.budget === b;
        return (
          <button
            key={b}
            onClick={() => setAnswers((a) => ({ ...a, budget: b }))}
            className={`relative flex items-center gap-2 rounded-full border-2 px-5 py-3 text-sm font-semibold transition-all duration-200 cursor-pointer
              ${
                selected
                  ? "border-[#0B2560] bg-[#0B2560] text-white shadow-md shadow-[#0B2560]/25"
                  : "border-gray-200 bg-white text-gray-700 hover:border-[#0B2560]/50 hover:text-[#0B2560]"
              }`}
          >
            {selected && <CheckIcon />}
            {b}
          </button>
        );
      })}
    </div>
  );
}

function TimelineStep({
  answers,
  setAnswers,
}: {
  answers: Answers;
  setAnswers: React.Dispatch<React.SetStateAction<Answers>>;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {TIMELINES.map((t) => {
        const selected = answers.timeline === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setAnswers((a) => ({ ...a, timeline: t.id }))}
            className={`relative flex-1 flex flex-col items-center gap-2 rounded-2xl border-2 px-4 py-6 text-center transition-all duration-200 cursor-pointer
              ${
                selected
                  ? "border-[#0B2560] bg-[#0B2560]/5 shadow-md shadow-[#0B2560]/10"
                  : "border-gray-100 bg-white hover:border-[#0B2560]/30 hover:shadow-sm"
              }`}
          >
            <SelectionCheck selected={selected} />
            <span className="text-3xl">{t.emoji}</span>
            <p className={`font-bold text-sm ${selected ? "text-[#0B2560]" : "text-gray-800"}`}>{t.label}</p>
            <p className="text-xs text-gray-500 leading-snug">{t.desc}</p>
          </button>
        );
      })}
    </div>
  );
}

function AnalysingScreen() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
      {/* Spinner */}
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#0B2560] animate-spin" />
        <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-[#F5A623] animate-spin [animation-direction:reverse] [animation-duration:0.8s]" />
      </div>
      <div>
        <p className="text-lg font-bold text-[#0B2560] mb-1">Analysing your profile…</p>
        <p className="text-sm text-gray-500">Matching against 50,000+ patient outcomes</p>
      </div>
      {/* Animated dots */}
      <div className="flex gap-3 mt-2">
        {["Checking skin type", "Matching treatments", "Calculating fit scores"].map((label, i) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-gray-400">
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#F5A623] animate-pulse"
              style={{ animationDelay: `${i * 0.3}s` }}
            />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function TreatmentCard({
  treatment,
  concern,
  rank,
}: {
  treatment: Treatment;
  concern: string;
  rank: number;
}) {
  const { consultationCta } = useSiteConfig();
  const bookUrl = `/book?service=${encodeURIComponent(treatment.name)}&concern=${encodeURIComponent(concern)}`;

  return (
    <div
      className={`bg-white rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${
        rank === 0
          ? "border-[#0B2560] shadow-md shadow-[#0B2560]/10"
          : "border-gray-100 shadow-sm"
      }`}
    >
      {rank === 0 && (
        <div className="bg-[#0B2560] text-white text-xs font-bold uppercase tracking-widest text-center py-1.5 px-4">
          Top Match for You
        </div>
      )}
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{treatment.icon}</span>
            <h3 className="font-bold text-[#0B2560] text-base leading-tight">{treatment.name}</h3>
          </div>
          <span className="flex-shrink-0 text-sm font-black text-[#0B2560] bg-[#0B2560]/8 rounded-full px-3 py-1">
            {treatment.match}%
          </span>
        </div>

        {/* Match bar */}
        <div className="mb-4">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${treatment.match}%`,
                background: rank === 0
                  ? "linear-gradient(90deg, #0B2560, #1a4a8a)"
                  : "#0B2560",
              }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">{treatment.match}% match with your profile</p>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 leading-relaxed mb-4">{treatment.desc}</p>

        {/* Meta */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="inline-flex items-center gap-1 text-xs bg-[#f6faff] text-[#0B2560] rounded-lg px-3 py-1.5 font-medium border border-[#0B2560]/10">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {treatment.sessions}
          </span>
          <span className="inline-flex items-center gap-1 text-xs bg-[#F5A623]/10 text-[#c47e00] rounded-lg px-3 py-1.5 font-medium border border-[#F5A623]/20">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {treatment.price}
          </span>
        </div>

        {/* CTA */}
        <Link
          href={bookUrl}
          className="block w-full text-center py-3 rounded-xl font-bold text-sm transition-all duration-200
            bg-[#0B2560] text-white hover:bg-[#0d2d72] shadow-sm hover:shadow-md hover:shadow-[#0B2560]/20"
        >
          {consultationCta}
        </Link>
      </div>
    </div>
  );
}

function ResultsScreen({
  answers,
  recommendations,
  email,
  setEmail,
  emailSent,
  onEmailSubmit,
  onRetake,
}: {
  answers: Answers;
  recommendations: Treatment[];
  email: string;
  setEmail: (v: string) => void;
  emailSent: boolean;
  onEmailSubmit: (e: React.FormEvent) => void;
  onRetake: () => void;
}) {
  return (
    <div className="py-2">
      {/* Results headline */}
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
          Your Plan is Ready
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#0B2560] mb-3 tracking-tight">
          Your Personalised Treatment Plan
        </h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Based on your profile:{" "}
          <span className="font-semibold text-[#0B2560]">{answers.concern}</span>
          {answers.skinType && (
            <>
              {" "}·{" "}
              <span className="font-semibold text-[#0B2560]">{answers.skinType} skin</span>
            </>
          )}
          {answers.experience && (
            <>
              {" "}·{" "}
              <span className="font-semibold text-[#0B2560]">{answers.experience}</span>
            </>
          )}
        </p>
      </div>

      {/* Treatment cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {recommendations.map((rec, i) => (
          <TreatmentCard key={rec.name} treatment={rec} concern={answers.concern} rank={i} />
        ))}
      </div>

      {/* Lead capture */}
      <div className="bg-gradient-to-br from-[#0B2560] to-[#1a4a8a] rounded-3xl p-6 md:p-8 text-white mb-6 shadow-xl shadow-[#0B2560]/20">
        <div className="max-w-md mx-auto text-center">
          <div className="text-3xl mb-3">📩</div>
          <h3 className="text-xl font-bold mb-2">Get this plan emailed to you</h3>
          <p className="text-sm text-blue-200 mb-5">
            Receive your personalised treatment plan + a special first-consultation offer.
          </p>
          {emailSent ? (
            <div className="bg-white/10 rounded-2xl px-6 py-4 flex items-center justify-center gap-3">
              <span className="text-2xl">✅</span>
              <div className="text-left">
                <p className="font-bold">Plan sent!</p>
                <p className="text-xs text-blue-200">Check your inbox (and spam folder).</p>
              </div>
            </div>
          ) : (
            <form onSubmit={onEmailSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="flex-1 px-4 py-3 rounded-xl bg-white/15 border border-white/20 placeholder-blue-300 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#F5A623] focus:border-transparent"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-[#F5A623] hover:bg-[#e09520] text-[#0B2560] font-bold rounded-xl text-sm transition-all duration-200 hover:shadow-lg whitespace-nowrap"
              >
                Send Plan
              </button>
            </form>
          )}
        </div>
      </div>

      {/* WhatsApp + Retake */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <a
          href="https://wa.me/919999999999?text=Hi%2C%20I%20just%20completed%20the%20skin%20quiz%20and%20would%20like%20to%20know%20more%20about%20my%20treatment%20plan."
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 px-6 py-3 bg-[#25D366] hover:bg-[#1ebe57] text-white font-bold rounded-xl text-sm transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Speak to a doctor now
        </a>

        <button
          onClick={onRetake}
          className="text-sm text-gray-400 hover:text-[#0B2560] underline underline-offset-4 transition-colors"
        >
          Retake the quiz
        </button>
      </div>
    </div>
  );
}

// ─── Main Quiz Page ───────────────────────────────────────────────────────────

export default function SkinQuizPage() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);
  const [analysing, setAnalysing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [answers, setAnswers] = useState<Answers>({
    concern: "",
    skinType: "",
    experience: "",
    budget: "",
    timeline: "",
  });
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  // Auto-transition from analysing → results after 2s
  useEffect(() => {
    if (step === 6 && analysing) {
      const timer = setTimeout(() => {
        setAnalysing(false);
        setShowResults(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step, analysing]);

  const canProceed = step === 0 || getStepAnswer(step, answers) !== "";

  // Animated page transition
  const transition = (fn: () => void) => {
    setVisible(false);
    setTimeout(() => {
      fn();
      setVisible(true);
    }, 200);
  };

  const handleNext = () => {
    if (step < 5) {
      transition(() => setStep((s) => s + 1));
    } else {
      // Step 5 → analysis screen
      transition(() => {
        setAnalysing(true);
        setStep(6);
      });
    }
  };

  const handleBack = () => {
    if (step > 0 && step < 6) {
      transition(() => setStep((s) => s - 1));
    }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Send plan to:", email, "for answers:", answers);
    setEmailSent(true);
  };

  const handleRetake = () => {
    setAnswers({ concern: "", skinType: "", experience: "", budget: "", timeline: "" });
    setShowResults(false);
    setAnalysing(false);
    setEmail("");
    setEmailSent(false);
    transition(() => setStep(0));
  };

  const recommendations = answers.concern ? (RECOMMENDATIONS[answers.concern] ?? []) : [];

  // Progress: 0 on intro, 100 on results, proportional in between
  const progressPct =
    step === 0 ? 0 : step >= 6 ? 100 : Math.round((step / 5) * 100);

  const stepLabel =
    step === 0
      ? "Skin Quiz"
      : step >= 6
      ? "Your Results"
      : `Question ${step} of 5`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6faff] via-white to-[#edf4fc]">
      {/* ── Sticky progress bar ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100/80 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-[#0B2560] hover:text-[#F5A623] transition-colors text-sm font-semibold group"
          >
            <svg
              className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            DR Youth Clinic
          </Link>
          <span className="text-xs text-gray-400 font-medium">{stepLabel}</span>
        </div>
        <div className="max-w-2xl mx-auto px-4 pb-2.5">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0B2560] rounded-full transition-all duration-500 ease-in-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Main content (animated) ─────────────────────────────────────────── */}
      <div
        className={`max-w-2xl mx-auto px-4 py-8 md:py-12 transition-all duration-200 ease-out ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        }`}
      >
        {/* Step 0 — Intro */}
        {step === 0 && (
          <IntroScreen onStart={() => transition(() => setStep(1))} />
        )}

        {/* Steps 1–5 */}
        {step >= 1 && step <= 5 && (
          <div>
            {/* Step header */}
            <div className="mb-7">
              <div className="flex items-center gap-2 mb-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div
                    key={n}
                    className={`h-1 rounded-full flex-1 transition-all duration-300 ${
                      n < step
                        ? "bg-[#0B2560]"
                        : n === step
                        ? "bg-[#F5A623]"
                        : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-[#0B2560] mb-2 tracking-tight">
                {STEP_META[step].title}
              </h2>
              <p className="text-gray-500 text-sm md:text-base">{STEP_META[step].subtitle}</p>
            </div>

            {/* Step content */}
            {step === 1 && <ConcernStep answers={answers} setAnswers={setAnswers} />}
            {step === 2 && <SkinTypeStep answers={answers} setAnswers={setAnswers} />}
            {step === 3 && <ExperienceStep answers={answers} setAnswers={setAnswers} />}
            {step === 4 && <BudgetStep answers={answers} setAnswers={setAnswers} />}
            {step === 5 && <TimelineStep answers={answers} setAnswers={setAnswers} />}

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-400 hover:text-[#0B2560] transition-colors text-sm font-medium group"
              >
                <svg
                  className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>

              <button
                onClick={handleNext}
                disabled={!canProceed}
                className="group flex items-center gap-2 px-8 py-3 bg-[#0B2560] text-white font-bold rounded-xl shadow-md shadow-[#0B2560]/20
                  hover:bg-[#0d2d72] hover:shadow-lg hover:shadow-[#0B2560]/25 hover:-translate-y-0.5
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-md
                  transition-all duration-200 active:translate-y-0"
              >
                {step === 5 ? "See My Results" : "Next"}
                <svg
                  className="w-4 h-4 group-hover:translate-x-0.5 transition-transform group-disabled:translate-x-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Step 6a — Analysing */}
        {step === 6 && analysing && <AnalysingScreen />}

        {/* Step 6b — Results */}
        {step === 6 && !analysing && showResults && (
          <ResultsScreen
            answers={answers}
            recommendations={recommendations}
            email={email}
            setEmail={setEmail}
            emailSent={emailSent}
            onEmailSubmit={handleEmailSubmit}
            onRetake={handleRetake}
          />
        )}
      </div>
    </div>
  );
}
