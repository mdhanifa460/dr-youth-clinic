import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import { Lead } from "@/app/models/Lead";
import QuizConfig, { DEFAULT_QUIZ_CONFIG } from "@/app/models/QuizConfig";
import AssessmentConfig, { DEFAULT_ASSESSMENT_TYPES } from "@/app/models/AssessmentConfig";
import { migrateLegacyQuizConfig, backfillClinicalFields } from "@/app/lib/quizMigration";
import { generateText, isConfiguredProviderReady } from "@/app/lib/ai";
import { CLINICAL_AI_GUARDRAILS } from "@/app/lib/ai/clinicalGuardrails";

// Doctor Review Mode, step 1 — a doctor/staff member (with at least "view")
// requests an AI-drafted pre-consultation summary for one lead. This is only
// ever a DRAFT: it's written to lead.aiSummary.draftText with status
// "draft", and a doctor must review, optionally edit, and explicitly approve
// it (see the PATCH handler on /api/admin/quiz/leads) before a care plan can
// ever be generated from it (/api/admin/quiz/care-plan enforces that gate
// server-side) — "the final care plan is based on the doctor's review, not
// AI alone."
export async function POST(req: NextRequest) {
  // Requires "full", not just "view" — generating a new draft overwrites
  // aiSummary wholesale (status resets to "draft"), which silently revokes
  // an existing approval exactly like the explicit "Un-approve" action in
  // /api/admin/quiz/leads (PATCH) does — that action requires "full", so
  // this route must too, or a view-only user could achieve the same
  // effective un-approval the permission model was built to restrict.
  const denied = await requirePermission("ai-assessment", "full");
  if (denied) return denied;

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

    // Pre-Consultation Assessment leads (Hair/Skin/Body redesign) use an
    // entirely different question set/config collection — look up the
    // matching type's questions there instead of the legacy QuizConfig,
    // whose question ids wouldn't match this lead's answers at all.
    const isNewAssessment = !!lead.assessmentType;
    let questionById: (id: string) => any;
    let treatmentContext: string;

    if (isNewAssessment) {
      const acDoc = await (AssessmentConfig as any).findOne({}).lean();
      const types = acDoc?.assessmentTypes?.length ? acDoc.assessmentTypes : DEFAULT_ASSESSMENT_TYPES;
      const typeConfig = types.find((t: any) => t.key === lead.assessmentType);
      // "journey" (Plan My Journey) has no matching AssessmentConfig entry —
      // its questions live in QuizConfig instead (see scoreJourneyConcern in
      // assessmentScoring.ts, which computes assessmentResult from that same
      // config). Fall back there so answer labels still resolve instead of
      // silently degrading to raw stored values for every PMJ lead.
      let questionByIdFallback: ((id: string) => any) | null = null;
      if (!typeConfig) {
        const quizConfigDoc = await (QuizConfig as any).findOne({}).lean();
        const fallbackConfig = quizConfigDoc ? backfillClinicalFields(migrateLegacyQuizConfig(quizConfigDoc)) : DEFAULT_QUIZ_CONFIG;
        questionByIdFallback = (id: string) => fallbackConfig.questions.find((q: any) => q.id === id);
      }
      questionById = (id: string) => typeConfig?.questions?.find((q: any) => q.id === id) ?? questionByIdFallback?.(id);
      const ar = lead.assessmentResult || {};
      treatmentContext = [
        `Overall Concern: ${ar.overallConcern ?? "N/A"}% (${ar.severity || "N/A"})`,
        ar.riskLevel ? `Risk Level: ${ar.riskScore ?? "N/A"}% (${ar.riskLevel})` : "",
        Array.isArray(ar.categoryScores) && ar.categoryScores.length
          ? `Category breakdown: ${ar.categoryScores.map((c: any) => `${c.label} ${c.percent}%`).join(", ")}` : "",
        Array.isArray(ar.contributingFactors) && ar.contributingFactors.length
          ? `Possible contributing factors: ${ar.contributingFactors.map((f: any) => f.label).join(", ")}` : "",
      ].filter(Boolean).join("\n");
    } else {
      // Only reachable for pre-existing historical leads with no
      // assessmentType at all — every current lead-creation path (skin-quiz,
      // Plan My Journey) sets one. No treatment-matched context anymore
      // (Treatment Mapping removed): the doctor works from the raw answers
      // below alone, same as the deterministic-assessment branch above.
      const configDoc = await (QuizConfig as any).findOne({}).lean();
      const config = configDoc ? backfillClinicalFields(migrateLegacyQuizConfig(configDoc)) : DEFAULT_QUIZ_CONFIG;
      questionById = (id: string) => config.questions.find((q: any) => q.id === id);
      treatmentContext = "";
    }

    const answerLabel = (q: any, raw: any): string => {
      if (raw === undefined || raw === null || raw === "") return "";
      if (Array.isArray(raw)) return raw.map((id) => q?.answers.find((a: any) => a.id === id)?.title || id).join(", ");
      if (!q) return String(raw);
      return q.answers.find((a: any) => a.id === raw)?.title || String(raw);
    };

    const answerLines = Object.entries(lead.answers || {})
      .map(([qId, raw]) => {
        const q = questionById(qId);
        const label = answerLabel(q, raw);
        if (!label) return null;
        return `${q?.title || qId}: ${label}`;
      })
      .filter(Boolean)
      .join("\n");

    const prompt = `${CLINICAL_AI_GUARDRAILS}

You are preparing a pre-consultation summary for a doctor at DR Youth Clinic. Below is one patient's clinical intake. Organize and synthesize ONLY what is given below into a concise, skimmable note — never invent a fact, symptom, or history detail not present here.

Patient: ${lead.name || "Unknown"}
Primary concern: ${lead.primaryConcern || "not specified"}

Full intake answers (question: answer):
${answerLines || "No answers recorded."}

${isNewAssessment ? "Deterministic pre-consultation assessment result (already computed — do not recompute or contradict):" : ""}
${treatmentContext || (isNewAssessment ? "No data available yet." : "")}

Write the summary in exactly this structure, short bullet points under each heading (write "None noted" if a heading has nothing relevant — never omit a heading):

Chief Complaint:
Patient History:
Symptoms Summary:
Lifestyle Summary:
Previous Treatments:
Patterns Identified:
Red Flags: (only flag something here if it genuinely warrants urgent doctor attention before/at consultation — e.g. a red-flag symptom combination; otherwise "None noted")
Possible Clinical Indicators:
Suggested Investigations:

Never suggest or name a specific treatment, procedure, package, or price — that decision belongs to the doctor alone, based on their own evaluation at consultation. Keep it factual and concise. This is a draft starting point — the doctor will review and edit it before it is ever finalized or acted on.`;

    const draftText = await generateText(prompt, { maxTokens: 900 });

    const now = new Date();
    await (Lead as any).findByIdAndUpdate(leadId, {
      $set: {
        aiSummary: {
          draftText,
          editedText: "",
          status: "draft",
          approvedAt: null,
          approvedBy: "",
          generatedAt: now,
        },
        // A fresh draft invalidates any care plan generated from the
        // previous summary — clear it so the Doctor Review panel can't
        // resurface a stale plan once this new draft is later approved.
        carePlan: { text: "", generatedAt: null },
      },
    });

    return NextResponse.json({ success: true, data: { draftText, status: "draft", generatedAt: now, carePlan: { text: "", generatedAt: null } } });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Summary generation failed" }, { status: 500 });
  }
}
