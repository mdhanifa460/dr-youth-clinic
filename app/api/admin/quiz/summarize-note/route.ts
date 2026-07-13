import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/adminAuth";

// On-demand only — a doctor clicks "Summarize with AI" while reviewing a
// specific lead's free-text note (app/admin/ai-assessment LeadsTab). Never
// called automatically during the public assessment flow, so it adds no
// latency or cost to the conversion-critical lead-capture step.
export async function POST(req: NextRequest) {
  const denied = await requirePermission("ai-assessment", "view");
  if (denied) return denied;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, message: "AI not configured" }, { status: 503 });
  }

  try {
    const { note, primaryConcern } = await req.json();
    if (!note || typeof note !== "string" || !note.trim()) {
      return NextResponse.json({ success: false, message: "note is required" }, { status: 400 });
    }

    const prompt = `A patient at a dermatology/aesthetic clinic wrote this free-text note before their AI skin & hair assessment${primaryConcern ? ` (their main concern was tagged as "${primaryConcern}")` : ""}:

"${note.trim().slice(0, 500)}"

Summarize this in 1-2 short sentences for the treating doctor to skim before the consultation. Extract only clinically relevant details (duration, severity, prior treatments, triggers, specific worries). Do not diagnose, do not recommend treatments, do not add anything not stated by the patient. If the note has no clinically relevant content, say so plainly.

Return ONLY the summary text, no preamble, no quotes.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) throw new Error(`AI API error: ${response.status}`);

    const data = await response.json();
    const summary = (data.content?.[0]?.text ?? "").trim();
    if (!summary) throw new Error("Empty AI response");

    return NextResponse.json({ success: true, data: { summary } });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Summarization failed" }, { status: 500 });
  }
}
