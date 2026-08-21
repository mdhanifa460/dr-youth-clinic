"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_QUIZ_CONFIG,
  DEFAULT_QUESTIONS,
  type AssessmentConfigData,
  type AssessmentQuestion,
  type AssessmentAnswer,
  type QuestionType,
} from "@/app/lib/quizDefaults";
import { canAccess, type AdminRole } from "@/app/lib/permissions";

// ─── Category tabs ──────────────────────────────────────────────────────────
//
// The real, live root cause of a production incident this same session:
// this editor's ONLY way to say "which patients see this question" was a
// free-text "comma-separated tags" box, hand-typed against whatever tags
// Plan My Journey's goals (app/admin/journey) happen to use right now —
// with nothing checking the two ever actually match. They silently
// diverged (an admin rewrote every question's tags to a cleaner scheme —
// "hair"/"skin"/"laser"/"weight loss" — without knowing the goals still
// pointed at the old one), and three of four goals' follow-up questions
// went dark with zero indication why.
//
// Category is built FROM the live goals list (fetched below), never
// hand-typed — a question assigned to a category tab is tagged with that
// goal's own real concernTags, so there is no longer a second, independently-
// typed copy of the tag to drift out of sync. "universal" is a special,
// synthetic category (not a real goal) for conditionTags: [] — shown to
// every patient regardless of what they picked.
interface Category {
  slug: string;
  label: string;
  icon: string;
  tags: string[]; // [] for the universal category
}
const UNIVERSAL_CATEGORY: Category = { slug: "universal", label: "Everyone", icon: "🌐", tags: [] };

// Which category tab(s) a question currently belongs to — a question with
// no conditionTags is universal; one whose conditionTags don't overlap ANY
// current goal's tags belongs to none (surfaced as "Unassigned" so this
// exact silent-mismatch failure mode is visible instead of hidden).
function categoriesForQuestion(question: AssessmentQuestion, categories: Category[]): Category[] {
  if (!question.conditionTags?.length) return [UNIVERSAL_CATEGORY];
  return categories.filter((c) => c.tags.some((t) => question.conditionTags!.includes(t)));
}

// ─── Small reusable inputs ─────────────────────────────────────────────────

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

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${checked ? "bg-[#0B2560]" : "bg-gray-200"}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow ${checked ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "single", label: "Single Select" },
  { value: "multi", label: "Multiple Select" },
  { value: "slider", label: "Slider" },
  { value: "yesno", label: "Yes / No" },
  { value: "number", label: "Number" },
  { value: "dropdown", label: "Dropdown" },
  { value: "image", label: "Image Choice" },
  { value: "emoji", label: "Emoji Choice" },
  { value: "photo", label: "Photo Upload" },
  { value: "text", label: "Free Text / Notes" },
];

// Questions that never need an answers editor or slider config — visitors
// interact with them directly (a number input, a photo picker, a text box).
const NO_ANSWERS_TYPES: QuestionType[] = ["slider", "number", "photo", "text"];
const SLIDER_CONFIG_TYPES: QuestionType[] = ["slider", "number"];

// Built-in "helper" questions a doctor can add with one click instead of
// building from scratch — demographics (gender/age), photo, and a free-text
// note. Not all scoring-relevant; some are purely informational for the
// doctor (see quizDefaults.ts comment on the same ids).
const QUICK_ADD_QUESTION_IDS = ["gender", "age", "photo", "notes"];

// ─── Answer editor ───────────────────────────────────────────────────────────

