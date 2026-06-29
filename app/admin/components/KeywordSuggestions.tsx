"use client";

import { useState, useEffect, useMemo } from "react";
import { Sparkles, Plus, X, Loader2, AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  serviceName: string;
  category: string;
  location: string;
  keywords: string;          // comma-separated current value in the form
  onChange: (v: string) => void;
}

// ── Static keyword banks (instant, zero cost) ────────────────────────────────
const CATEGORY_BANKS: Record<string, string[]> = {
  Skin: [
    "skin brightening", "acne treatment", "pigmentation treatment",
    "anti aging skin care", "skin rejuvenation", "glowing skin",
    "dark spot removal", "chemical peel", "dermatologist consultation",
    "skin hydration", "skin whitening treatment", "face treatment",
  ],
  Hair: [
    "hair loss treatment", "hair regrowth", "PRP therapy",
    "GFC hair treatment", "hair transplant", "alopecia treatment",
    "scalp treatment", "hair thinning solution", "FUE transplant",
    "DHI hair transplant", "hair fall control", "platelet rich plasma hair",
  ],
  Laser: [
    "laser hair removal", "laser skin resurfacing", "Q-switched laser",
    "fractional laser", "IPL treatment", "CO2 laser treatment",
    "laser pigmentation removal", "acne scar laser", "laser toning",
  ],
  Other: [
    "aesthetic treatment", "cosmetic procedure", "non-surgical treatment",
    "botox treatment", "dermal fillers", "mesotherapy",
    "PRP treatment", "body contouring", "medical aesthetics",
  ],
};

type StaticGroup = {
  label: string;
  icon: string;
  bg: string; border: string; text: string;
  selBg: string; selText: string;
  keywords: string[];
};

function buildStaticGroups(name: string, category: string, location: string): StaticGroup[] {
  if (!name.trim() || !location) return [];

  const city  = location.charAt(0).toUpperCase() + location.slice(1);
  const short = name.trim().split(/\s+/).slice(0, 3).join(" ").toLowerCase();
  const cat   = category.toLowerCase();

  return [
    {
      label: "Local Intent", icon: "📍",
      bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700",
      selBg: "bg-blue-600", selText: "text-white",
      keywords: [
        `${short} in ${city}`, `best ${short} ${city}`,
        `${short} clinic ${city}`, `${short} near me`,
        `${short} ${city} price`, `best ${cat} clinic ${city}`,
      ],
    },
    {
      label: "Search Intent", icon: "🔍",
      bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700",
      selBg: "bg-violet-600", selText: "text-white",
      keywords: [
        `${short} benefits`, `${short} results`,
        `how much does ${short} cost`, `${short} before after`,
        `${short} side effects`, `${short} recovery time`,
      ],
    },
    {
      label: "Category Terms", icon: "📋",
      bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700",
      selBg: "bg-emerald-600", selText: "text-white",
      keywords: CATEGORY_BANKS[category] ?? [],
    },
  ].filter((g) => g.keywords.length > 0);
}

// ── AI result groups ──────────────────────────────────────────────────────────
type AiKeywords = { seo: string[]; geo: string[]; aeo: string[] };

