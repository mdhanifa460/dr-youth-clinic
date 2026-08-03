"use client";

// AI Observations module (AI Beauty Journey, Module 4) — the first
// patient-facing AI photo analysis in this codebase. Every other AI photo
// route here (app/api/admin/quiz/analyze-photo) is deliberately
// admin-only, per an explicit design comment: "an AI 'diagnosis' surfaced
// to a patient would be a real regulatory/liability problem." This screen
// exists specifically to do that safely — the disclaimer below is not
// optional UI decoration, it's the gate: the AI call cannot happen until
// the patient has explicitly acknowledged it, and that acknowledgment is
// persisted (see PatientJourney.aiObservations.disclaimerAcknowledged),
// not just shown and forgotten.
import { useState } from "react";

export interface AiObservationsResult {
  text: string;
  disclaimerAcknowledged: true;
}

export default function AiObservationsScreen({
  goalLabel,
  photoUrl,
  disclaimerText,
  onDone,
}: {
  goalLabel: string;
  photoUrl: string;
  disclaimerText: string;
  onDone: (result: AiObservationsResult | null) => void;
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const requestObservations = async () => {
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/patient-observations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl, goalLabel, disclaimerAcknowledged: true }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || "Could not generate observations");
      setText(data.data.text);
      setStatus("done");
    } catch (err: any) {
      setError(err.message || "Something went wrong — you can skip this step and continue.");
      setStatus("error");
    }
  };

  return (
    <div className="py-6 md:py-10">
      <div className="text-center mb-7">
        <span className="inline-flex items-center gap-1.5 bg-[#0B2560]/10 text-[#0B2560] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-5">
          {goalLabel} · AI Observations
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#0B2560] mb-2 tracking-tight">Your AI observations</h2>
      </div>

      {/* Disclaimer gate — always shown first, every time, regardless of
          prior visits. Not skippable via the acknowledgment path: the
          request button stays disabled until the checkbox is checked. */}
      <div className="max-w-sm mx-auto bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-5">
        <p className="text-xs text-amber-800 leading-relaxed">{disclaimerText}</p>
      </div>

      {status === "idle" && (
        <div className="max-w-sm mx-auto space-y-4">
          <label className="flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#0B2560] shrink-0"
            />
            <span>I understand this is a general observation, not a medical diagnosis.</span>
          </label>
          <button
            type="button"
            disabled={!acknowledged}
            onClick={requestObservations}
            className="w-full py-3.5 bg-[#0B2560] text-white font-bold text-sm rounded-2xl shadow-md shadow-[#0B2560]/20 hover:bg-[#0d2d72] disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Show My Observations
          </button>
          <button type="button" onClick={() => onDone(null)} className="w-full text-sm text-gray-500 hover:text-[#0B2560] font-medium">
            Skip this step
          </button>
        </div>
      )}

      {status === "loading" && (
        <div className="flex flex-col items-center gap-3 py-10">
          <span className="w-8 h-8 border-2 border-[#0B2560]/20 border-t-[#0B2560] rounded-full animate-spin" />
          <p className="text-xs text-gray-500">Looking at your photo…</p>
        </div>
      )}

      {status === "error" && (
        <div className="max-w-sm mx-auto text-center space-y-4">
          <p className="text-sm text-red-500">{error}</p>
          <button type="button" onClick={() => onDone(null)} className="text-sm font-semibold text-[#0B2560] hover:underline">
            Continue without observations →
          </button>
        </div>
      )}

      {status === "done" && (
        <div className="max-w-sm mx-auto space-y-5">
          <div className="bg-white border border-gray-100 rounded-2xl px-5 py-4 shadow-sm">
            <p className="text-sm text-gray-700 leading-relaxed">{text}</p>
          </div>
          <p className="text-[11px] text-gray-400 text-center">
            General observations only — your doctor will give you a real assessment at consultation.
          </p>
          <button
            type="button"
            onClick={() => onDone({ text, disclaimerAcknowledged: true })}
            className="w-full py-3.5 bg-[#0B2560] text-white font-bold text-sm rounded-2xl shadow-md shadow-[#0B2560]/20 hover:bg-[#0d2d72] transition"
          >
            Continue →
          </button>
        </div>
      )}
    </div>
  );
}