function AnswerRow({
  answer, onChange, onRemove, allQuestions, ownQuestionId,
}: {
  answer: AssessmentAnswer;
  onChange: (a: AssessmentAnswer) => void;
  onRemove: () => void;
  allQuestions: AssessmentQuestion[];
  ownQuestionId: string;
}) {
  const set = (patch: Partial<AssessmentAnswer>) => onChange({ ...answer, ...patch });
  return (
    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
      <div className="flex gap-2 items-center">
        <input
          value={answer.icon} onChange={(e) => set({ icon: e.target.value })} placeholder="🔴"
          className="w-12 border border-gray-200 rounded-lg px-2 py-2 text-center text-base focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
        />
        <Input value={answer.title} onChange={(v) => set({ title: v, id: answer.id || slugify(v) })} placeholder="Answer title" className="flex-1" />
        <button onClick={onRemove} className="text-red-400 hover:text-red-600 text-lg leading-none shrink-0">×</button>
      </div>
      <Input value={answer.description} onChange={(v) => set({ description: v })} placeholder="Description (optional)" />
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="text-[10px] text-gray-400 block mb-0.5">Tags (comma-separated)</label>
          <Input value={answer.tags.join(", ")} onChange={(v) => set({ tags: v.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean) })} placeholder="hair, prp" />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 block mb-0.5">Weight</label>
          <input type="number" min={0} max={100} value={answer.weight} onChange={(e) => set({ weight: Number(e.target.value) })}
            className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 block mb-0.5">Next Question</label>
          <select value={answer.nextQuestionId} onChange={(e) => set({ nextQuestionId: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Continue in order</option>
            {allQuestions.filter((q) => q.id !== ownQuestionId).map((q) => (
              <option key={q.id} value={q.id}>{q.title || q.id}</option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-[10px] text-gray-400">ID: <span className="font-mono">{answer.id}</span> — used by tags/branching, keep stable</p>
    </div>
  );
}

// ─── Question card ───────────────────────────────────────────────────────────

function QuestionCard({
  question, allQuestions, categories, onChange, onRemove, onMove, isFirst, isLast,
}: {
  question: AssessmentQuestion;
  allQuestions: AssessmentQuestion[];
  categories: Category[];
  onChange: (q: AssessmentQuestion) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [showAdvancedTags, setShowAdvancedTags] = useState(false);
  const set = (patch: Partial<AssessmentQuestion>) => onChange({ ...question, ...patch });

  const conditionTags = question.conditionTags || [];
  const activeCategories = categoriesForQuestion(question, categories);
  // Toggling a category tab adds/removes THAT GOAL'S OWN real tags — never
  // a hand-typed guess at what they might be, so this can't reproduce the
  // exact drift that caused the incident this whole picker replaces.
  const toggleCategory = (cat: Category) => {
    const isOn = activeCategories.some((c) => c.slug === cat.slug);
    if (isOn) {
      set({ conditionTags: conditionTags.filter((t) => !cat.tags.includes(t)) });
    } else {
      set({ conditionTags: Array.from(new Set([...conditionTags, ...cat.tags])) });
    }
  };

  const addAnswer = () => set({ answers: [...question.answers, { id: "", title: "", description: "", icon: "", image: "", score: 0, tags: [], weight: 0, nextQuestionId: "" }] });
  const updateAnswer = (i: number, a: AssessmentAnswer) => set({ answers: question.answers.map((x, idx) => idx === i ? a : x) });
  const removeAnswer = (i: number) => set({ answers: question.answers.filter((_, idx) => idx !== i) });

  const needsAnswers = !NO_ANSWERS_TYPES.includes(question.type);
  const needsSliderConfig = SLIDER_CONFIG_TYPES.includes(question.type);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="flex flex-col shrink-0">
          <button onClick={() => onMove(-1)} disabled={isFirst} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none py-0.5">▲</button>
          <button onClick={() => onMove(1)} disabled={isLast} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none py-0.5">▼</button>
        </div>
        <span className="text-xl shrink-0">{question.icon || "❓"}</span>
        <button onClick={() => setOpen((o) => !o)} className="flex-1 min-w-0 text-left">
          <p className="font-semibold text-gray-800 text-sm truncate">{question.title || "Untitled question"}</p>
          <p className="text-xs text-gray-400">{QUESTION_TYPES.find((t) => t.value === question.type)?.label} · {question.answers.length} answers</p>
        </button>
        <button onClick={onRemove} className="text-red-400 hover:text-red-600 text-xl leading-none shrink-0">×</button>
        <span className="text-gray-400 shrink-0">{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-50 pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Title</label>
              <Input value={question.title} onChange={(v) => set({ title: v })} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Icon (emoji)</label>
              <Input value={question.icon} onChange={(v) => set({ icon: v })} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Subtitle</label>
            <Input value={question.subtitle} onChange={(v) => set({ subtitle: v })} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Show this question for</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => set({ conditionTags: [] })}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                  conditionTags.length === 0
                    ? "bg-[#0B2560] text-white border-[#0B2560]"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                }`}
              >
                🌐 Everyone
              </button>
              {categories.map((cat) => {
                const isOn = activeCategories.some((c) => c.slug === cat.slug);
                return (
                  <button
                    key={cat.slug}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                      isOn ? "bg-[#0B2560] text-white border-[#0B2560]" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {cat.icon} {cat.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">
              {conditionTags.length === 0
                ? "Shown to every patient, no matter what they picked."
                : activeCategories.length > 0
                  ? `Shown only to patients whose goal matches ${activeCategories.map((c) => c.label).join(" or ")}.`
                  : "These tags don't match any category patients can actually pick right now."}
            </p>
            {activeCategories.length === 0 && conditionTags.length > 0 && (
              <p className="text-[10px] text-red-500 mt-1 font-semibold">
                ⚠️ This question is currently unreachable — no real patient will ever see it. Pick a category
                above, or check Advanced below if this is intentional (a custom tag not tied to a goal).
              </p>
            )}
            <details className="mt-2.5">
              <summary className="text-[10px] text-gray-400 cursor-pointer hover:text-gray-600 select-none">
                Advanced: edit raw tags directly
              </summary>
              <div className="mt-2">
                <Input
                  value={conditionTags.join(", ")}
                  onChange={(v) => set({ conditionTags: v.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean) })}
                  placeholder="e.g. hair, acne, pigmentation"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  Only needed for a tag that doesn't correspond to any category above — the buttons do this
                  safely for the normal case, always using the goal's own real tags instead of a hand-typed
                  guess.
                </p>
              </div>
            </details>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">
              Also require ALL of these tags <span className="font-normal text-gray-400">(comma-separated — leave blank to skip this check)</span>
            </label>
            <Input
              value={(question.requiredTags || []).join(", ")}
              onChange={(v) => set({ requiredTags: v.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean) })}
              placeholder="e.g. female"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Unlike "Show only for these concerns" above (any one match is enough), every tag listed here
              must be present. Use this for questions that depend on more than one thing at once — e.g. a
              pregnancy question under Concerns "hair" that should also require the Gender question's
              "female" tag, so it only appears for a hair-concern visitor who answered Female. Needs the
              Gender question (or whichever question sets the tag) to come BEFORE this one in Order.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Question Type</label>
              <select value={question.type} onChange={(e) => set({ type: e.target.value as QuestionType })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-1">
              <Toggle checked={question.required} onChange={(v) => set({ required: v })} label="Required" />
            </div>
          </div>
          {question.type === "photo" && (
            <p className="text-[10px] text-gray-400 -mt-2">Photo questions are always skippable for visitors, regardless of the Required toggle above.</p>
          )}

          {needsSliderConfig ? (
            <div className="grid grid-cols-4 gap-2">
              <div><label className="text-[10px] text-gray-400 block mb-0.5">Min</label>
                <input type="number" value={question.sliderMin} onChange={(e) => set({ sliderMin: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm" /></div>
              <div><label className="text-[10px] text-gray-400 block mb-0.5">Max</label>
                <input type="number" value={question.sliderMax} onChange={(e) => set({ sliderMax: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm" /></div>
              <div><label className="text-[10px] text-gray-400 block mb-0.5">Step</label>
                <input type="number" value={question.sliderStep} onChange={(e) => set({ sliderStep: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm" /></div>
              <div><label className="text-[10px] text-gray-400 block mb-0.5">Unit</label>
                <Input value={question.sliderUnit} onChange={(v) => set({ sliderUnit: v })} placeholder="years" /></div>
            </div>
          ) : needsAnswers ? (
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-2 block">Answers</label>
              <div className="space-y-2">
                {question.answers.map((a, i) => (
                  <AnswerRow key={i} answer={a} onChange={(v) => updateAnswer(i, v)} onRemove={() => removeAnswer(i)} allQuestions={allQuestions} ownQuestionId={question.id} />
                ))}
              </div>
              <button onClick={addAnswer} className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-2">+ Add answer</button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ─── Leads tab ───────────────────────────────────────────────────────────────

// Individual visitor submissions — previously only aggregate Analytics
// numbers existed, so a doctor had no way to open a specific person's
// gender/age/uploaded photo/full answers before this.
function LeadsTab({ canFullReview }: { canFullReview: boolean }) {
  const [leads, setLeads] = useState<any[]>([]);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [doctorNoteTemplates, setDoctorNoteTemplates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/admin/quiz/leads?page=${page}&limit=20`).then((r) => r.json()),
      fetch("/api/admin/quiz").then((r) => r.json()),
    ]).then(([leadsRes, configRes]) => {
      if (leadsRes.success) { setLeads(leadsRes.data); setTotalPages(leadsRes.totalPages || 1); }
      if (configRes.success) {
        setQuestions(configRes.data.questions || []);
        setDoctorNoteTemplates(configRes.data.settings?.doctorNoteTemplates || []);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [page]);

  const updateLead = (id: string, patch: any) => setLeads((prev) => prev.map((l) => (l._id === id ? { ...l, ...patch } : l)));

  const questionById = (id: string) => questions.find((q) => q.id === id);
  // .filter, not .find — a doctor can add more than one Photo Upload or Free
  // Text question, and every one of them needs to actually show up here.
  const photoQuestionIds = questions.filter((q) => q.type === "photo").map((q) => q.id);
  const noteQuestionIds = questions.filter((q) => q.type === "text").map((q) => q.id);

  const answerLabel = (q: AssessmentQuestion | undefined, raw: any): string => {
    if (raw === undefined || raw === null || raw === "") return "—";
    if (Array.isArray(raw)) return raw.map((id) => q?.answers.find((a) => a.id === id)?.title || id).join(", ");
    if (!q) return String(raw);
    const match = q.answers.find((a) => a.id === raw);
    return match ? match.title : String(raw);
  };

  if (loading) return <div className="text-center py-16 text-gray-400">Loading leads…</div>;
  if (leads.length === 0) return <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">No assessment leads yet.</div>;

  return (
    <div className="space-y-3">
      {leads.map((lead) => (
        <LeadRow
          key={lead._id}
          lead={lead}
          questions={questions}
          questionById={questionById}
          answerLabel={answerLabel}
          photoQuestionIds={photoQuestionIds}
          noteQuestionIds={noteQuestionIds}
          isOpen={expanded === lead._id}
          onToggle={() => setExpanded(expanded === lead._id ? null : lead._id)}
          onUpdate={(patch) => updateLead(lead._id, patch)}
          doctorNoteTemplates={doctorNoteTemplates}
          canFullReview={canFullReview}
        />
      ))}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="text-xs font-semibold text-gray-500 disabled:opacity-30">← Prev</button>
          <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="text-xs font-semibold text-gray-500 disabled:opacity-30">Next →</button>
        </div>
      )}
    </div>
  );
}

// Shared by PhotoBlock/NoteBlock — one "trigger an AI action, show result or
// error" trio instead of hand-rolling the same 3-state pattern per feature.
function useAsyncAction<T>() {
  const [result, setResult] = useState<T | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const run = async (fn: () => Promise<T>) => {
    setRunning(true);
    setError("");
    try {
      setResult(await fn());
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setRunning(false);
    }
  };
  return { result, running, error, run };
}

function PhotoBlock({ url, primaryConcern }: { url: string; primaryConcern: string }) {
  const { result: analysis, running: analyzing, error, run } = useAsyncAction<string>();
  const analyze = () => run(async () => {
    const res = await fetch("/api/admin/quiz/analyze-photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoUrl: url, primaryConcern }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data.data.analysis as string;
  });

  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="Uploaded photo" className="w-40 h-40 rounded-xl object-cover mb-2" />
      {!analysis && (
        <button onClick={analyze} disabled={analyzing} className="block text-xs font-semibold text-purple-600 hover:text-purple-800 disabled:opacity-50">
          {analyzing ? "Analyzing…" : "🔍 Analyze Photo with AI"}
        </button>
      )}
      {analysis && (
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 max-w-md">
          <p className="text-xs font-bold text-purple-700 mb-1">🔍 AI Visual Observations (not a diagnosis)</p>
          <p className="text-xs text-purple-800 whitespace-pre-wrap">{analysis}</p>
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function NoteBlock({ note, primaryConcern }: { note: string; primaryConcern: string }) {
  const { result: summary, running: summarizing, error, run } = useAsyncAction<string>();
  const summarize = () => run(async () => {
    const res = await fetch("/api/admin/quiz/summarize-note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note, primaryConcern }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    return data.data.summary as string;
  });

  return (
    <div className="bg-[#f6faff] border border-[#0B2560]/10 rounded-xl p-3">
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-xs font-bold text-gray-600">📝 Note to Doctor</p>
        {!summary && (
          <button onClick={summarize} disabled={summarizing} className="text-xs font-semibold text-purple-600 hover:text-purple-800 disabled:opacity-50 shrink-0">
            {summarizing ? "Summarizing…" : "✨ Summarize with AI"}
          </button>
        )}
      </div>
      <p className="text-xs text-gray-700 whitespace-pre-wrap">{note}</p>
      {summary && <p className="text-xs text-purple-700 mt-2 pt-2 border-t border-[#0B2560]/10"><span className="font-bold">AI summary:</span> {summary}</p>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// Doctor Review Mode — draft → doctor-edited → approved → care-plan-generated.
// The server (app/api/admin/quiz/care-plan) enforces that a care plan can only
// be generated once aiSummary.status === "approved" and always builds it from
// the doctor's own edited text, never the raw AI draft — this panel is just
// the UI for that state machine, not where the gate actually lives.
function DoctorReviewPanel({ lead, onUpdate, doctorNoteTemplates, canFullReview }: { lead: any; onUpdate: (patch: any) => void; doctorNoteTemplates: string[]; canFullReview: boolean }) {
  const [editedText, setEditedText] = useState(lead.aiSummary?.editedText || lead.aiSummary?.draftText || "");
  const [doctorNotes, setDoctorNotes] = useState(lead.doctorNotes || "");
  const [finalRecommendation, setFinalRecommendation] = useState(lead.finalRecommendation || "");
  const [treatmentPlan, setTreatmentPlan] = useState(lead.treatmentPlan || "");
  const [busy, setBusy] = useState<"" | "generating" | "saving" | "approving" | "careplan">("");
  const [error, setError] = useState("");
  const [savedFields, setSavedFields] = useState(false);

  const status: string = lead.aiSummary?.status || "none";
  const hasDraft = !!(lead.aiSummary?.draftText || editedText);

  // Any further edit after a successful save must clear the "✓ Saved"
  // state — otherwise a doctor editing again post-save sees a stale
  // confirmation and may believe the new edit is already persisted.
  const editDoctorNotes = (v: string) => { setDoctorNotes(v); setSavedFields(false); };
  const editFinalRecommendation = (v: string) => { setFinalRecommendation(v); setSavedFields(false); };
  const editTreatmentPlan = (v: string) => { setTreatmentPlan(v); setSavedFields(false); };

  const call = async (url: string, method: "POST" | "PATCH", body: any) => {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    // Admin routes return {success:false,message} on app-level errors, but
    // requirePermission()'s 403 body is shaped {error} with no `success`
    // key at all — check res.ok too, or a "full"-only action (Save/Approve/
    // Generate Care Plan) hit by a "view"-only user shows a blank/generic
    // error instead of surfacing why it actually failed.
    if (!res.ok || data.success === false) throw new Error(data.message || data.error || `Request failed (${res.status})`);
    return data.data;
  };

  const generateSummary = async () => {
    setBusy("generating"); setError("");
    try {
      const data = await call("/api/admin/quiz/doctor-summary", "POST", { leadId: lead._id });
      setEditedText(data.draftText);
      onUpdate({ aiSummary: { draftText: data.draftText, editedText: "", status: "draft", approvedAt: null, approvedBy: "", generatedAt: data.generatedAt }, carePlan: data.carePlan });
    } catch (err: any) { setError(err.message); } finally { setBusy(""); }
  };

  const saveDoctorFields = async () => {
    setBusy("saving"); setError(""); setSavedFields(false);
    try {
      const data = await call("/api/admin/quiz/leads", "PATCH", { leadId: lead._id, doctorNotes, finalRecommendation, treatmentPlan });
      onUpdate(data);
      setSavedFields(true);
    } catch (err: any) { setError(err.message); } finally { setBusy(""); }
  };

  const setApproval = async (approve: boolean) => {
    if (approve && !editedText.trim()) { setError("Summary can't be empty — write or generate one before approving."); return; }
    setBusy("approving"); setError("");
    try {
      const data = await call("/api/admin/quiz/leads", "PATCH", { leadId: lead._id, aiSummaryEditedText: editedText, approve });
      onUpdate(data);
    } catch (err: any) { setError(err.message); } finally { setBusy(""); }
  };

  const generateCarePlan = async () => {
    setBusy("careplan"); setError("");
    try {
      const data = await call("/api/admin/quiz/care-plan", "POST", { leadId: lead._id });
      onUpdate({ carePlan: { text: data.text, generatedAt: data.generatedAt } });
    } catch (err: any) { setError(err.message); } finally { setBusy(""); }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-[#0B2560] flex items-center gap-1.5">
          🩺 Doctor Review Mode
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${status === "approved" ? "bg-green-100 text-green-700" : status === "draft" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
            {status === "approved" ? "Approved" : status === "draft" ? "Draft — needs review" : "No summary yet"}
          </span>
        </p>
        <button onClick={generateSummary} disabled={busy !== "" || !canFullReview} title={canFullReview ? "" : "Requires full access to this module"} className="text-xs font-semibold text-purple-600 hover:text-purple-800 disabled:opacity-50 shrink-0">
          {busy === "generating" ? "Generating…" : hasDraft ? "↻ Regenerate AI Summary" : "✨ Generate AI Summary"}
        </button>
      </div>

      {/* Pre-Consultation Assessment insights (Hair/Skin/Body redesign) —
          only present on leads from the new /skin-quiz flow. Read-only
          display of the deterministic result; doctor-summary generation
          below already reads these same Lead fields server-side. */}
      {lead.assessmentType && lead.assessmentResult && (
        <div className="bg-[#0B2560] text-white rounded-xl p-3.5 space-y-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#F5A623]">
            {lead.assessmentType.charAt(0).toUpperCase() + lead.assessmentType.slice(1)} Assessment Result
          </p>
          <div className="flex gap-4 text-xs">
            <span>Concern: <b>{lead.assessmentResult.overallConcern}%</b> ({lead.assessmentResult.severity})</span>
            <span>Risk: <b>{lead.assessmentResult.riskScore}%</b> ({lead.assessmentResult.riskLevel})</span>
          </div>
          {Array.isArray(lead.assessmentResult.categoryScores) && lead.assessmentResult.categoryScores.length > 0 && (
            <p className="text-[11px] text-white/70">
              {lead.assessmentResult.categoryScores.map((c: any) => `${c.label}: ${c.percent}%`).join(' · ')}
            </p>
          )}
          {Array.isArray(lead.assessmentResult.contributingFactors) && lead.assessmentResult.contributingFactors.length > 0 && (
            <p className="text-[11px] text-white/70">
              Contributing factors: {lead.assessmentResult.contributingFactors.map((f: any) => f.label).join(', ')}
            </p>
          )}
        </div>
      )}

      {!canFullReview && (
        <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          You have view-only access to Clinical Intake — generating, editing, approving, or saving requires full access.
        </p>
      )}

      {hasDraft && (
        <div>
          <label className="text-[10px] text-gray-400 block mb-1">
            AI-drafted summary — review and edit before approving. The care plan is built from this text, not the raw AI output.
          </label>
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            rows={10}
            disabled={!canFullReview}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
          />
          <div className="flex items-center gap-2 mt-2">
            {status !== "approved" ? (
              <button onClick={() => setApproval(true)} disabled={busy !== "" || !canFullReview} className="text-xs font-semibold bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50">
                {busy === "approving" ? "Approving…" : "✓ Approve Summary"}
              </button>
            ) : (
              <button onClick={() => setApproval(false)} disabled={busy !== "" || !canFullReview} className="text-xs font-semibold text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:text-gray-700">
                Un-approve (edit again)
              </button>
            )}
            {lead.aiSummary?.approvedBy && status === "approved" && (
              <span className="text-[10px] text-gray-400">Approved by {lead.aiSummary.approvedBy}{lead.aiSummary.approvedAt ? ` on ${new Date(lead.aiSummary.approvedAt).toLocaleDateString()}` : ""}</span>
            )}
          </div>
        </div>
      )}

      {status === "approved" && (
        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-xs font-bold text-gray-600">Personalized Care Plan</p>
            <button onClick={generateCarePlan} disabled={busy !== "" || !canFullReview} className="text-xs font-semibold text-purple-600 hover:text-purple-800 disabled:opacity-50">
              {busy === "careplan" ? "Generating…" : lead.carePlan?.text ? "↻ Regenerate Care Plan" : "✨ Generate Personalized Care Plan"}
            </button>
          </div>
          {lead.carePlan?.text ? (
            <div className="bg-green-50 border border-green-100 rounded-lg p-3">
              <p className="text-xs text-green-800 whitespace-pre-wrap leading-relaxed">{lead.carePlan.text}</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">Not generated yet — based on the doctor's review above, not AI alone.</p>
          )}
        </div>
      )}

      <div className="border-t border-gray-100 pt-3 space-y-2">
        <p className="text-xs font-bold text-gray-600">Doctor Notes &amp; Recommendation</p>
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <label className="text-[10px] text-gray-400 block">Doctor Notes (internal)</label>
            {doctorNoteTemplates.length > 0 && (
              <select
                value=""
                onChange={(e) => { if (e.target.value) editDoctorNotes(doctorNotes ? `${doctorNotes}\n${e.target.value}` : e.target.value); }}
                className="text-[10px] border border-gray-200 rounded px-1.5 py-0.5 text-gray-500 focus:outline-none"
              >
                <option value="">+ Insert template…</option>
                {doctorNoteTemplates.map((tpl, i) => (
                  <option key={i} value={tpl}>{tpl.length > 60 ? `${tpl.slice(0, 60)}…` : tpl}</option>
                ))}
              </select>
            )}
          </div>
          <Textarea value={doctorNotes} onChange={editDoctorNotes} placeholder="Internal notes for this patient…" rows={2} />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 block mb-0.5">Final Recommendation</label>
          <Textarea value={finalRecommendation} onChange={editFinalRecommendation} placeholder="e.g. Discuss PRP + medical therapy at consultation" rows={2} />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 block mb-0.5">Treatment Plan</label>
          <Textarea value={treatmentPlan} onChange={editTreatmentPlan} placeholder="Confirmed plan after consultation…" rows={2} />
        </div>
        <button onClick={saveDoctorFields} disabled={busy !== "" || !canFullReview} className="text-xs font-semibold bg-[#0B2560] text-white px-3 py-1.5 rounded-lg hover:bg-[#1a3a6e] disabled:opacity-50">
          {busy === "saving" ? "Saving…" : savedFields ? "✓ Saved" : "Save"}
        </button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function LeadRow({
  lead, questions, questionById, answerLabel, photoQuestionIds, noteQuestionIds, isOpen, onToggle, onUpdate, doctorNoteTemplates, canFullReview,
}: {
  lead: any;
  questions: AssessmentQuestion[];
  questionById: (id: string) => AssessmentQuestion | undefined;
  answerLabel: (q: AssessmentQuestion | undefined, raw: any) => string;
  photoQuestionIds: string[];
  noteQuestionIds: string[];
  isOpen: boolean;
  onToggle: () => void;
  onUpdate: (patch: any) => void;
  doctorNoteTemplates: string[];
  canFullReview: boolean;
}) {
  const photoUrls = photoQuestionIds.map((id) => lead.answers?.[id]).filter(Boolean);
  const notes: string[] = noteQuestionIds.map((id) => lead.answers?.[id]).filter(Boolean);
  // "gender"/"age" only resolve to a nice label via the fixed ids the
  // "+ Add Gender / Age / Photo / Notes" quick-add button uses; fall back to
  // matching by title so a manually-recreated question (different id, same
  // recognizable name) doesn't silently disappear from this view.
  const findByIdOrTitle = (id: string, titleMatch: string) =>
    questionById(id) || questions.find((q) => q.title.toLowerCase().includes(titleMatch));
  const genderQuestion = findByIdOrTitle("gender", "gender");
  const ageQuestion = findByIdOrTitle("age", "age");
  const ageValue = ageQuestion ? lead.answers?.[ageQuestion.id] : undefined;
  const genderLabel = answerLabel(genderQuestion, genderQuestion ? lead.answers?.[genderQuestion.id] : undefined);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition">
        {photoUrls[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrls[0]} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-gray-300 shrink-0 text-lg">👤</div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{lead.name || "Anonymous"} <span className="text-gray-400 font-normal">· {lead.phone || "—"}</span></p>
          <p className="text-xs text-gray-400 truncate">
            {lead.primaryConcern || "—"}
            {genderLabel !== "—" && ` · ${genderLabel}`}
            {ageValue ? `, ${ageValue}y` : ""}
            {notes.length > 0 && " · 📝 has a note"}
            {" · "}{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : "—"}
          </p>
        </div>
        <span className="text-gray-400 shrink-0">{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <div className="px-5 pb-5 border-t border-gray-50 pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <p><span className="text-gray-400">Email:</span> {lead.email || "—"}</p>
            <p><span className="text-gray-400">City:</span> {lead.city || "—"}</p>
            <p><span className="text-gray-400">Source:</span> {lead.source || "—"}{lead.qrSource ? " (QR)" : ""}</p>
            <p><span className="text-gray-400">Location / Channel:</span> {[lead.clinicLocation, lead.channel].filter(Boolean).join(" · ") || "—"}</p>
          </div>
          {photoQuestionIds.map((id) => {
            const url = lead.answers?.[id];
            return url ? <PhotoBlock key={id} url={url} primaryConcern={lead.primaryConcern} /> : null;
          })}
          {noteQuestionIds.map((id) => {
            const noteText = lead.answers?.[id];
            return noteText ? <NoteBlock key={id} note={noteText} primaryConcern={lead.primaryConcern} /> : null;
          })}
          <div>
            <p className="text-xs font-bold text-gray-500 mb-1.5">Full Intake Answers</p>
            <div className="space-y-1">
              {Object.entries(lead.answers || {}).map(([qId, raw]) => {
                const q = questionById(qId);
                if (q?.type === "photo" || q?.type === "text") return null;
                return (
                  <p key={qId} className="text-xs text-gray-600"><span className="text-gray-400">{q?.title || qId}:</span> {answerLabel(q, raw)}</p>
                );
              })}
            </div>
          </div>
          <DoctorReviewPanel lead={lead} onUpdate={onUpdate} doctorNoteTemplates={doctorNoteTemplates} canFullReview={canFullReview} />
        </div>
      )}
    </div>
  );
}

// ─── Analytics tab ───────────────────────────────────────────────────────────

function AnalyticsTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/quiz/analytics").then((r) => r.json()).then((d) => { if (d.success) setData(d.data); }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-16 text-gray-400">Loading analytics…</div>;
  if (!data) return <div className="text-center py-16 text-gray-400">No data yet.</div>;

  const stat = (label: string, value: string | number, sub?: string) => (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-extrabold text-[#0B2560]">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );

  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return "—";
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-6">
      <p className="text-xs text-gray-400">Last {data.rangeDays} days</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stat("Intakes Started", data.started)}
        {stat("Completed", data.completed)}
        {stat("Conversion", `${data.conversionRate}%`, "started → completed")}
        {stat("Leads Captured", data.leadsCapture)}
        {stat("Booking Rate", `${data.bookingRate}%`, `${data.bookedCount} booked`)}
        {stat("Consultation Clicks", data.consultationBookedClicks ?? 0, "clicked \"Book Consultation\"")}
        {stat("Median Time to Complete", formatDuration(data.medianCompletionSeconds ?? null))}
        {stat("Most Common Concern", data.mostCommonConcern || "—")}
      </div>

      {data.goalFunnel?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-sm font-bold text-gray-700 mb-1">Plan My Journey — Goal Funnel</p>
          <p className="text-xs text-gray-400 mb-3">How many visitors picked each goal, and how many of those sessions went on to complete the intake questions.</p>
          <div className="space-y-2">
            {data.goalFunnel.map((g: any) => (
              <div key={g.goal} className="flex items-center justify-between gap-3 border border-gray-50 bg-gray-50/60 rounded-xl px-4 py-2.5">
                <span className="text-sm font-semibold text-gray-800 capitalize">{g.goal.replace(/-/g, " ")}</span>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{g.selected} selected</span>
                  <span className="font-bold text-[#0B2560]">{g.completed} completed intake</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.newAssessmentLeads > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-sm font-bold text-gray-700 mb-1">Pre-Consultation Assessment (Hair/Skin/Body + Plan My Journey)</p>
          <p className="text-xs text-gray-400 mb-3">{data.newAssessmentLeads} leads from the new assessment flow, last {data.rangeDays} days.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {stat("Assessment → Treatment", `${data.assessmentToTreatmentRate}%`, "led to a completed treatment")}
            {(data.assessmentTypeBreakdown || []).map((t: any) => (
              <div key={t.type} className="bg-gray-50 rounded-2xl p-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1 capitalize">{t.type}</p>
                <p className="text-xl font-extrabold text-[#0B2560]">{t.leads}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t.bookedCount} booked</p>
              </div>
            ))}
          </div>
          {data.severityDistribution?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500">Severity Distribution</p>
              {data.severityDistribution.map((s: any) => (
                <div key={s.severity} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-24 shrink-0">{s.severity}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#F5A623] rounded-full" style={{ width: `${s.pct}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-500 w-16 text-right">{s.count} ({s.pct}%)</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {data.dropoffByStep?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-sm font-bold text-gray-700 mb-1">Drop-off by Question</p>
          <p className="text-xs text-gray-400 mb-3">How many sessions reached at least this many questions into the intake — a real, question-by-question funnel across all concern branches.</p>
          <div className="space-y-2">
            {data.dropoffByStep.map((d: any) => {
              const first = data.dropoffByStep[0]?.sessions || 1;
              const pct = first ? Math.round((d.sessions / first) * 100) : 0;
              return (
                <div key={d.step} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-20 shrink-0">Question {d.step}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#0B2560] rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-500 w-24 text-right">{d.sessions} sessions</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-sm font-bold text-gray-700 mb-3">Concern Heatmap</p>
        <div className="space-y-2">
          {data.concernHeatmap.length === 0 && <p className="text-xs text-gray-400">No leads yet.</p>}
          {data.concernHeatmap.map((c: any) => (
            <div key={c.concern} className="flex items-center gap-3">
              <span className="text-xs text-gray-600 w-32 truncate">{c.concern}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#0B2560] rounded-full" style={{ width: `${c.pct}%` }} />
              </div>
              <span className="text-xs font-semibold text-gray-500 w-10 text-right">{c.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-sm font-bold text-gray-700 mb-1">Traffic Source</p>
        <p className="text-xs text-gray-400">QR / in-clinic: <b>{data.qrLeads}</b> · Web / organic: <b>{data.organicLeads}</b></p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-sm font-bold text-gray-700 mb-1">By Preferred Clinic</p>
        <p className="text-xs text-gray-400 mb-3">Which branch patients said they'd like to be seen at (Step 2 of the intake) — not QR/link attribution.</p>
        <div className="space-y-2">
          {(!data.preferredClinicBreakdown || data.preferredClinicBreakdown.length === 0) && <p className="text-xs text-gray-400">No preferred-clinic data yet.</p>}
          {data.preferredClinicBreakdown?.map((c: any) => (
            <div key={c.label} className="flex items-center gap-3">
              <span className="text-xs text-gray-600 w-32 truncate">{c.label}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#F5A623] rounded-full" style={{ width: `${c.pct}%` }} />
              </div>
              <span className="text-xs font-semibold text-gray-500 w-16 text-right">{c.count} · {c.pct}%</span>
            </div>
          ))}
        </div>
      </div>

      <BreakdownPanel title="By Clinic Location" rows={data.locationBreakdown} emptyText="No location-tagged QR scans yet — generate one in the QR Generator tab." />
      <BreakdownPanel title="By Lead Source / Channel" rows={data.channelBreakdown} emptyText="No channel-tagged QR scans yet — tag a QR with a placement (Reception, Instagram, etc.) in the QR Generator tab." />
    </div>
  );
}

function BreakdownPanel({ title, rows, emptyText }: { title: string; rows: { label: string; started: number; completed: number; leads: number; booked: number; conversionRate: number }[]; emptyText: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <p className="text-sm font-bold text-gray-700 mb-3">{title}</p>
      {rows.length === 0 ? (
        <p className="text-xs text-gray-400">{emptyText}</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-3 border border-gray-50 bg-gray-50/60 rounded-xl px-4 py-2.5">
              <span className="text-sm font-semibold text-gray-800 capitalize">{r.label.replace(/-/g, " ")}</span>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{r.started} scans</span>
                <span>{r.completed} completed</span>
                <span>{r.leads} leads</span>
                <span>{r.booked} booked</span>
                <span className="font-bold text-[#0B2560]">{r.conversionRate}% conv.</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── QR Generator tab ────────────────────────────────────────────────────────

const QR_LOCATIONS = ["Chennai", "Bangalore", "Coimbatore", "Kochi"];
const QR_CHANNELS = ["Reception", "Waiting Hall", "Doctor Room", "Brochure", "Visiting Card", "Prescription Sheet", "Standee Banner", "Newspaper", "Instagram", "Facebook", "WhatsApp", "Bus Banner", "Mall"];

function QrGeneratorTab() {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [channel, setChannel] = useState("");
  const [campaign, setCampaign] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = () => {
    fetch("/api/admin/quiz/qr-codes").then((r) => r.json()).then((d) => { if (d.success) setHistory(d.data); }).catch(() => {}).finally(() => setLoadingHistory(false));
  };
  useEffect(() => { loadHistory(); }, []);

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
  const locationSlug = location.toLowerCase().replace(/\s+/g, "-");
  const channelSlug = channel.toLowerCase().replace(/\s+/g, "-");
  const campaignSlug = campaign.trim() || [locationSlug, channelSlug].filter(Boolean).join("-") || "clinic-kiosk";
  const targetUrl = `${siteUrl}/skin-quiz?qr=1`
    + `&campaign=${encodeURIComponent(campaignSlug)}`
    + (locationSlug ? `&clinic=${encodeURIComponent(locationSlug)}` : "")
    + (channelSlug ? `&channel=${encodeURIComponent(channelSlug)}` : "");
  const qrPngUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(targetUrl)}`;
  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&format=svg&data=${encodeURIComponent(targetUrl)}`;
  const fileBase = `ai-assessment-qr-${campaignSlug}`;

  const saveQr = async () => {
    if (!name.trim()) { setSaveError("Give this QR code a name (e.g. \"Anna Nagar Reception\")"); return; }
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/admin/quiz/qr-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, clinicLocation: locationSlug, channel: channelSlug, campaign: campaignSlug, targetUrl }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setName("");
      loadHistory();
    } catch (err: any) {
      setSaveError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const deleteQr = async (id: string) => {
    if (!confirm("Delete this saved QR code? Existing printed copies keep working — this only removes it from the list.")) return;
    try {
      await fetch("/api/admin/quiz/qr-codes", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      loadHistory();
    } catch {
      // loadHistory's own catch already handles a failed refresh; a failed
      // DELETE itself just leaves the list showing the (still-existing) entry.
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
      <div className="space-y-5">
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800">
          Print this anywhere — reception, waiting hall, brochures, bills, even outdoor banners. Each QR carries its own location + channel, so Analytics can tell you exactly which one is driving bookings.
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">QR Name</label>
          <Input value={name} onChange={setName} placeholder="e.g. Anna Nagar Reception" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Clinic Location</label>
            <select value={location} onChange={(e) => setLocation(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">— None —</option>
              {QR_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Placement / Channel</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">— None —</option>
              {QR_CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Campaign (optional — auto-filled from location + channel)</label>
          <Input value={campaign} onChange={setCampaign} placeholder={campaignSlug} />
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrPngUrl} alt="Clinical Intake QR code" width={240} height={240} className="rounded-lg" />
          <div className="flex items-center gap-4">
            <a href={qrPngUrl} download={`${fileBase}.png`} className="text-sm font-semibold text-[#0B2560] underline">Download PNG</a>
            <a href={qrSvgUrl} download={`${fileBase}.svg`} className="text-sm font-semibold text-[#0B2560] underline">Download SVG</a>
          </div>
        </div>

        {saveError && <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-1.5">{saveError}</p>}
        <button onClick={saveQr} disabled={saving} className="w-full py-2.5 bg-[#0B2560] hover:bg-[#1a3a6e] text-white font-semibold text-sm rounded-lg disabled:opacity-60 transition">
          {saving ? "Saving…" : "Save to QR Library"}
        </button>

        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Target URL</label>
          <p className="text-xs font-mono text-gray-500 bg-gray-50 rounded-lg px-3 py-2 break-all">{targetUrl}</p>
        </div>
      </div>

      <div>
        <p className="text-sm font-bold text-gray-700 mb-3">Saved QR Codes</p>
        {loadingHistory ? (
          <div className="text-sm text-gray-400 py-8 text-center">Loading…</div>
        ) : history.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
            No saved QR codes yet — generate one and click "Save to QR Library" so marketing can find it again later.
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((h) => {
              const png = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(h.targetUrl)}`;
              return (
                <div key={h._id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={png} alt={h.name} width={48} height={48} className="rounded shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{h.name}</p>
                    <p className="text-xs text-gray-400 truncate">{[h.clinicLocation, h.channel, h.campaign].filter(Boolean).join(" · ")}</p>
                  </div>
                  <a href={png} download={`${h.name}.png`} className="text-xs font-semibold text-[#0B2560] underline shrink-0">PNG</a>
                  <button onClick={() => deleteQr(h._id)} className="text-red-400 hover:text-red-600 text-lg leading-none shrink-0">×</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AiAssessmentAdminPage() {
  const [config, setConfig] = useState<AssessmentConfigData>(() => JSON.parse(JSON.stringify(DEFAULT_QUIZ_CONFIG)));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"questions" | "leads" | "analytics" | "qr" | "settings">("questions");
  const [myRole, setMyRole] = useState<AdminRole | null>(null);
  // Real, live goals from Plan My Journey's own admin (app/admin/journey) —
  // never hand-copied. This is what makes "Show this question for" above a
  // set of buttons instead of a free-text field: every category tab here
  // uses the goal's own current concernTags, so a question assigned
  // through this UI can't independently drift from what the goal actually
  // expects, the way the free-text version already once did in production.
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  useEffect(() => {
    fetch("/api/admin/quiz").then((r) => r.json()).then((d) => { if (d.success) setConfig(d.data); }).catch(() => {}).finally(() => setLoading(false));
    fetch("/api/admin/profile").then((r) => r.json()).then((d) => { if (d.success) setMyRole(d.data.role); }).catch(() => {});
    fetch("/api/admin/journey").then((r) => r.json()).then((d) => {
      if (!d.success) return;
      const goals = (d.data?.goals || []).filter((g: any) => g.enabled);
      setCategories(goals.map((g: any) => ({ slug: g.slug, label: g.label, icon: g.icon || "🎯", tags: g.concernTags || [] })));
    }).catch(() => {});
  }, []);

  // Doctor Review Mode's Save/Approve/Generate Care Plan actions are gated
  // server-side at "full" — this mirrors that here so a "view"-only user
  // sees those actions disabled instead of clicking them and getting a
  // confusing permissions error.
  const canFullReview = myRole ? canAccess(myRole, "ai-assessment", "full") : false;

  const updateConfig = (patch: Partial<AssessmentConfigData>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      // Keep treatmentMap in sync with concern-carrying answers across every question
      const concernTags = new Set<string>();
      const concernLabels: Record<string, string> = {};
      for (const q of next.questions) {
        for (const a of q.answers) {
          for (const tag of a.tags) {
            if (a.weight >= 50) { concernTags.add(tag); concernLabels[tag] = a.title; }
          }
        }
      }
      const existing = new Set(next.treatmentMap.map((e) => e.concernTag));
      // Array.from, not [...concernTags] — this project's TS target doesn't
      // have downlevelIteration on, so spreading a Set (as opposed to an
      // array) fails to compile.
      const missing = Array.from(concernTags).filter((t) => !existing.has(t)).map((t) => ({ concernTag: t, concernLabel: concernLabels[t] || t, treatments: [] }));
      return { ...next, treatmentMap: [...next.treatmentMap, ...missing] };
    });
    setSaved(false);
  };

  // A newly-added answer defaults to id: "" until its title is typed (AnswerRow
  // derives the id from the title on change) — saving before that leaves an
  // answer a visitor can select but that never matches any tag/branch, and for
  // a required question with only that answer, permanently blocks progress.
  const findEmptyAnswerId = (): string | null => {
    for (const q of config.questions) {
      if (q.answers.some((a) => !a.id)) return q.title || "Untitled question";
    }
    return null;
  };

  const save = async () => {
    const emptyIn = findEmptyAnswerId();
    if (emptyIn) {
      setError(`"${emptyIn}" has an answer with no title yet — give it a title (or remove it) before saving.`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/quiz", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) });
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
    if (!confirm("Reset all Clinical Intake content to the original defaults? This overwrites your changes.")) return;
    setConfig(JSON.parse(JSON.stringify(DEFAULT_QUIZ_CONFIG)));
    setSaved(false);
  };

  // A new question defaults to whichever category tab you're currently
  // viewing — the same real goal tags "Show this question for" itself
  // uses, not a separate hand-typed guess. "all" (no specific category
  // selected) still creates a universal question, matching the previous
  // always-blank default exactly.
  const addQuestion = () => {
    const id = `question-${Date.now()}`;
    const activeCat = categories.find((c) => c.slug === activeCategory);
    updateConfig({
      questions: [...config.questions, {
        id, title: "New Question", subtitle: "", description: "", icon: "❓", image: "",
        type: "single", order: config.questions.length + 1, required: true, answers: [],
        sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "", conditionTags: activeCat?.tags || [], requiredTags: [],
      }],
    });
  };

  // One-click way to add the built-in Gender/Age/Photo/Notes questions to an
  // already-customized live config — DEFAULT_QUESTIONS only seeds a brand
  // new install or a full "Reset defaults", so a doctor who's already
  // configured this assessment needs an additive path to pick these up.
  const missingQuickAddIds = QUICK_ADD_QUESTION_IDS.filter((id) => !config.questions.some((q) => q.id === id));
  const addQuickAddQuestions = () => {
    const toAdd = DEFAULT_QUESTIONS.filter((q) => missingQuickAddIds.includes(q.id));
    if (toAdd.length === 0) return;
    const maxOrder = config.questions.reduce((m, q) => Math.max(m, q.order), 0);
    const withOrder = toAdd.map((q, i) => ({ ...q, order: maxOrder + i + 1 }));
    updateConfig({ questions: [...config.questions, ...withOrder] });
  };

  // Idempotent backfill for the Weight Loss branch (Plan My Journey's
  // "weight-loss" goal, see GOAL_CONCERN_TAGS in journeyGoals.ts) into an
  // already-configured live QuizConfig — deliberately a manual, admin-
  // triggered button rather than an automatic backfill (unlike
  // backfillResultSections' layout-only backfill), since this injects a
  // whole new clinical question branch into a doctor-curated intake form.
  // Safe to click more than once: no-ops once the branch already exists.
  const hasWeightLossBranch = config.treatmentMap.some((e) => e.concernTag === "weight-loss");
  const addWeightLossBranch = () => {
    if (hasWeightLossBranch) return;
    const wlAnswer = DEFAULT_QUESTIONS.find((q) => q.id === "concern")?.answers.find((a) => a.id === "weight-loss");
    const updatedQuestions = config.questions.map((q) =>
      q.id === "concern" && wlAnswer && !q.answers.some((a) => a.id === "weight-loss")
        ? { ...q, answers: [...q.answers, wlAnswer] }
        : q
    );
    const toAdd = DEFAULT_QUESTIONS.filter((q) => q.conditionTags?.includes("weight-loss") && !config.questions.some((x) => x.id === q.id));
    const maxOrder = updatedQuestions.reduce((m, q) => Math.max(m, q.order), 0);
    const withOrder = toAdd.map((q, i) => ({ ...q, order: maxOrder + i + 1 }));
    // updateConfig's own concern-tag reconciliation (below) picks up the new
    // "weight-loss" answer automatically and adds its treatmentMap entry
    // (concernTag/concernLabel only) — no need to push real treatment
    // content here now that Treatment Mapping is no longer editable/shown.
    updateConfig({ questions: [...updatedQuestions, ...withOrder] });
  };

  const updateQuestion = (id: string, q: AssessmentQuestion) => updateConfig({ questions: config.questions.map((x) => x.id === id ? q : x) });
  const removeQuestion = (id: string) => {
    if (!confirm("Remove this question?")) return;
    updateConfig({ questions: config.questions.filter((x) => x.id !== id) });
  };
  const moveQuestion = (id: string, dir: -1 | 1) => {
    const ordered = [...config.questions].sort((a, b) => a.order - b.order);
    const idx = ordered.findIndex((q) => q.id === id);
    const target = idx + dir;
    if (target < 0 || target >= ordered.length) return;
    [ordered[idx], ordered[target]] = [ordered[target], ordered[idx]];
    updateConfig({ questions: ordered.map((q, i) => ({ ...q, order: i + 1 })) });
  };

  const moveResultSection = (key: string, dir: -1 | 1) => {
    const ordered = [...config.resultSections].sort((a, b) => a.order - b.order);
    const idx = ordered.findIndex((s) => s.key === key);
    const target = idx + dir;
    if (target < 0 || target >= ordered.length) return;
    [ordered[idx], ordered[target]] = [ordered[target], ordered[idx]];
    updateConfig({ resultSections: ordered.map((s, i) => ({ ...s, order: i + 1 })) });
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading Clinical Intake…</div>;

  const orderedQuestions = [...config.questions].sort((a, b) => a.order - b.order);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">✨ Clinical Intake</h1>
          <p className="text-sm text-gray-500 mt-1">Configure the Clinical Intake flow — questions, clinical logic, and patient report. Changes go live instantly.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={resetToDefaults} className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-2">Reset defaults</button>
          <button onClick={save} disabled={saving} className={`px-5 py-2 rounded-lg text-sm font-semibold text-white transition ${saved ? "bg-green-600" : "bg-[#0B2560] hover:bg-[#1a3a6e]"} disabled:opacity-50`}>
            {saving ? "Saving…" : saved ? "✓ Saved" : "Save Changes"}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>}

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {([
          ["questions", "📋 Questions"],
          ["leads", "🧑‍🤝‍🧑 Leads"],
          ["analytics", "📊 Analytics"], ["qr", "🔗 QR Generator"], ["settings", "⚙ Settings"],
        ] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === t ? "bg-white text-[#0B2560] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "questions" && (() => {
        // "All" plus one tab per real, live goal (Plan My Journey's own
        // admin) plus "Everyone" (universal/conditionTags: []) and
        // "Unassigned" (only appears if something's actually broken — a
        // question whose tags don't match any current goal, the exact
        // silent failure mode this whole tabbed picker exists to prevent).
        // Counts on every pill so a doctor can see "Laser has 0 questions"
        // at a glance, without opening a single card.
        const tabList: (Category & { count: number })[] = [
          { ...UNIVERSAL_CATEGORY, count: orderedQuestions.filter((q) => !q.conditionTags?.length).length },
          ...categories.map((c) => ({ ...c, count: orderedQuestions.filter((q) => q.conditionTags?.some((t) => c.tags.includes(t))).length })),
        ];
        const unassignedCount = orderedQuestions.filter((q) => q.conditionTags?.length && categoriesForQuestion(q, categories).length === 0).length;

        const visibleQuestions =
          activeCategory === "all" ? orderedQuestions
          : activeCategory === "unassigned" ? orderedQuestions.filter((q) => q.conditionTags?.length && categoriesForQuestion(q, categories).length === 0)
          : activeCategory === UNIVERSAL_CATEGORY.slug ? orderedQuestions.filter((q) => !q.conditionTags?.length)
          : orderedQuestions.filter((q) => q.conditionTags?.some((t) => categories.find((c) => c.slug === activeCategory)?.tags.includes(t)));

        const activeCatLabel = categories.find((c) => c.slug === activeCategory)?.label;

        return (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setActiveCategory("all")}
                className={`text-xs font-bold px-3.5 py-2 rounded-xl transition ${
                  activeCategory === "all" ? "bg-[#0B2560] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                All ({orderedQuestions.length})
              </button>
              {tabList.map((c) => (
                <button
                  key={c.slug}
                  onClick={() => setActiveCategory(c.slug)}
                  className={`text-xs font-bold px-3.5 py-2 rounded-xl transition ${
                    activeCategory === c.slug ? "bg-[#0B2560] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {c.icon} {c.label} ({c.count})
                </button>
              ))}
              {unassignedCount > 0 && (
                <button
                  onClick={() => setActiveCategory("unassigned")}
                  title="Tagged with something that doesn't match any current goal — these questions can never actually reach a real patient"
                  className={`text-xs font-bold px-3.5 py-2 rounded-xl transition ${
                    activeCategory === "unassigned" ? "bg-red-600 text-white" : "bg-red-50 text-red-600 hover:bg-red-100"
                  }`}
                >
                  ⚠️ Unassigned ({unassignedCount})
                </button>
              )}
            </div>

            {visibleQuestions.map((q) => {
              const i = orderedQuestions.indexOf(q);
              return (
                <QuestionCard
                  key={q.id} question={q} allQuestions={orderedQuestions} categories={categories}
                  onChange={(v) => updateQuestion(q.id, v)} onRemove={() => removeQuestion(q.id)}
                  onMove={(dir) => moveQuestion(q.id, dir)} isFirst={i === 0} isLast={i === orderedQuestions.length - 1}
                />
              );
            })}
            {visibleQuestions.length === 0 && (
              <div className="text-center py-10 text-sm text-gray-400 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                No questions here yet — click "+ Add Question" below to create the first one for {activeCatLabel || "this view"}.
              </div>
            )}

            <button onClick={addQuestion} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-semibold text-[#0B2560] hover:border-[#0B2560]/40 hover:bg-[#f6faff] transition">
              + Add Question{activeCatLabel ? ` to ${activeCatLabel}` : ""}
            </button>
            {activeCategory === "all" && missingQuickAddIds.length > 0 && (
              <button onClick={addQuickAddQuestions} className="w-full py-3 border-2 border-dashed border-purple-200 rounded-xl text-sm font-semibold text-purple-700 hover:border-purple-400 hover:bg-purple-50 transition">
                + Add Gender / Age / Photo / Notes
              </button>
            )}
            {activeCategory === "all" && !hasWeightLossBranch && (
              <button onClick={addWeightLossBranch} className="w-full py-3 border-2 border-dashed border-green-200 rounded-xl text-sm font-semibold text-green-700 hover:border-green-400 hover:bg-green-50 transition">
                + Add Weight Loss Questions
              </button>
            )}
          </div>
        );
      })()}

      {tab === "leads" && <LeadsTab canFullReview={canFullReview} />}
      {tab === "analytics" && <AnalyticsTab />}
      {tab === "qr" && (
        config.settings.enableQR ? <QrGeneratorTab /> : (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
            QR code access is turned off. Enable "Enable QR Code Access" under Settings → Feature Toggles to generate one.
          </div>
        )
      )}

      {tab === "settings" && (
        <div className="space-y-6 max-w-xl">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <p className="text-sm font-bold text-gray-700">Feature Toggles</p>
            <Toggle checked={config.settings.enabled} onChange={(v) => updateConfig({ settings: { ...config.settings, enabled: v } })} label="Enable Clinical Intake" />
            <Toggle checked={config.settings.enableQR} onChange={(v) => updateConfig({ settings: { ...config.settings, enableQR: v } })} label="Enable QR Code Access" />
            <Toggle checked={config.settings.enableNotes !== false} onChange={(v) => updateConfig({ settings: { ...config.settings, enableNotes: v } })} label={'Enable "Anything else for your doctor?" Note'} />
            <Toggle checked={config.settings.anonymousMode} onChange={(v) => updateConfig({ settings: { ...config.settings, anonymousMode: v } })} label="Anonymous Mode (no login required)" />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <p className="text-sm font-bold text-gray-700">Doctor's Message</p>
            <p className="text-xs text-gray-400">Shown on the results screen, above the booking CTA.</p>
            <Textarea value={config.doctorMessage} onChange={(v) => updateConfig({ doctorMessage: v })} rows={3} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <p className="text-sm font-bold text-gray-700">Doctor Notes Templates</p>
            <p className="text-xs text-gray-400">Reusable snippets a doctor can quick-insert into a lead's Doctor Notes in the Leads tab — one per line.</p>
            <Textarea
              value={(config.settings.doctorNoteTemplates || []).join("\n")}
              onChange={(v) => updateConfig({ settings: { ...config.settings, doctorNoteTemplates: v.split("\n").map((x) => x.trim()).filter(Boolean) } })}
              rows={4}
              placeholder="Recommended in-clinic evaluation before finalizing any treatment."
            />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-1">
            <p className="text-sm font-bold text-gray-700 mb-1">Results Screen Sections</p>
            <p className="text-xs text-gray-400 mb-2">Order and visibility apply to both Free Clinical Intake and Plan My Journey's results screen — one shared layout for both.</p>
            {[...config.resultSections].sort((a, b) => a.order - b.order).map((s, i, sorted) => (
              <div key={s.key} className="flex items-center gap-3 py-1">
                <div className="flex flex-col shrink-0">
                  <button onClick={() => moveResultSection(s.key, -1)} disabled={i === 0} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none py-0.5">▲</button>
                  <button onClick={() => moveResultSection(s.key, 1)} disabled={i === sorted.length - 1} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none py-0.5">▼</button>
                </div>
                <div className="flex-1">
                  <Toggle checked={s.visible} label={s.label}
                    onChange={(v) => updateConfig({ resultSections: config.resultSections.map((x) => x.key === s.key ? { ...x, visible: v } : x) })} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