const AI_GROUPS: {
  key: keyof AiKeywords; label: string; icon: string; desc: string;
  bg: string; border: string; text: string; selBg: string; selText: string;
}[] = [
  {
    key: "seo", label: "SEO", icon: "🔵",
    desc: "Google search · rank #1",
    bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-700",
    selBg: "bg-sky-600", selText: "text-white",
  },
  {
    key: "geo", label: "GEO", icon: "🟣",
    desc: "AI synthesis · ChatGPT / Perplexity",
    bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700",
    selBg: "bg-purple-600", selText: "text-white",
  },
  {
    key: "aeo", label: "AEO",  icon: "🟠",
    desc: "Answer engine · Alexa / Siri",
    bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700",
    selBg: "bg-orange-500", selText: "text-white",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseKws(raw: string) {
  return raw.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);
}
function serializeKws(arr: string[]) { return arr.join(", "); }

function sessionKey(name: string, cat: string, loc: string) {
  return `dr_kw_${name.toLowerCase().replace(/\s+/g, "_")}_${cat}_${loc}`;
}

type AiStatus = "idle" | "loading" | "done" | "error" | "needs_setup";

// ── Component ─────────────────────────────────────────────────────────────────
export default function KeywordSuggestions({ serviceName, category, location, keywords, onChange }: Props) {
  const [aiKws, setAiKws]         = useState<AiKeywords | null>(null);
  const [aiStatus, setAiStatus]   = useState<AiStatus>("idle");
  const [fromCache, setFromCache] = useState(false);

  const staticGroups = useMemo(
    () => buildStaticGroups(serviceName, category, location),
    [serviceName, category, location]
  );

  const current    = useMemo(() => parseKws(keywords), [keywords]);
  const selectedSet = useMemo(() => new Set(current), [current]);

  // When key inputs change, check sessionStorage for a cached AI result
  useEffect(() => {
    if (!serviceName || !category || !location) {
      setAiKws(null);
      setAiStatus("idle");
      return;
    }
    const raw = sessionStorage.getItem(sessionKey(serviceName, category, location));
    if (raw) {
      try {
        setAiKws(JSON.parse(raw));
        setAiStatus("done");
        setFromCache(true);
      } catch {
        setAiStatus("idle");
      }
    } else {
      setAiKws(null);
      setAiStatus("idle");
      setFromCache(false);
    }
  }, [serviceName, category, location]);

  function toggle(kw: string) {
    const kwL = kw.toLowerCase();
    const next = selectedSet.has(kwL)
      ? current.filter((k) => k !== kwL)
      : [...current, kwL];
    onChange(serializeKws(next));
  }

  async function generate() {
    if (!serviceName?.trim() || !category || !location) return;
    setAiStatus("loading");
    try {
      const res  = await fetch("/api/admin/keyword-suggestions", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ serviceName, category, location }),
      });
      const data = await res.json();

      if (data.needsSetup) { setAiStatus("needs_setup"); return; }
      if (!data.success)   { setAiStatus("error"); return; }

      setAiKws(data.keywords);
      setAiStatus("done");
      setFromCache(data.fromCache ?? false);

      // Cache in sessionStorage — survives step navigation, dies on tab close
      sessionStorage.setItem(
        sessionKey(serviceName, category, location),
        JSON.stringify(data.keywords)
      );
    } catch {
      setAiStatus("error");
    }
  }

  if (staticGroups.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-100 bg-[#fafbff] overflow-hidden text-sm">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-2">
          <span className="text-gray-700 font-bold">Suggested Keywords</span>
          <span className="text-[11px] text-gray-400 hidden sm:inline">
            click to add · click again to remove
          </span>
        </div>
        {current.length > 0 && (
          <span className="text-[11px] font-bold bg-blue-600 text-white px-2.5 py-0.5 rounded-full">
            {current.length} added
          </span>
        )}
      </div>

      {/* ── Static groups ───────────────────────────────────────────────── */}
      {staticGroups.map((g) => (
        <div key={g.label} className="px-5 py-4 border-b border-gray-100">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2.5">
            {g.icon} {g.label}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {g.keywords.map((kw) => {
              const sel = selectedSet.has(kw.toLowerCase());
              return (
                <Pill key={kw} label={kw} selected={sel}
                  bg={g.bg} text={g.text} border={g.border}
                  selBg={g.selBg} selText={g.selText}
                  onClick={() => toggle(kw)} />
              );
            })}
          </div>
        </div>
      ))}

      {/* ── AI section ──────────────────────────────────────────────────── */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-violet-500" />
            <span className="font-bold text-gray-700">AI-Powered Keywords</span>
            <span className="text-[10px] text-gray-400 font-medium">
              Gemini · competitor-aware · grouped by SEO / GEO / AEO
            </span>
          </div>
          {fromCache && aiStatus === "done" && (
            <span className="text-[10px] text-gray-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              cached · no cost
            </span>
          )}
        </div>

        {/* ── Idle state ── */}
        {aiStatus === "idle" && (
          <button
            type="button"
            onClick={generate}
            disabled={!serviceName?.trim() || !category || !location}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold text-xs shadow-sm hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            <Sparkles size={13} />
            Generate Competitor Keywords
          </button>
        )}

        {/* ── Loading state ── */}
        {aiStatus === "loading" && (
          <div className="flex items-center gap-2 text-violet-600 text-xs font-medium py-2">
            <Loader2 size={14} className="animate-spin" />
            Analysing competitors and generating keywords…
          </div>
        )}

        {/* ── Error state ── */}
        {aiStatus === "error" && (
          <div className="flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 text-red-600 text-xs">
              <AlertCircle size={14} />
              Gemini returned an error. Try again.
            </div>
            <button type="button" onClick={generate}
              className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 transition">
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        )}

        {/* ── Needs setup ── */}
        {aiStatus === "needs_setup" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <AlertCircle size={13} /> Gemini API key not configured
            </p>
            <p>
              Add <code className="bg-amber-100 px-1 rounded font-mono">GEMINI_API_KEY=your_key</code> to{" "}
              <code className="bg-amber-100 px-1 rounded font-mono">.env.local</code> and restart the server.
            </p>
            <p className="text-amber-600">
              Get a free key at{" "}
              <span className="underline font-semibold">aistudio.google.com</span>
              {" "}— 15 requests/minute free.
            </p>
          </div>
        )}

        {/* ── Done — AI keyword pills ── */}
        {aiStatus === "done" && aiKws && (
          <div className="space-y-3">
            {AI_GROUPS.map((g) => {
              const kws = aiKws[g.key];
              if (!kws?.length) return null;
              return (
                <div key={g.key}>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1.5">
                    {g.icon} {g.label}
                    <span className="font-normal normal-case tracking-normal text-gray-300">
                      · {g.desc}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {kws.map((kw) => {
                      const sel = selectedSet.has(kw.toLowerCase());
                      return (
                        <Pill key={kw} label={kw} selected={sel}
                          bg={g.bg} text={g.text} border={g.border}
                          selBg={g.selBg} selText={g.selText}
                          onClick={() => toggle(kw)} />
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Regenerate link */}
            <button type="button" onClick={generate}
              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-violet-600 transition mt-1">
              <RefreshCw size={11} /> Regenerate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Reusable pill ─────────────────────────────────────────────────────────────
function Pill({
  label, selected, bg, text, border, selBg, selText, onClick,
}: {
  label: string; selected: boolean;
  bg: string; text: string; border: string; selBg: string; selText: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold
        border transition-all duration-150 cursor-pointer
        ${selected
          ? `${selBg} ${selText} border-transparent shadow-sm scale-[1.02]`
          : `${bg} ${text} ${border} hover:opacity-80`}
      `}
    >
      {selected ? <X size={9} className="shrink-0" /> : <Plus size={9} className="shrink-0" />}
      {label}
    </button>
  );
}
