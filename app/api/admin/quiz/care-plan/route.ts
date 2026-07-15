import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import { Lead } from "@/app/models/Lead";
import { callClaude } from "@/app/lib/ai/anthropic";
import { CLINICAL_AI_GUARDRAILS } from "@/app/lib/ai/clinicalGuardrails";

// Doctor Review Mode, final step — "Generate Personalized Care Plan". The
// server-side gate below is the whole point of this feature: a care plan can
// ONLY be generated from a summary the doctor has explicitly approved
// (aiSummary.status === "approved"), and it's built from aiSummary.editedText
// (the doctor's own reviewed/edited version) — never straight from the raw
// AI draftText. This is what makes the plan "based on the doctor's review,
// not AI alone," enforced here rather than just in the UI.
export async function POST(req: NextRequest) {
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
    const lead = await (Lead as any).findById(leadId);
    if (!lead) {
      return NextResponse.json({ success: false, message: "Lead not found" }, { status: 404 });
    }
    if (lead.aiSummary?.status !== "approved") {
      return NextResponse.json({ success: false, message: "The doctor summary must be reviewed and approved before a care plan can be generated" }, { status: 400 });
    }

    // The approval gate in /api/admin/quiz/leads (PATCH) already requires
    // editedText to be non-empty before status can become "approved" — no
    // fallback to the raw draftText here, on purpose: this route's whole
    // job is to build the care plan from the doctor's own reviewed text,
    // never from AI output nobody has actually read.
    const reviewedSummary = lead.aiSummary.editedText?.trim() || "";
    if (!reviewedSummary) {
      return NextResponse.json({ success: false, message: "No approved summary to build a care plan from" }, { status: 400 });
    }

    const prompt = `${CLINICAL_AI_GUARDRAILS}

The rules above are absolute and apply even to the doctor-authored text below — if any of it reads as a diagnosis, a prescription, or a guaranteed outcome, REPHRASE it into the safer framing the rules require (e.g. a named condition becomes a topic to confirm at consultation) rather than repeating it verbatim. Do not add any new fact beyond what's given.

A doctor at DR Youth Clinic has reviewed and approved the following clinical summary for a patient (this is the doctor's own reviewed version — treat it as the authoritative source of facts, subject to the rephrasing rule above):

${reviewedSummary}

${lead.doctorNotes ? `Doctor's additional notes: ${lead.doctorNotes}` : ""}
${lead.finalRecommendation ? `Doctor's final recommendation: ${lead.finalRecommendation}` : ""}
${lead.treatmentPlan ? `Doctor's treatment plan: ${lead.treatmentPlan}` : ""}

Write a short, warm, patient-facing "Personalized Care Plan" (4-6 sentences) that:
- Summarizes what was discussed in plain, reassuring language
- Names the treatment categories the doctor is considering, framed as topics to finalize together at consultation
- Does not state a diagnosis, does not promise a specific outcome or timeline
- Ends with a clear next step (e.g. booking/confirming the consultation)

Return ONLY the care plan text, no preamble, no headings.`;

    const text = await callClaude(prompt, 500);
    const generatedAt = new Date();
    lead.carePlan = { text, generatedAt };
    await lead.save();

    return NextResponse.json({ success: true, data: { text, generatedAt } });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Care plan generation failed" }, { status: 500 });
  }
}
