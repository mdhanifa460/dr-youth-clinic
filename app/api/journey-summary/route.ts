import { NextRequest, NextResponse } from "next/server";
import { generateText, isConfiguredProviderReady } from "@/app/lib/ai";
import { CLINICAL_AI_GUARDRAILS } from "@/app/lib/ai/clinicalGuardrails";
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from "@/app/lib/rateLimit";

// AI Beauty Journey Module 10 — a short, plain-text "take-home summary"
// generated once a patient reaches Results with enough journey context
// (concern + either a matched treatment or scored recommendations).
// Persisted onto PatientJourney.aiSummaryReport by the caller (see
// UnifiedJourneyResults.tsx), same pattern as Module 5's Journey Timeline.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`journey-summary:${ip}`, 10, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  if (!isConfiguredProviderReady()) {
    return NextResponse.json({ success: false, message: "AI not configured" }, { status: 503 });
  }

  try {
    const { goalLabel, primaryConcern, overallConcern, severity } = await req.json();

    const safe = (v: any, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
    const safeGoal = safe(goalLabel, 60);
    const safeConcern = safe(primaryConcern, 200);
    const safeSeverity = safe(severity, 40);
    const safeOverall = typeof overallConcern === "number" ? Math.max(0, Math.min(100, Math.round(overallConcern))) : null;

    if (!safeGoal && !safeConcern) {
      return NextResponse.json({ success: false, message: "Not enough journey context to summarize" }, { status: 400 });
    }

    const prompt = `${CLINICAL_AI_GUARDRAILS}

You are writing a short, warm "take-home summary" for a PATIENT who just completed DR Youth Clinic's AI-guided pre-consultation journey for "${safeGoal || "their concern"}". This is the last thing they read before deciding whether to book a consultation — it should feel like a helpful recap from someone who was listening, not a sales pitch or a diagnosis.

What they told us: ${safeConcern || `general concerns about ${safeGoal || "their goal"}`}
${safeOverall !== null ? `Deterministic result already computed and shown to them (do not change or contradict): Concern Level ${safeOverall}%${safeSeverity ? ` (${safeSeverity})` : ""}.` : ""}

Write 3-4 short sentences that:
- Briefly acknowledge their specific concern/goal in your own words (don't just repeat it verbatim).
- If a Concern Level is given, restate it in your own words without changing the number or severity label.
- NEVER name or imply a specific treatment, procedure, package, or price — none has been determined yet, that only happens after a doctor's evaluation.
- End with a warm, encouraging nudge toward booking a consultation to get a doctor's full evaluation.
- Never state or imply a diagnosis, never guarantee a result or timeline, never use words like "will cure/fix/guarantee" — use "aims to", "many patients find", "your doctor will confirm" instead.

Return ONLY the summary text — no headings, no bullet points, no markdown, no quotation marks around it.`;

    const text = await generateText(prompt, { maxTokens: 300, cacheKey: "journey-summary:generate" });

    return NextResponse.json({ success: true, data: { text: text.trim() } });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Could not generate summary" }, { status: 500 });
  }
}
