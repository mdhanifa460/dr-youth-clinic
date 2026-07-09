"use client";

import { useState, useMemo } from "react";
import { Sparkles, Plus, X, Loader2, AlertCircle, RefreshCw, Check } from "lucide-react";

interface Props {
  lpId: string;
  pageTitle: string;
  template: string;
  description: string;
  keywords: string; // comma-separated current value in the form
  onApplyDescription: (v: string) => void;
  onKeywordsChange: (v: string) => void;
}

type AiResult = { title: string; description: string; keywords: string[] };
type AiStatus = "idle" | "loading" | "done" | "error" | "needs_setup";

function parseKws(raw: string) {
  return raw.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);
}
function serializeKws(arr: string[]) {
  return arr.join(", ");
}

export default function SeoAiAssistant({
  lpId, pageTitle, template, description, keywords, onApplyDescription, onKeywordsChange,
}: Props) {
  const [status, setStatus] = useState<AiStatus>("idle");
  const [result, setResult] = useState<AiResult | null>(null);
  const [titleCopied, setTitleCopied] = useState(false);

  const current = useMemo(() => parseKws(keywords), [keywords]);
  const selectedSet = useMemo(() => new Set(current), [current]);

  function toggle(kw: string) {
    const kwL = kw.toLowerCase();
    const next = selectedSet.has(kwL)
      ? current.filter((k) => k !== kwL)
      : [...current, kwL];
    onKeywordsChange(serializeKws(next));
  }

  async function generate() {
    if (!pageTitle?.trim()) return;
    setStatus("loading");
    try {
      const res = await fetch(`/api/admin/landing-pages/${lpId}/seo-keywords`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: pageTitle, template, description }),
      });
      const data = await res.json();

      if (data.needsSetup) { setStatus("needs_setup"); return; }
      if (!data.success) { setStatus("error"); return; }

      setResult({ title: data.title, description: data.description, keywords: data.keywords });
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  function copyTitle() {
    if (!result) return;
    navigator.clipboard?.writeText(result.title).catch(() => {});
    setTitleCopied(true);
    setTimeout(() => setTitleCopied(false), 1500);
  }

  if (!pageTitle?.trim()) return null;

  return (
    <div className="rounded-xl border border-gray-100 bg-[#fafbff] overflow-hidden text-sm">
      <div className="px-4 py-3.5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-violet-500" />
            <span className="font-bold text-gray-700 text-xs">AI SEO Assistant</span>
            <span className="text-[10px] text-gray-400 font-medium">Gemini · title, description &amp; keywords</span>
          </div>
          {current.length > 0 && (
            <span className="text-[11px] font-bold bg-blue-600 text-white px-2.5 py-0.5 rounded-full">
              {current.length} keywords added
            </span>
          )}
        </div>

        {status === "idle" && (
          <button
            type="button"
            onClick={generate}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-2 rounded-xl font-semibold text-xs shadow-sm hover:-translate-y-0.5 transition-all"
          >
            <Sparkles size={13} />
            Generate SEO Title, Description &amp; Keywords
          </button>
        )}

        {status === "loading" && (
          <div className="flex items-center gap-2 text-violet-600 text-xs font-medium py-2">
            <Loader2 size={14} className="animate-spin" />
            Generating SEO metadata…
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

        {status === "done" && result && (
          <div className="space-y-3">
            {/* Suggested title */}
            <div className="bg-white border border-gray-100 rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Suggested title</p>
              <div className="flex items-center gap-2">
                <p className="flex-1 text-xs text-gray-700">{result.title}</p>
                <button type="button" onClick={copyTitle}
                  className="shrink-0 text-[11px] font-semibold text-violet-600 hover:text-violet-800 transition flex items-center gap-1">
                  {titleCopied ? <><Check size={11} /> Copied</> : "Copy"}
                </button>
              </div>
            </div>

            {/* Suggested description with apply */}
            <div className="bg-white border border-gray-100 rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1">Suggested description</p>
              <div className="flex items-start gap-2">
                <p className="flex-1 text-xs text-gray-700">{result.description}</p>
                <button type="button" onClick={() => onApplyDescription(result.description)}
                  className="shrink-0 text-[11px] font-semibold text-violet-600 hover:text-violet-800 transition">
                  Apply
                </button>
              </div>
            </div>

            {/* Keyword pills */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">
                Tap to add/remove from keywords field
              </p>
              <div className="flex flex-wrap gap-1.5">
                {result.keywords.map((kw) => {
                  const sel = selectedSet.has(kw.toLowerCase());
                  return (
                    <button
                      key={kw}
                      type="button"
                      onClick={() => toggle(kw)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                        sel
                          ? "bg-violet-600 text-white border-transparent shadow-sm scale-[1.02]"
                          : "bg-sky-50 text-sky-700 border-sky-200 hover:opacity-80"
                      }`}
                    >
                      {sel ? <X size={9} className="shrink-0" /> : <Plus size={9} className="shrink-0" />}
                      {kw}
                    </button>
                  );
                })}
              </div>
            </div>

            <button type="button" onClick={generate}
              className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-violet-600 transition">
              <RefreshCw size={11} /> Regenerate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
