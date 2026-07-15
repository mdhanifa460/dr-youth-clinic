import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/adminAuth";
import { callClaude } from "@/app/lib/ai/anthropic";
import { CLINICAL_AI_GUARDRAILS } from "@/app/lib/ai/clinicalGuardrails";

// On-demand only — a doctor clicks "Summarize with AI" while reviewing a
// specific lead's free-text note (app/admin/ai-assessment LeadsTab). Never
// called automatically during the public assessment flow, so it adds no
// latency or cost to the conversion-critical lead-capture step.
export async function POST(req: NextRequest) {
  const denied = await requirePermission("ai-assessment", "view");
  if (denied) return denied;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ success: false, message: "AI not configured" }, { status: 503 });
  }

  try {
    const { note, primaryConcern } = await req.json();
    if (!note || typeof note !== "string" || !note.trim()) {
      return NextResponse.json({ success: false, message: "note is required" }, { status: 400 });
    }

    const prompt = `${CLINICAL_AI_GUARDRAILS}

A patient at a dermatology/aesthetic clinic wrote this free-text note before their clinical intake${primaryConcern ? ` (their main concern was tagged as "${primaryConcern}")` : ""}:

"${note.trim().slice(0, 500)}"

Summarize this in 1-2 short sentences for the treating doctor to skim before the consultation. Extract only clinically relevant details (duration, severity, prior treatments, triggers, specific worries). Do not diagnose, do not recommend treatments, do not add anything not stated by the patient. If the note has no clinically relevant content, say so plainly.

Return ONLY the summary text, no preamble, no quotes.`;

    const summary = await callClaude(prompt, 200);

    return NextResponse.json({ success: true, data: { summary } });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Summarization failed" }, { status: 500 });
  }
}
