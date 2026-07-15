import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import { Lead } from "@/app/models/Lead";
import QuizConfig, { DEFAULT_QUIZ_CONFIG } from "@/app/models/QuizConfig";
import { migrateLegacyQuizConfig, backfillClinicalFields } from "@/app/lib/quizMigration";
import { callClaude } from "@/app/lib/ai/anthropic";
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

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ success: false, message: "AI not configured" }, { status: 503 });
  }

  try {
    const { leadId } = await req.json();
    if (!leadId || typeof leadId !== "string") {
      return NextResponse.json({ success: false, message: "leadId is required" }, { status: 400 });
    }

    await connectDB();

    const [lead, configDoc] = await Promise.all([
      (Lead as any).findById(leadId).lean(),
      (QuizConfig as any).findOne({}).lean(),
    ]);
    if (!lead) {
      return NextResponse.json({ success: false, message: "Lead not found" }, { status: 404 });
    }

    const config = configDoc ? backfillClinicalFields(migrateLegacyQuizConfig(configDoc)) : DEFAULT_QUIZ_CONFIG;
    const questionById = (id: string) => config.questions.find((q: any) => q.id === id);
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

    const recs: any[] = Array.isArray(lead.recommendations) ? lead.recommendations : [];
    const treatmentContext = recs
      .map((r: any) => {
        if (typeof r === "string") return `- ${r}`;
        const bits = [
          r.name,
          r.clinicalIndicators?.length ? `Indicators: ${r.clinicalIndicators.join(", ")}` : "",
          r.possibleCauses?.length ? `Possible causes to explore: ${r.possibleCauses.join(", ")}` : "",
          r.suggestedEvaluation?.length ? `Suggested evaluation: ${r.suggestedEvaluation.join(", ")}` : "",
          r.contraindications?.length ? `Contraindications: ${r.contraindications.join(", ")}` : "",
          r.doctorNotes ? `Doctor note: ${r.doctorNotes}` : "",
        ].filter(Boolean);
        return `- ${bits.join(" | ")}`;
      })
      .join("\n");

    const prompt = `${CLINICAL_AI_GUARDRAILS}

You are preparing a pre-consultation summary for a doctor at DR Youth Clinic. Below is one patient's clinical intake. Organize and synthesize ONLY what is given below into a concise, skimmable note — never invent a fact, symptom, or history detail not present here.

Patient: ${lead.name || "Unknown"}
Primary concern: ${lead.primaryConcern || "not specified"}

Full intake answers (question: answer):
${answerLines || "No answers recorded."}

Possible treatment categories already matched by the clinic's intake engine, with doctor-authored clinical context:
${treatmentContext || "No treatment categories matched yet."}

Write the summary in exactly this structure, short bullet points under each heading (write "None noted" if a heading has nothing relevant — never omit a heading):

Chief Complaint:
Patient History:
Symptoms Summary:
Lifestyle Summary:
Previous Treatments:
Patterns Identified:
Red Flags: (only flag something here if it genuinely warrants urgent doctor attention before/at consultation — e.g. a contraindication matched, a red-flag symptom combination; otherwise "None noted")
Possible Clinical Indicators:
Suggested Investigations:
Possible Treatment Categories:

Keep it factual and concise. This is a draft starting point — the doctor will review and edit it before it is ever finalized or acted on.`;

    const draftText = await callClaude(prompt, 900);

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
