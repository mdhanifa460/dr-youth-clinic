import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { Lead } from "@/app/models/Lead";
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from "@/app/lib/rateLimit";
import { generateText, isConfiguredProviderReady } from "@/app/lib/ai";
import { parseClaudeJson } from "@/app/lib/ai/anthropic";
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
  const rl = await checkRateLimit(`patient-report:${ip}`, 20, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  if (!isConfiguredProviderReady()) {
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

    // Pre-Consultation Assessment (Hair/Skin/Body redesign) — a completely
    // different prompt/output shape from the legacy branch below. AI's role
    // here is strictly to explain the deterministic result in plain
    // language; it never re-derives severity, never names a treatment
    // (there IS no treatment data in this payload to draw from), and never
    // overrides scoreAssessment()'s output — see architecture review §10.
    if (lead.assessmentType) {
      const ar = lead.assessmentResult || {};
      const categoryLines = (Array.isArray(ar.categoryScores) ? ar.categoryScores : [])
        .map((c: any) => `${c.label}: ${c.percent}%`).join(", ");
      const factorLines = (Array.isArray(ar.contributingFactors) ? ar.contributingFactors : [])
        .map((f: any) => f.label).join(", ");

      // Plan My Journey leads (assessmentType "journey") have no per-answer
      // risk-weight data, so ar.riskLevel stays "" — omit the line entirely
      // rather than reporting a misleading "0% risk" that was never measured.
      const assessmentLabel = lead.assessmentType === "journey" ? "Plan My Journey" : lead.assessmentType;
      const prompt = `${CLINICAL_AI_GUARDRAILS}

A patient just completed a ${assessmentLabel} pre-consultation assessment at DR Youth Clinic.

Deterministic results (already computed — do not change, re-rank, or contradict any of these numbers):
- Overall Concern Level: ${ar.overallConcern ?? "N/A"}% (${ar.severity || "N/A"})
${ar.riskLevel ? `- Risk Level: ${ar.riskScore ?? "N/A"}% (${ar.riskLevel})\n` : ""}- Category breakdown: ${categoryLines || "none"}
- Possible contributing factors already identified: ${factorLines || "none"}

Write ONE short, warm, plain-language paragraph (3-4 sentences) explaining this result directly to the patient. You must:
- Restate their Concern Level in your own words, without changing the number or severity label${ar.riskLevel ? " (and their Risk Level, if given)" : ""}
- Briefly mention the contributing factors already listed, if any — do not invent new ones
- Explain in one sentence why a specialist consultation can help
- NEVER name or imply a specific treatment, procedure, package, or price — none has been determined yet, that only happens after a doctor's evaluation
- NEVER state a diagnosis or guarantee an outcome
- Return ONLY the paragraph text, no JSON, no headers, no markdown`;

      const explanation = (await generateText(prompt, { maxTokens: 300 })).trim();
      await (Lead as any).findByIdAndUpdate(leadId, { $set: { "assessmentResult.aiExplanation": explanation } });
      return NextResponse.json({ success: true, data: { aiExplanation: explanation } });
    }

    // Only reachable for pre-existing historical leads with no assessmentType
    // at all — every current lead-creation path (skin-quiz, Plan My Journey)
    // sets one and takes the branch above instead. No treatment-matched
    // context anymore (Treatment Mapping removed) — the report is built from
    // the patient's own concern/answers alone.
    const prompt = `${CLINICAL_AI_GUARDRAILS}

A patient just completed a clinical intake at DR Youth Clinic. Their main concern: "${lead.primaryConcern || "not specified"}".

Write a short, friendly, plain-language report for the PATIENT (not the doctor) to read right after finishing their intake. Return ONLY valid JSON, no other text, in exactly this shape:
{
  "summary": "1-2 sentence friendly summary of their concern and what this report covers",
  "contributingFactors": ["short factor", "short factor"],
  "lifestyleFindings": ["short finding", "short finding"],
  "questionsForDoctor": ["a question the patient could ask their doctor", "..."]
}

Rules:
- 2-4 short items per array, plain language, no medical jargon without a one-word explanation
- NEVER name or imply a specific treatment, procedure, package, or price — none has been determined yet, that only happens after a doctor's evaluation
- Never diagnose, never guarantee an outcome
- questionsForDoctor should be genuinely useful questions the patient wouldn't have thought to ask`;

    const raw = await generateText(prompt, { maxTokens: 500 });
    const parsed = parseClaudeJson<{
      summary?: string;
      contributingFactors?: string[];
      lifestyleFindings?: string[];
      questionsForDoctor?: string[];
    }>(raw);

    const str = (v: any) => (typeof v === "string" ? v : "");
    const strArray = (v: any) => (Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, 6) : []);
    const patientReport = {
      summary: str(parsed.summary),
      contributingFactors: strArray(parsed.contributingFactors),
      lifestyleFindings: strArray(parsed.lifestyleFindings),
      questionsForDoctor: strArray(parsed.questionsForDoctor),
      treatmentOptionsDiscussed: [] as string[],
      generatedAt: new Date(),
    };

    await (Lead as any).findByIdAndUpdate(leadId, { $set: { patientReport } });

    return NextResponse.json({ success: true, data: patientReport });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Report generation failed" }, { status: 500 });
  }
}
