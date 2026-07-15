import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { Lead } from "@/app/models/Lead";
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from "@/app/lib/rateLimit";
import { callClaude, parseClaudeJson } from "@/app/lib/ai/anthropic";
import { CLINICAL_AI_GUARDRAILS } from "@/app/lib/ai/clinicalGuardrails";

// Public, unauthenticated — fired once from the Results screen right after
// the completed-intake PATCH to /api/leads succeeds (same trust level as
// /api/assessment-chat: rate-limited per IP, not behind requirePermission).
// Turns the already-saved answers/recommendations into the patient-facing
// Patient Report sections (Hair Health Summary, Contributing Factors,
// Lifestyle Findings, Questions to Ask Your Doctor, Treatment Options Your
// Doctor May Discuss) and persists them onto the Lead so the doctor
// dashboard and any later view of this lead see the same report.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`patient-report:${ip}`, 20, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ success: false, message: "AI not configured" }, { status: 503 });
  }

  try {
    const { leadId } = await req.json();
    if (!leadId || typeof leadId !== "string") {
      return NextResponse.json({ success: false, message: "leadId is required" }, { status: 400 });
    }

    await connectDB();
    const lead = await (Lead as any).findById(leadId).lean();
    if (!lead) {
      return NextResponse.json({ success: false, message: "Lead not found" }, { status: 404 });
    }

    const recs: any[] = Array.isArray(lead.recommendations) ? lead.recommendations : [];
    const treatmentContext = recs
      .map((r: any) => (typeof r === "string" ? r : [r.name, r.description].filter(Boolean).join(" — ")))
      .filter(Boolean)
      .join("\n");

    const prompt = `${CLINICAL_AI_GUARDRAILS}

A patient just completed a clinical intake at DR Youth Clinic. Their main concern: "${lead.primaryConcern || "not specified"}".

Possible discussion topics already matched by the clinic's intake engine (do not invent new ones, only reference these):
${treatmentContext || "No specific topics matched yet."}

Write a short, friendly, plain-language report for the PATIENT (not the doctor) to read right after finishing their intake. Return ONLY valid JSON, no other text, in exactly this shape:
{
  "summary": "1-2 sentence friendly summary of their concern and what this report covers",
  "contributingFactors": ["short factor", "short factor"],
  "lifestyleFindings": ["short finding", "short finding"],
  "questionsForDoctor": ["a question the patient could ask their doctor", "..."],
  "treatmentOptionsDiscussed": ["short treatment category name", "..."]
}

Rules:
- 2-4 short items per array, plain language, no medical jargon without a one-word explanation
- Never diagnose, never guarantee an outcome, never state a treatment is "needed" — frame treatmentOptionsDiscussed as things the doctor may discuss
- questionsForDoctor should be genuinely useful questions the patient wouldn't have thought to ask`;

    const raw = await callClaude(prompt, 700);
    const parsed = parseClaudeJson<{
      summary?: string;
      contributingFactors?: string[];
      lifestyleFindings?: string[];
      questionsForDoctor?: string[];
      treatmentOptionsDiscussed?: string[];
    }>(raw);

    const str = (v: any) => (typeof v === "string" ? v : "");
    const strArray = (v: any) => (Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 6) : []);
    const patientReport = {
      summary: str(parsed.summary),
      contributingFactors: strArray(parsed.contributingFactors),
      lifestyleFindings: strArray(parsed.lifestyleFindings),
      questionsForDoctor: strArray(parsed.questionsForDoctor),
      treatmentOptionsDiscussed: strArray(parsed.treatmentOptionsDiscussed),
      generatedAt: new Date(),
    };

    await (Lead as any).findByIdAndUpdate(leadId, { $set: { patientReport } });

    return NextResponse.json({ success: true, data: patientReport });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Report generation failed" }, { status: 500 });
  }
}
