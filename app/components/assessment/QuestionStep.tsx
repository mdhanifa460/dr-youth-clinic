"use client";

// Shared question-rendering UI, extracted from
// app/(public)/skin-quiz/page.tsx so app/(public)/plan-my-journey/
// PlanMyJourneyClient.tsx renders the exact same question UI instead of a
// second implementation. One generic renderer for every AssessmentQuestion
// type — questions are admin-defined, so their number/order/type isn't
// fixed at build time.
import { useRef, useState } from "react";
import type { AssessmentQuestion } from "@/app/lib/quizDefaults";

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
    </svg>
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
export function PhotoUploadField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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
          <span className="text-xs text-gray-500">Optional — you can skip this step</span>
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

export default function QuestionStep({
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
      <div className="bg-white rounded-2xl border-2 border-gray-100 px-5 py-4 focus-within:border-[#0B2560]/40 transition">
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
          {question.sliderUnit && <span className="text-sm text-gray-500">{question.sliderUnit}</span>}
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
        <div className="flex justify-between text-xs text-gray-500 mt-1">
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

  // "None of the above"-style answers (every one in this codebase's content
  // is titled starting with "None") are mutually exclusive with every other
  // option in the same multi-select: picking one clears the rest, and
  // picking anything else clears it — matches how a real "none" checkbox
  // should behave, instead of letting "None so far" sit selected alongside
  // "PRP" as if both were true.
  const isNoneAnswer = (id: string) => /^none\b/i.test(question.answers.find((a) => a.id === id)?.title || "");

  const toggle = (id: string) => {
    if (isMulti) {
      if (selectedIds.includes(id)) {
        onChange(selectedIds.filter((x) => x !== id));
      } else if (isNoneAnswer(id)) {
        onChange([id]);
      } else {
        onChange([...selectedIds.filter((x) => !isNoneAnswer(x)), id]);
      }
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
