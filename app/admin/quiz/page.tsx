"use client";

import { useEffect, useState, useCallback } from "react";
import { DEFAULT_QUIZ_CONFIG } from "@/app/lib/quizDefaults";

// ─── Types ────────────────────────────────────────────────────────────────────

type Option = { id: string; emoji: string; label: string; desc: string };
type StepMeta = { step: number; title: string; subtitle: string };
type Treatment = { name: string; icon: string; desc: string; sessions: string; price: string; match: number };
type TreatmentMap = { concernId: string; treatments: Treatment[] };

type QuizConfig = {
  stepMeta: StepMeta[];
  concerns: Option[];
  skinTypes: Option[];
  experiences: Option[];
  budgets: string[];
  timelines: Option[];
  treatmentMap: TreatmentMap[];
};

// ─── Step meta labels ─────────────────────────────────────────────────────────

const STEP_SECTION_LABELS: Record<number, string> = {
  1: "Concerns (Step 1)",
  2: "Skin Types (Step 2)",
  3: "Experiences (Step 3)",
  4: "Budgets (Step 4)",
  5: "Timelines (Step 5)",
};

// ─── Small reusable components ────────────────────────────────────────────────

function Input({ value, onChange, placeholder, className = "" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full ${className}`}
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 2 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full resize-none"
    />
  );
}

// ─── Options editor (for concerns, skinTypes, experiences, timelines) ─────────

function OptionsEditor({
  options,
  onChange,
  showDesc = true,
}: {
  options: Option[];
  onChange: (opts: Option[]) => void;
  showDesc?: boolean;
}) {
  const update = (i: number, field: keyof Option, val: string) => {
    const next = options.map((o, idx) => {
      if (idx !== i) return o;
      // Keep id in sync with label for new options (id starts empty)
      if (field === "label" && !o.id) return { ...o, label: val, id: val };
      return { ...o, [field]: val };
    });
    onChange(next);
  };

  const remove = (i: number) => onChange(options.filter((_, idx) => idx !== i));

  // New options start with empty id — it gets set when label is typed
  const add = () => onChange([...options, { id: "", emoji: "", label: "", desc: "" }]);

  return (
    <div className="space-y-2">
      {options.map((opt, i) => (
        <div key={i} className="flex gap-2 items-start bg-gray-50 rounded-lg p-2">
          <input
            value={opt.emoji}
            onChange={(e) => update(i, "emoji", e.target.value)}
            placeholder="🔴"
            className="w-12 border border-gray-200 rounded-lg px-2 py-2 text-center text-base focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
          />
          <div className="flex-1 space-y-1.5">
            <Input value={opt.label} onChange={(v) => update(i, "label", v)} placeholder="Option label" />
            {opt.id && (
              <p className="text-[10px] text-gray-400 px-1">ID: <span className="font-mono">{opt.id}</span> (stable — do not rename)</p>
            )}
            {showDesc && (
              <Input value={opt.desc} onChange={(v) => update(i, "desc", v)} placeholder="Short description (optional)" />
            )}
          </div>
          <button
            onClick={() => remove(i)}
            className="mt-1 text-red-400 hover:text-red-600 text-lg leading-none shrink-0"
            title="Remove"
          >×</button>
        </div>
      ))}
      <button
        onClick={add}
        className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-1"
      >
        + Add option
      </button>
    </div>
  );
}

// ─── Budget editor (plain strings) ────────────────────────────────────────────

function BudgetsEditor({ budgets, onChange }: { budgets: string[]; onChange: (b: string[]) => void }) {
  const update = (i: number, v: string) => onChange(budgets.map((b, idx) => idx === i ? v : b));
  const remove = (i: number) => onChange(budgets.filter((_, idx) => idx !== i));
  const add = () => onChange([...budgets, ""]);

  return (
    <div className="space-y-2">
      {budgets.map((b, i) => (
        <div key={i} className="flex gap-2">
          <Input value={b} onChange={(v) => update(i, v)} placeholder="e.g. ₹5,000 – ₹15,000 per session" />
          <button onClick={() => remove(i)} className="text-red-400 hover:text-red-600 text-lg leading-none shrink-0">×</button>
        </div>
      ))}
      <button onClick={add} className="text-sm text-blue-600 hover:text-blue-800 font-medium">+ Add budget</button>
    </div>
  );
}

// ─── Treatment card editor ────────────────────────────────────────────────────

function TreatmentCard({
  t,
  onChange,
  onRemove,
}: {
  t: Treatment;
  onChange: (t: Treatment) => void;
  onRemove: () => void;
}) {
  const set = (field: keyof Treatment, val: string | number) =>
    onChange({ ...t, [field]: val });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex gap-2 items-center">
        <input
          value={t.icon}
          onChange={(e) => set("icon", e.target.value)}
          placeholder="✨"
          className="w-12 border border-gray-200 rounded-lg px-2 py-2 text-center text-base focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
        />
        <Input value={t.name} onChange={(v) => set("name", v)} placeholder="Treatment name" className="flex-1" />
        <div className="flex items-center gap-1 shrink-0">
          <input
            type="number"
            min={0}
            max={100}
            value={t.match}
            onChange={(e) => set("match", Number(e.target.value))}
            className="w-16 border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-400">%</span>
        </div>
        <button onClick={onRemove} className="text-red-400 hover:text-red-600 text-xl leading-none shrink-0">×</button>
      </div>
      <Textarea value={t.desc} onChange={(v) => set("desc", v)} placeholder="Clinical description…" rows={2} />
      <div className="grid grid-cols-2 gap-2">
        <Input value={t.sessions} onChange={(v) => set("sessions", v)} placeholder="Sessions (e.g. 4–6 sessions)" />
        <Input value={t.price} onChange={(v) => set("price", v)} placeholder="Price (e.g. ₹5,000 – ₹12,000)" />
      </div>
    </div>
  );
}

// ─── Per-concern treatment map panel ──────────────────────────────────────────

function ConcernTreatmentPanel({
  entry,
  onChange,
}: {
  entry: TreatmentMap;
  onChange: (e: TreatmentMap) => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState("");

  const updateTreatment = (i: number, t: Treatment) => {
    const next = entry.treatments.map((x, idx) => idx === i ? t : x);
    onChange({ ...entry, treatments: next });
  };

  const removeTreatment = (i: number) => {
    onChange({ ...entry, treatments: entry.treatments.filter((_, idx) => idx !== i) });
  };

  const addTreatment = () => {
    onChange({
      ...entry,
      treatments: [
        ...entry.treatments,
        { name: "", icon: "✨", desc: "", sessions: "", price: "", match: 80 },
      ],
    });
  };

  const aiSuggest = async () => {
    setGenerating(true);
    setAiError("");
    try {
      const res = await fetch("/api/admin/quiz/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concernId: entry.concernId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      onChange({ ...entry, treatments: data.data });
    } catch (err: any) {
      setAiError(err.message || "AI generation failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-700 text-sm">
          {entry.concernId}
          <span className="ml-2 text-xs text-gray-400 font-normal">({entry.treatments.length} treatments)</span>
        </h4>
        <button
          onClick={aiSuggest}
          disabled={generating}
          className="flex items-center gap-1.5 bg-purple-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-purple-700 disabled:opacity-60 transition"
        >
          {generating ? (
            <><span className="animate-spin">⏳</span> Generating…</>
          ) : (
            <><span>✨</span> AI Suggest</>
          )}
        </button>
      </div>

      {aiError && (
        <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-1.5">{aiError}</p>
      )}

      <div className="space-y-2">
        {entry.treatments.map((t, i) => (
          <TreatmentCard
            key={i}
            t={t}
            onChange={(updated) => updateTreatment(i, updated)}
            onRemove={() => removeTreatment(i)}
          />
        ))}
      </div>

      {entry.treatments.length < 5 && (
        <button onClick={addTreatment} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
          + Add treatment
        </button>
      )}
    </div>
  );
}

// ─── Generate All button ──────────────────────────────────────────────────────

function GenerateAllButton({
  concerns,
  onUpdate,
}: {
  concerns: string[];
  onUpdate: (concernId: string, treatments: Treatment[]) => void;
}) {
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);

  const run = async () => {
    if (!confirm(`Generate AI treatments for all ${concerns.length} concerns? This will replace existing treatments.`)) return;
    setState("running");
    setProgress(0);
    let errors = 0;
    for (let i = 0; i < concerns.length; i++) {
      try {
        const res = await fetch("/api/admin/quiz/ai-suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ concernId: concerns[i] }),
        });
        const data = await res.json();
        if (data.success) onUpdate(concerns[i], data.data);
        else errors++;
      } catch {
        errors++;
      }
      setProgress(i + 1);
    }
    setState(errors === 0 ? "done" : "error");
    setTimeout(() => setState("idle"), 4000);
  };

  const label =
    state === "running" ? `Generating ${progress}/${concerns.length}…` :
    state === "done"    ? "✓ All generated" :
    state === "error"   ? "⚠ Some failed" :
    "✨ Generate All";

  return (
    <button
      onClick={run}
      disabled={state === "running"}
      className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
        state === "done"  ? "bg-green-600 text-white" :
        state === "error" ? "bg-red-500 text-white" :
        "bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function QuizAdminPage() {
  const [config, setConfig] = useState<QuizConfig>(() => JSON.parse(JSON.stringify(DEFAULT_QUIZ_CONFIG)) as QuizConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"questions" | "treatments">("questions");
  const [openStep, setOpenStep] = useState<number | null>(1);
  const [openConcern, setOpenConcern] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/quiz")
      .then((r) => r.json())
      .then((d) => { if (d.success) setConfig(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Ensure treatmentMap has an entry for every concern
  const syncTreatmentMap = useCallback((cfg: QuizConfig): QuizConfig => {
    const existingIds = new Set(cfg.treatmentMap.map((e) => e.concernId));
    const missing = cfg.concerns
      .filter((c) => !existingIds.has(c.id || c.label))
      .map((c) => ({ concernId: c.id || c.label, treatments: [] }));
    return { ...cfg, treatmentMap: [...cfg.treatmentMap, ...missing] };
  }, []);

  const updateConfig = (patch: Partial<QuizConfig>) => {
    setConfig((prev) => syncTreatmentMap({ ...prev, ...patch }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/quiz", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    if (!confirm("Reset all quiz content to the original defaults? This will overwrite your changes.")) return;
    setConfig(JSON.parse(JSON.stringify(DEFAULT_QUIZ_CONFIG)) as QuizConfig);
    setSaved(false);
  };

  const updateStepMeta = (step: number, field: "title" | "subtitle", value: string) => {
    updateConfig({
      stepMeta: config.stepMeta.map((s) =>
        s.step === step ? { ...s, [field]: value } : s
      ),
    });
  };

  const getStepMeta = (step: number) =>
    config.stepMeta.find((s) => s.step === step) ?? { step, title: "", subtitle: "" };

  const updateTreatmentMap = (concernId: string, entry: TreatmentMap) => {
    setConfig((prev) => ({
      ...prev,
      treatmentMap: prev.treatmentMap.map((e) =>
        e.concernId === concernId ? entry : e
      ),
    }));
    setSaved(false);
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Loading quiz config…</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quiz</h1>
          <p className="text-sm text-gray-500 mt-1">
            Edit quiz questions, options, and treatment recommendations. Changes go live instantly.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={resetToDefaults}
            className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-2"
          >
            Reset defaults
          </button>
          <button
            onClick={save}
            disabled={saving}
            className={`px-5 py-2 rounded-lg text-sm font-semibold text-white transition ${
              saved ? "bg-green-600" : "bg-[#0B2545] hover:bg-[#1a3a6e]"
            } disabled:opacity-50`}
          >
            {saving ? "Saving…" : saved ? "✓ Saved" : "Save Changes"}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(["questions", "treatments"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              tab === t ? "bg-white text-[#0B2545] shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "questions" ? "📋 Questions & Options" : "💊 Treatment Map"}
          </button>
        ))}
      </div>

      {/* ── Questions tab ── */}
      {tab === "questions" && (
        <div className="space-y-4">
          {/* Step 1 — Concerns */}
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => setOpenStep(openStep === step ? null : step)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition"
              >
                <div>
                  <span className="font-semibold text-gray-800">{STEP_SECTION_LABELS[step]}</span>
                  <span className="ml-3 text-xs text-gray-400">
                    {step === 4
                      ? `${config.budgets.length} options`
                      : step === 1 ? `${config.concerns.length} options`
                      : step === 2 ? `${config.skinTypes.length} options`
                      : step === 3 ? `${config.experiences.length} options`
                      : `${config.timelines.length} options`}
                  </span>
                </div>
                <span className="text-gray-400 text-lg">{openStep === step ? "▲" : "▼"}</span>
              </button>

              {openStep === step && (
                <div className="px-5 pb-5 border-t border-gray-50 pt-4 space-y-4">
                  {/* Step title / subtitle */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">Question title</label>
                      <Input
                        value={getStepMeta(step).title}
                        onChange={(v) => updateStepMeta(step, "title", v)}
                        placeholder="What's your main concern?"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">Subtitle</label>
                      <Input
                        value={getStepMeta(step).subtitle}
                        onChange={(v) => updateStepMeta(step, "subtitle", v)}
                        placeholder="Shown below the question"
                      />
                    </div>
                  </div>

                  {/* Options */}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-2 block">Answer options</label>
                    {step === 1 && (
                      <OptionsEditor
                        options={config.concerns}
                        onChange={(v) => updateConfig({ concerns: v })}
                        showDesc={false}
                      />
                    )}
                    {step === 2 && (
                      <OptionsEditor
                        options={config.skinTypes}
                        onChange={(v) => updateConfig({ skinTypes: v })}
                      />
                    )}
                    {step === 3 && (
                      <OptionsEditor
                        options={config.experiences}
                        onChange={(v) => updateConfig({ experiences: v })}
                      />
                    )}
                    {step === 4 && (
                      <BudgetsEditor budgets={config.budgets} onChange={(v) => updateConfig({ budgets: v })} />
                    )}
                    {step === 5 && (
                      <OptionsEditor
                        options={config.timelines}
                        onChange={(v) => updateConfig({ timelines: v })}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Treatment Map tab ── */}
      {tab === "treatments" && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
            <p className="text-sm text-gray-500">
              <strong>💡 AI Suggest</strong> — click the purple button on any concern to generate 3 evidence-based treatment recommendations, or use <strong>Generate All</strong> to populate every concern at once.
            </p>
            <GenerateAllButton
              concerns={config.treatmentMap.map((e) => e.concernId)}
              onUpdate={(concernId, treatments) =>
                updateTreatmentMap(concernId, {
                  concernId,
                  treatments,
                })
              }
            />
          </div>

          {config.treatmentMap.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
              No concerns configured yet. Add concerns in the Questions tab first.
            </div>
          ) : (
            config.treatmentMap.map((entry) => (
              <div key={entry.concernId} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setOpenConcern(openConcern === entry.concernId ? null : entry.concernId)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {config.concerns.find((c) => (c.id || c.label) === entry.concernId)?.emoji ?? "🩺"}
                    </span>
                    <div>
                      <span className="font-semibold text-gray-800">{entry.concernId}</span>
                      <span className="ml-3 text-xs text-gray-400">{entry.treatments.length} treatments</span>
                    </div>
                  </div>
                  <span className="text-gray-400">{openConcern === entry.concernId ? "▲" : "▼"}</span>
                </button>

                {openConcern === entry.concernId && (
                  <div className="px-5 pb-5 border-t border-gray-50 pt-4">
                    <ConcernTreatmentPanel
                      entry={entry}
                      onChange={(updated) => updateTreatmentMap(entry.concernId, updated)}
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
