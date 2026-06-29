"use client";

import { useState } from "react";

interface SeoPreviewProps {
  title: string;
  description: string;
  keywords: string;
  slug: string;
  location: string;
  serviceName: string;
  benefits?: Array<{ icon: string; title: string; description: string }>;
  narrative?: string;
}

type Tab = "seo" | "geo" | "aeo";

const TAB_META: Record<Tab, { label: string; target: string; goal: string; color: string }> = {
  seo: {
    label: "🔍 SEO",
    target: "Google · Bing",
    goal: "Rank #1 on search results",
    color: "blue",
  },
  geo: {
    label: "✨ GEO",
    target: "Perplexity · ChatGPT · Gemini",
    goal: "Be synthesised into AI summaries",
    color: "violet",
  },
  aeo: {
    label: "⚡ AEO",
    target: "AI Overviews · Alexa · Siri",
    goal: "Become the cited direct answer",
    color: "amber",
  },
};

export default function SeoPreviewCard({
  title,
  description,
  keywords,
  slug,
  location,
  serviceName,
  benefits = [],
  narrative = "",
}: SeoPreviewProps) {
  const [tab, setTab] = useState<Tab>("seo");

  const cityName = location
    ? location.charAt(0).toUpperCase() + location.slice(1)
    : "";

  const displayUrl =
    slug && location
      ? `dryouthclinic.com › ${location} › services › ${slug}`
      : "dryouthclinic.com › [city] › services › [slug]";

  const displayTitle = title || serviceName || "Service Title";
  const displayDesc =
    description || "Add a meta description to preview how it appears…";

  const keywordList = keywords
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  const meta = TAB_META[tab];

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        {(Object.keys(TAB_META) as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-semibold transition ${
              tab === t
                ? "bg-white border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {TAB_META[t].label}
          </button>
        ))}
      </div>

      {/* Context strip */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
        <p className="text-[11px] text-gray-500 font-medium">{meta.target}</p>
        <p className="text-[11px] text-gray-400 italic">{meta.goal}</p>
      </div>

      {/* ── SEO: Google / Bing SERP snippet ── */}
      {tab === "seo" && (
        <div className="p-5 bg-white space-y-4">
          {/* SERP card */}
          <div className="border border-gray-100 rounded-xl p-4 shadow-sm max-w-xl">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-4 h-4 rounded-full bg-blue-700 flex items-center justify-center shrink-0">
                <span className="text-white text-[7px] font-bold">D</span>
              </div>
              <span className="text-xs text-gray-500">dryouthclinic.com</span>
            </div>
            <p className="text-xs text-gray-400 mb-1 truncate">{displayUrl}</p>
            <p className="text-[17px] text-blue-700 font-medium leading-tight mb-1 hover:underline cursor-pointer">
              {displayTitle}
            </p>
            <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
              {displayDesc}
            </p>
          </div>

          {/* Keywords */}
          {keywordList.length > 0 && (
            <div>
              <p className="text-[11px] text-gray-400 mb-1.5">Target keywords</p>
              <div className="flex flex-wrap gap-1.5">
                {keywordList.map((k, i) => (
                  <span
                    key={i}
                    className="text-xs bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full border border-blue-100"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Signals */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Title tag", ok: title.length > 0 && title.length <= 60, hint: title.length ? `${title.length}/60 chars` : "Not set" },
              { label: "Meta description", ok: description.length > 0 && description.length <= 160, hint: description.length ? `${description.length}/160 chars` : "Not set" },
              { label: "Focus keywords", ok: keywordList.length >= 2, hint: `${keywordList.length} added` },
              { label: "Clean URL slug", ok: !!slug, hint: slug || "Auto-generated from name" },
            ].map((s) => (
              <div key={s.label} className={`rounded-lg p-2.5 border text-xs ${s.ok ? "bg-green-50 border-green-100" : "bg-gray-50 border-gray-100"}`}>
                <p className={`font-semibold text-[10px] ${s.ok ? "text-green-600" : "text-gray-400"}`}>
                  {s.ok ? "✓" : "○"} {s.label}
                </p>
                <p className="text-gray-500 mt-0.5">{s.hint}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── GEO: Perplexity / ChatGPT synthesis ── */}
      {tab === "geo" && (
        <div className="p-5 bg-white space-y-4">
          {/* Synthesis card */}
          <div className="border border-violet-100 rounded-xl p-4 bg-gradient-to-br from-violet-50 to-blue-50 max-w-xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
                <span className="text-white text-[9px] font-bold">AI</span>
              </div>
              <span className="text-xs font-bold text-violet-700">Generative Summary</span>
            </div>

            <p className="text-[13px] font-semibold text-gray-900 mb-1.5">
              {serviceName
                ? `What is ${serviceName}${cityName ? ` in ${cityName}` : ""}?`
                : "Your service question appears here"}
            </p>

            <p className="text-sm text-gray-700 leading-relaxed">
              {description
                ? description
                : "Your meta description becomes the AI's synthesis source. Make it informative and authoritative."}
            </p>

            {narrative && (
              <p className="text-xs text-gray-500 mt-2 line-clamp-2 border-t border-violet-100 pt-2">
                {narrative}
              </p>
            )}

            {benefits.length > 0 && (
              <div className="mt-3 border-t border-violet-100 pt-2 space-y-1">
                <p className="text-[10px] font-bold text-violet-600 uppercase">Key facts extracted by AI</p>
                {benefits.slice(0, 3).map((b, i) => (
                  <p key={i} className="text-xs text-gray-600">
                    {b.icon} <span className="font-medium">{b.title}</span>
                    {b.description ? ` — ${b.description}` : ""}
                  </p>
                ))}
              </div>
            )}

            {/* Citation bar */}
            <div className="mt-3 flex items-center gap-2 border-t border-violet-100 pt-2">
              <div className="flex -space-x-1">
                {["G", "P", "C"].map((l, i) => (
                  <div key={i} className="w-4 h-4 rounded-full border border-white flex items-center justify-center text-[8px] font-bold text-white"
                    style={{ backgroundColor: ["#4285F4", "#20B2AA", "#10a37f"][i] }}>
                    {l}
                  </div>
                ))}
              </div>
              <span className="text-xs text-gray-400">Sources · dryouthclinic.com</span>
            </div>
          </div>

          {/* GEO signals */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Authoritative description", ok: description.length >= 120, hint: `${description.length}/120+ chars` },
              { label: "Structured benefits", ok: benefits.length >= 2, hint: `${benefits.length} benefit${benefits.length !== 1 ? "s" : ""} listed` },
              { label: "Narrative content", ok: narrative.length >= 100, hint: narrative.length ? `${narrative.length} chars` : "Add in step 3" },
              { label: "Keywords for context", ok: keywordList.length >= 2, hint: `${keywordList.length} keyword${keywordList.length !== 1 ? "s" : ""}` },
            ].map((s) => (
              <div key={s.label} className={`rounded-lg p-2.5 border text-xs ${s.ok ? "bg-green-50 border-green-100" : "bg-gray-50 border-gray-100"}`}>
                <p className={`font-semibold text-[10px] ${s.ok ? "text-green-600" : "text-gray-400"}`}>
                  {s.ok ? "✓" : "○"} {s.label}
                </p>
                <p className="text-gray-500 mt-0.5">{s.hint}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── AEO: AI Overview / Alexa / Siri direct answer ── */}
      {tab === "aeo" && (
        <div className="p-5 bg-white space-y-4">
          {/* Direct answer card */}
          <div className="border border-amber-100 rounded-xl p-4 bg-gradient-to-br from-amber-50 to-orange-50 max-w-xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                <span className="text-white text-[9px] font-bold">▶</span>
              </div>
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                Direct Answer
              </span>
            </div>

            {/* Voice-style query */}
            <div className="bg-white rounded-lg px-3 py-2 mb-3 border border-amber-100 text-xs text-gray-500 flex items-center gap-2">
              <span>🎤</span>
              <span>
                &quot;What is the best{" "}
                {serviceName ? serviceName.toLowerCase() : "treatment"}{" "}
                {cityName ? `in ${cityName}` : "near me"}&quot;
              </span>
            </div>

            <p className="text-sm text-gray-800 leading-relaxed font-medium">
              {description
                ? description.length > 120
                  ? description.slice(0, 120) + "…"
                  : description
                : "Your meta description becomes the direct spoken/shown answer. Keep it factual and concise."}
            </p>

            {/* Quick facts from benefits */}
            {benefits.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {benefits.slice(0, 2).map((b, i) => (
                  <div key={i} className="bg-white rounded-lg px-2.5 py-1.5 border border-amber-100 text-xs">
                    <p className="font-semibold text-gray-800">{b.icon} {b.title}</p>
                  </div>
                ))}
              </div>
            )}

            {/* CTA row */}
            <div className="mt-3 flex items-center gap-2 border-t border-amber-100 pt-2">
              <span className="text-xs bg-amber-500 text-white px-3 py-1 rounded-full cursor-default">
                Book Now
              </span>
              <span className="text-xs text-gray-500">DR Youth Clinic · 1800 890 9669</span>
            </div>
          </div>

          {/* AEO signals */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Concise answer-ready desc", ok: description.length >= 60 && description.length <= 160, hint: description.length ? `${description.length} chars (60–160 ideal)` : "Not set" },
              { label: "Question-style keywords", ok: keywordList.some((k) => k.toLowerCase().includes("best") || k.toLowerCase().includes("near") || k.toLowerCase().includes("how") || k.toLowerCase().includes("what")), hint: keywordList.length ? "Add 'best / how / what' phrases" : "No keywords yet" },
              { label: "Extractable benefit facts", ok: benefits.length >= 1, hint: `${benefits.length} benefit${benefits.length !== 1 ? "s" : ""} (cited by voice AI)` },
              { label: "Location in title/desc", ok: !!(cityName && (title.toLowerCase().includes(location) || description.toLowerCase().includes(location) || description.toLowerCase().includes(cityName.toLowerCase()))), hint: cityName ? `"${cityName}" signals local authority` : "Select a location in step 1" },
            ].map((s) => (
              <div key={s.label} className={`rounded-lg p-2.5 border text-xs ${s.ok ? "bg-green-50 border-green-100" : "bg-gray-50 border-gray-100"}`}>
                <p className={`font-semibold text-[10px] ${s.ok ? "text-green-600" : "text-gray-400"}`}>
                  {s.ok ? "✓" : "○"} {s.label}
                </p>
                <p className="text-gray-500 mt-0.5">{s.hint}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
