"use client";

import { useState, useEffect } from "react";
import { Sparkles, Loader2, AlertCircle, RefreshCw, Check } from "lucide-react";

interface Props {
  serviceName: string;
  category: string;
  location: string;
  onApply: (title: string, description: string) => void;
}

type MetaOption = { title: string; description: string };
type Status = "idle" | "loading" | "done" | "error" | "needs_setup";

function sessionKey(name: string, cat: string, loc: string) {
  return `dr_meta_${name.toLowerCase().replace(/\s+/g, "_")}_${cat}_${loc}`;
}

export default function MetaSuggestions({ serviceName, category, location, onApply }: Props) {
  const [options, setOptions] = useState<MetaOption[] | null>(null);
  const [status, setStatus]   = useState<Status>("idle");
  const [fromCache, setFromCache] = useState(false);
  const [appliedIdx, setAppliedIdx] = useState<number | null>(null);

  useEffect(() => {
    setAppliedIdx(null);
    if (!serviceName || !category || !location) {
      setOptions(null);
      setStatus("idle");
      return;
    }
    const raw = sessionStorage.getItem(sessionKey(serviceName, category, location));
    if (raw) {
      try {
        setOptions(JSON.parse(raw));
        setStatus("done");
        setFromCache(true);
      } catch {
        setStatus("idle");
      }
    } else {
      setOptions(null);
      setStatus("idle");
      setFromCache(false);
    }
  }, [serviceName, category, location]);

  async function generate() {
    if (!serviceName?.trim() || !category || !location) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/admin/meta-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceName, category, location }),
      });
      const data = await res.json();

      if (data.needsSetup) { setStatus("needs_setup"); return; }
      if (!data.success)   { setStatus("error"); return; }

      setOptions(data.options);
      setStatus("done");
      setFromCache(data.fromCache ?? false);
      setAppliedIdx(null);

      sessionStorage.setItem(sessionKey(serviceName, category, location), JSON.stringify(data.options));
    } catch {
      setStatus("error");
    }
  }

  function apply(idx: number, opt: MetaOption) {
    onApply(opt.title, opt.description);
    setAppliedIdx(idx);
  }

  if (!serviceName?.trim()) return null;

  return (
    <div className="rounded-xl border border-gray-100 bg-[#fafbff] overflow-hidden text-sm">
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-violet-500" />
            <span className="font-bold text-gray-700">AI Title &amp; Description Ideas</span>
            <span className="text-[10px] text-gray-400 font-medium">
              Gemini · competitor-informed{location?.toLowerCase() === "all" ? " · city-agnostic (shared across all 4 city pages)" : ""}
            </span>
          </div>
          {fromCache && status === "done" && (
            <span className="text-[10px] text-gray-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
              cached · no cost
            </span>
          )}
        </div>

        {status === "idle" && (
          <button
            type="button"
            onClick={generate}
            disabled={!serviceName?.trim() || !category || !location}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold text-xs shadow-sm hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
          >
            <Sparkles size={13} />
            Generate Title &amp; Description Ideas
          </button>
        )}

        {status === "loading" && (
          <div className="flex items-center gap-2 text-violet-600 text-xs font-medium py-2">
            <Loader2 size={14} className="animate-spin" />
            Writing SEO-optimised options…
          </div>
        )}

        {status === "error" && (
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

        {status === "needs_setup" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <AlertCircle size={13} /> Gemini API key not configured
            </p>
            <p>
              Add <code className="bg-amber-100 px-1 rounded font-mono">GEMINI_API_KEY=your_key</code> to{" "}
              <code className="bg-amber-100 px-1 rounded font-mono">.env.local</code> and restart the server.
            </p>
          </div>
        )}

        {status === "done" && options && (
          <div className="space-y-2.5">
            {options.map((opt, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-3.5 bg-white">
                <p className="font-semibold text-[#0B2560] text-sm leading-snug">{opt.title}</p>
                <p className="text-gray-500 text-xs mt-1 leading-relaxed">{opt.description}</p>
                <div className="flex items-center justify-between mt-2.5">
                  <span className="text-[10px] text-gray-300 font-mono">
                    {opt.title.length}/60 · {opt.description.length}/160
                  </span>
                  <button
                    type="button"
                    onClick={() => apply(i, opt)}
                    className={`flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg transition ${
                      appliedIdx === i
                        ? "bg-green-50 text-green-700"
                        : "bg-[#0B2560] text-white hover:bg-[#0d2d73]"
                    }`}
                  >
                    {appliedIdx === i ? (<><Check size={11} /> Applied</>) : "Use this"}
                  </button>
                </div>
              </div>
            ))}
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
