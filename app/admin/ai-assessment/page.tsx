"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_QUIZ_CONFIG,
  DEFAULT_QUESTIONS,
  type AssessmentConfigData,
  type AssessmentQuestion,
  type AssessmentAnswer,
  type QuestionType,
  type TreatmentMapEntry,
  type TreatmentRecommendation,
} from "@/app/lib/quizDefaults";

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
        className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${checked ? "bg-[#0B2545]" : "bg-gray-200"}`}
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
  question, allQuestions, onChange, onRemove, onMove, isFirst, isLast,
}: {
  question: AssessmentQuestion;
  allQuestions: AssessmentQuestion[];
  onChange: (q: AssessmentQuestion) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [open, setOpen] = useState(false);
  const set = (patch: Partial<AssessmentQuestion>) => onChange({ ...question, ...patch });

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

// ─── Treatment card ──────────────────────────────────────────────────────────

function TreatmentCard({ t, onChange, onRemove }: { t: TreatmentRecommendation; onChange: (t: TreatmentRecommendation) => void; onRemove: () => void }) {
  const set = (patch: Partial<TreatmentRecommendation>) => onChange({ ...t, ...patch });
  const listField = (val: string[], onSet: (v: string[]) => void, placeholder: string) => (
    <Textarea value={val.join("\n")} onChange={(v) => onSet(v.split("\n").map((x) => x.trim()).filter(Boolean))} placeholder={placeholder} rows={2} />
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex gap-2 items-center">
        <input value={t.icon} onChange={(e) => set({ icon: e.target.value })} placeholder="✨"
          className="w-12 border border-gray-200 rounded-lg px-2 py-2 text-center text-base focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0" />
        <Input value={t.name} onChange={(v) => set({ name: v })} placeholder="Treatment name" className="flex-1" />
        <div className="flex items-center gap-1 shrink-0">
          <input type="number" min={0} max={100} value={t.confidence} onChange={(e) => set({ confidence: Number(e.target.value) })}
            className="w-16 border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <span className="text-xs text-gray-400">%</span>
        </div>
        <button onClick={onRemove} className="text-red-400 hover:text-red-600 text-xl leading-none shrink-0">×</button>
      </div>
      <Textarea value={t.description} onChange={(v) => set({ description: v })} placeholder="Clinical description…" rows={2} />
      <div className="grid grid-cols-3 gap-2">
        <Input value={t.sessions} onChange={(v) => set({ sessions: v })} placeholder="Sessions" />
        <Input value={t.duration} onChange={(v) => set({ duration: v })} placeholder="Duration" />
        <Input value={t.recovery} onChange={(v) => set({ recovery: v })} placeholder="Recovery" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input value={t.price} onChange={(v) => set({ price: v })} placeholder="Price range" />
        <Input value={t.cta} onChange={(v) => set({ cta: v })} placeholder="CTA button text" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="text-[10px] text-gray-400 block mb-0.5">Advantages (one per line)</label>{listField(t.advantages, (v) => set({ advantages: v }), "Fast results\nMinimal downtime")}</div>
        <div><label className="text-[10px] text-gray-400 block mb-0.5">Disadvantages (one per line)</label>{listField(t.disadvantages, (v) => set({ disadvantages: v }), "Requires maintenance")}</div>
      </div>
      <div>
        <label className="text-[10px] text-gray-400 block mb-0.5">Required tags (eligibility gate — leave blank to always show)</label>
        <Input value={t.requiredTags.join(", ")} onChange={(v) => set({ requiredTags: v.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean) })} placeholder="e.g. urgent" />
      </div>
    </div>
  );
}

function ConcernTreatmentPanel({ entry, aiPrompt, enableAI, onChange }: { entry: TreatmentMapEntry; aiPrompt: string; enableAI: boolean; onChange: (e: TreatmentMapEntry) => void }) {
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState("");

  const updateTreatment = (i: number, t: TreatmentRecommendation) => onChange({ ...entry, treatments: entry.treatments.map((x, idx) => idx === i ? t : x) });
  const removeTreatment = (i: number) => onChange({ ...entry, treatments: entry.treatments.filter((_, idx) => idx !== i) });
  const addTreatment = () => onChange({
    ...entry,
    treatments: [...entry.treatments, { id: `${entry.concernTag}-${Date.now()}`, name: "", icon: "✨", description: "", confidence: 80, priority: entry.treatments.length + 1, sessions: "", duration: "", recovery: "", price: "", advantages: [], disadvantages: [], cta: "Book Consultation", requiredTags: [] }],
  });

  const aiSuggest = async () => {
    setGenerating(true);
    setAiError("");
    try {
      const res = await fetch("/api/admin/quiz/ai-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concernLabel: entry.concernLabel || entry.concernTag, customPrompt: aiPrompt }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      const treatments: TreatmentRecommendation[] = data.data.map((t: any, i: number) => ({
        id: `${entry.concernTag}-${i}`, name: t.name, icon: t.icon, description: t.description,
        confidence: t.confidence, priority: i + 1, sessions: t.sessions, duration: t.duration || "",
        recovery: t.recovery || "", price: t.price, advantages: t.advantages || [], disadvantages: t.disadvantages || [],
        cta: t.cta || "Book Consultation", requiredTags: [],
      }));
      onChange({ ...entry, treatments });
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
          {entry.concernLabel || entry.concernTag}
          <span className="ml-2 text-xs text-gray-400 font-normal">({entry.treatments.length} treatments)</span>
        </h4>
        {enableAI ? (
          <button onClick={aiSuggest} disabled={generating}
            className="flex items-center gap-1.5 bg-purple-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-purple-700 disabled:opacity-60 transition">
            {generating ? <>⏳ Generating…</> : <>✨ AI Suggest</>}
          </button>
        ) : (
          <span className="text-xs text-gray-400 italic">AI Suggest is off — enable it in Settings</span>
        )}
      </div>
      {aiError && <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-1.5">{aiError}</p>}
      <div className="space-y-2">
        {entry.treatments.map((t, i) => (
          <TreatmentCard key={t.id} t={t} onChange={(updated) => updateTreatment(i, updated)} onRemove={() => removeTreatment(i)} />
        ))}
      </div>
      {entry.treatments.length < 5 && <button onClick={addTreatment} className="text-sm text-blue-600 hover:text-blue-800 font-medium">+ Add treatment</button>}
    </div>
  );
}

// ─── Leads tab ───────────────────────────────────────────────────────────────

// Individual visitor submissions — previously only aggregate Analytics
// numbers existed, so a doctor had no way to open a specific person's
// gender/age/uploaded photo/full answers before this.
function LeadsTab() {
  const [leads, setLeads] = useState<any[]>([]);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
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
      if (configRes.success) setQuestions(configRes.data.questions || []);
    }).finally(() => setLoading(false));
  }, [page]);

  const questionById = (id: string) => questions.find((q) => q.id === id);
  const photoQuestionId = questions.find((q) => q.type === "photo")?.id;
  const noteQuestionId = questions.find((q) => q.type === "text")?.id;

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
          questionById={questionById}
          answerLabel={answerLabel}
          photoQuestionId={photoQuestionId}
          noteQuestionId={noteQuestionId}
          isOpen={expanded === lead._id}
          onToggle={() => setExpanded(expanded === lead._id ? null : lead._id)}
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

function LeadRow({
  lead, questionById, answerLabel, photoQuestionId, noteQuestionId, isOpen, onToggle,
}: {
  lead: any;
  questionById: (id: string) => AssessmentQuestion | undefined;
  answerLabel: (q: AssessmentQuestion | undefined, raw: any) => string;
  photoQuestionId?: string;
  noteQuestionId?: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [summary, setSummary] = useState("");
  const [summarizing, setSummarizing] = useState(false);
  const [summarizeError, setSummarizeError] = useState("");

  const photoUrl = photoQuestionId ? lead.answers?.[photoQuestionId] : "";
  const note: string = noteQuestionId ? (lead.answers?.[noteQuestionId] || "") : "";
  const genderLabel = answerLabel(questionById("gender"), lead.answers?.gender);
  const ageRaw = lead.answers?.age;

  const summarize = async () => {
    setSummarizing(true);
    setSummarizeError("");
    try {
      const res = await fetch("/api/admin/quiz/summarize-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note, primaryConcern: lead.primaryConcern }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setSummary(data.data.summary);
    } catch (err: any) {
      setSummarizeError(err.message || "Summarization failed");
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-gray-300 shrink-0 text-lg">👤</div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{lead.name || "Anonymous"} <span className="text-gray-400 font-normal">· {lead.phone || "—"}</span></p>
          <p className="text-xs text-gray-400 truncate">
            {lead.primaryConcern || "—"}
            {genderLabel !== "—" && ` · ${genderLabel}`}
            {ageRaw ? `, ${ageRaw}y` : ""}
            {note && " · 📝 has a note"}
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
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="Uploaded photo" className="w-40 h-40 rounded-xl object-cover" />
          )}
          {note && (
            <div className="bg-[#f6faff] border border-[#0B2545]/10 rounded-xl p-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-xs font-bold text-gray-600">📝 Note to Doctor</p>
                {!summary && (
                  <button onClick={summarize} disabled={summarizing} className="text-xs font-semibold text-purple-600 hover:text-purple-800 disabled:opacity-50 shrink-0">
                    {summarizing ? "Summarizing…" : "✨ Summarize with AI"}
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-700 whitespace-pre-wrap">{note}</p>
              {summary && <p className="text-xs text-purple-700 mt-2 pt-2 border-t border-[#0B2545]/10"><span className="font-bold">AI summary:</span> {summary}</p>}
              {summarizeError && <p className="text-xs text-red-500 mt-1">{summarizeError}</p>}
            </div>
          )}
          <div>
            <p className="text-xs font-bold text-gray-500 mb-1.5">Answers</p>
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
          {Array.isArray(lead.recommendations) && lead.recommendations.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 mb-1.5">Recommended</p>
              <p className="text-xs text-gray-600">{lead.recommendations.map((r: any) => (typeof r === "string" ? r : r?.name)).filter(Boolean).join(", ")}</p>
            </div>
          )}
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
      <p className="text-2xl font-extrabold text-[#0B2545]">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      <p className="text-xs text-gray-400">Last {data.rangeDays} days</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stat("Assessments Started", data.started)}
        {stat("Completed", data.completed)}
        {stat("Conversion", `${data.conversionRate}%`, "started → completed")}
        {stat("Leads Captured", data.leadsCapture)}
        {stat("Booking Rate", `${data.bookingRate}%`, `${data.bookedCount} booked`)}
        {stat("Most Common Concern", data.mostCommonConcern || "—")}
        {stat("Most Recommended", data.mostRecommendedTreatment || "—")}
        {stat("Most Accepted", data.mostAcceptedTreatment || "—")}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-sm font-bold text-gray-700 mb-3">Concern Heatmap</p>
        <div className="space-y-2">
          {data.concernHeatmap.length === 0 && <p className="text-xs text-gray-400">No leads yet.</p>}
          {data.concernHeatmap.map((c: any) => (
            <div key={c.concern} className="flex items-center gap-3">
              <span className="text-xs text-gray-600 w-32 truncate">{c.concern}</span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#0B2545] rounded-full" style={{ width: `${c.pct}%` }} />
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
                <span className="font-bold text-[#0B2545]">{r.conversionRate}% conv.</span>
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
    fetch("/api/admin/quiz/qr-codes").then((r) => r.json()).then((d) => { if (d.success) setHistory(d.data); }).finally(() => setLoadingHistory(false));
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
    await fetch("/api/admin/quiz/qr-codes", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadHistory();
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
          <img src={qrPngUrl} alt="Assessment QR code" width={240} height={240} className="rounded-lg" />
          <div className="flex items-center gap-4">
            <a href={qrPngUrl} download={`${fileBase}.png`} className="text-sm font-semibold text-[#0B2545] underline">Download PNG</a>
            <a href={qrSvgUrl} download={`${fileBase}.svg`} className="text-sm font-semibold text-[#0B2545] underline">Download SVG</a>
          </div>
        </div>

        {saveError && <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-1.5">{saveError}</p>}
        <button onClick={saveQr} disabled={saving} className="w-full py-2.5 bg-[#0B2545] hover:bg-[#1a3a6e] text-white font-semibold text-sm rounded-lg disabled:opacity-60 transition">
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
                  <a href={png} download={`${h.name}.png`} className="text-xs font-semibold text-[#0B2545] underline shrink-0">PNG</a>
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
  const [tab, setTab] = useState<"questions" | "treatments" | "leads" | "analytics" | "qr" | "settings">("questions");
  const [openConcern, setOpenConcern] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/quiz").then((r) => r.json()).then((d) => { if (d.success) setConfig(d.data); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

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
    if (!confirm("Reset all AI Assessment content to the original defaults? This overwrites your changes.")) return;
    setConfig(JSON.parse(JSON.stringify(DEFAULT_QUIZ_CONFIG)));
    setSaved(false);
  };

  const addQuestion = () => {
    const id = `question-${Date.now()}`;
    updateConfig({
      questions: [...config.questions, {
        id, title: "New Question", subtitle: "", description: "", icon: "❓", image: "",
        type: "single", order: config.questions.length + 1, required: true, answers: [],
        sliderMin: 0, sliderMax: 100, sliderStep: 1, sliderUnit: "",
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

  const updateTreatmentMap = (concernTag: string, entry: TreatmentMapEntry) => {
    setConfig((prev) => ({ ...prev, treatmentMap: prev.treatmentMap.map((e) => e.concernTag === concernTag ? entry : e) }));
    setSaved(false);
  };

  if (loading) return <div className="text-center py-20 text-gray-400">Loading AI Assessment…</div>;

  const orderedQuestions = [...config.questions].sort((a, b) => a.order - b.order);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">✨ AI Assessment</h1>
          <p className="text-sm text-gray-500 mt-1">Configure the AI Skin &amp; Hair Assessment — questions, treatment logic, and results. Changes go live instantly.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={resetToDefaults} className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-2">Reset defaults</button>
          <button onClick={save} disabled={saving} className={`px-5 py-2 rounded-lg text-sm font-semibold text-white transition ${saved ? "bg-green-600" : "bg-[#0B2545] hover:bg-[#1a3a6e]"} disabled:opacity-50`}>
            {saving ? "Saving…" : saved ? "✓ Saved" : "Save Changes"}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">{error}</p>}

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {([
          ["questions", "📋 Questions"], ["treatments", "💊 Treatment Mapping"],
          ["leads", "🧑‍🤝‍🧑 Leads"],
          ["analytics", "📊 Analytics"], ["qr", "🔗 QR Generator"], ["settings", "⚙ Settings"],
        ] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === t ? "bg-white text-[#0B2545] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "questions" && (
        <div className="space-y-4">
          {orderedQuestions.map((q, i) => (
            <QuestionCard
              key={q.id} question={q} allQuestions={orderedQuestions}
              onChange={(v) => updateQuestion(q.id, v)} onRemove={() => removeQuestion(q.id)}
              onMove={(dir) => moveQuestion(q.id, dir)} isFirst={i === 0} isLast={i === orderedQuestions.length - 1}
            />
          ))}
          <button onClick={addQuestion} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-semibold text-[#0B2545] hover:border-[#0B2545]/40 hover:bg-[#f6faff] transition">
            + Add Question
          </button>
          {missingQuickAddIds.length > 0 && (
            <button onClick={addQuickAddQuestions} className="w-full py-3 border-2 border-dashed border-purple-200 rounded-xl text-sm font-semibold text-purple-700 hover:border-purple-400 hover:bg-purple-50 transition">
              + Add Gender / Age / Photo / Notes
            </button>
          )}
        </div>
      )}

      {tab === "treatments" && (
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
            <p className="text-sm text-gray-500">
              <strong>💡 AI Suggest</strong> — generates 3 evidence-based treatments per concern using the AI Prompt configured in Settings. Doctor reviews and edits before saving.
            </p>
          </div>
          {config.treatmentMap.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
              No concerns tagged yet. Go to Questions and tag an answer (e.g. "hair") with weight ≥ 50 — it'll appear here automatically.
            </div>
          ) : (
            config.treatmentMap.map((entry) => (
              <div key={entry.concernTag} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <button onClick={() => setOpenConcern(openConcern === entry.concernTag ? null : entry.concernTag)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition">
                  <div>
                    <span className="font-semibold text-gray-800">{entry.concernLabel || entry.concernTag}</span>
                    <span className="ml-3 text-xs text-gray-400">{entry.treatments.length} treatments</span>
                  </div>
                  <span className="text-gray-400">{openConcern === entry.concernTag ? "▲" : "▼"}</span>
                </button>
                {openConcern === entry.concernTag && (
                  <div className="px-5 pb-5 border-t border-gray-50 pt-4">
                    <ConcernTreatmentPanel entry={entry} aiPrompt={config.aiPrompt} enableAI={config.settings.enableAI} onChange={(updated) => updateTreatmentMap(entry.concernTag, updated)} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "leads" && <LeadsTab />}
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
            <Toggle checked={config.settings.enabled} onChange={(v) => updateConfig({ settings: { ...config.settings, enabled: v } })} label="Enable Assessment" />
            <Toggle checked={config.settings.enableAI} onChange={(v) => updateConfig({ settings: { ...config.settings, enableAI: v } })} label="Enable AI Suggest (Treatment Mapping)" />
            <Toggle checked={config.settings.enableEmail} onChange={(v) => updateConfig({ settings: { ...config.settings, enableEmail: v } })} label="Enable Email Report" />
            <Toggle checked={config.settings.enableQR} onChange={(v) => updateConfig({ settings: { ...config.settings, enableQR: v } })} label="Enable QR Code Access" />
            <Toggle checked={config.settings.enableNotes !== false} onChange={(v) => updateConfig({ settings: { ...config.settings, enableNotes: v } })} label={'Enable "Anything else for your doctor?" Note'} />
            <Toggle checked={config.settings.anonymousMode} onChange={(v) => updateConfig({ settings: { ...config.settings, anonymousMode: v } })} label="Anonymous Mode (no login required)" />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <p className="text-sm font-bold text-gray-700">Matching</p>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Maximum Recommendations</label>
              <input type="number" min={1} max={5} value={config.settings.maxRecommendations}
                onChange={(e) => updateConfig({ settings: { ...config.settings, maxRecommendations: Number(e.target.value) } })}
                className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Confidence Threshold (%)</label>
              <input type="number" min={0} max={100} value={config.settings.confidenceThreshold}
                onChange={(e) => updateConfig({ settings: { ...config.settings, confidenceThreshold: Number(e.target.value) } })}
                className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <p className="text-[10px] text-gray-400 mt-1">Treatments below this confidence % are never recommended.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <p className="text-sm font-bold text-gray-700">AI Prompt</p>
            <p className="text-xs text-gray-400">Clinic guidance the AI must follow when generating treatment suggestions on the Treatment Mapping tab.</p>
            <Textarea value={config.aiPrompt} onChange={(v) => updateConfig({ aiPrompt: v })} rows={5} placeholder="Always recommend evidence-based treatments…" />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <p className="text-sm font-bold text-gray-700">Doctor's Message</p>
            <p className="text-xs text-gray-400">Shown on the results screen, above the booking CTA.</p>
            <Textarea value={config.doctorMessage} onChange={(v) => updateConfig({ doctorMessage: v })} rows={3} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2">
            <p className="text-sm font-bold text-gray-700 mb-1">Results Screen Sections</p>
            {config.resultSections.map((s, i) => (
              <Toggle key={s.key} checked={s.visible} label={s.label}
                onChange={(v) => updateConfig({ resultSections: config.resultSections.map((x, idx) => idx === i ? { ...x, visible: v } : x) })} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
