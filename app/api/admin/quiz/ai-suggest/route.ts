import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/adminAuth";
import { callClaude } from "@/app/lib/ai/anthropic";
import { CLINICAL_AI_GUARDRAILS } from "@/app/lib/ai/clinicalGuardrails";
import { deriveConfidenceLevel } from "@/app/lib/confidenceLevel";

export async function POST(req: NextRequest) {
  const denied = await requirePermission("ai-assessment", "full");
  if (denied) return denied;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ success: false, message: "AI not configured" }, { status: 503 });
  }

  try {
    const { concernLabel, customPrompt } = await req.json();
    if (!concernLabel) {
      return NextResponse.json({ success: false, message: "concernLabel required" }, { status: 400 });
    }

    const prompt = `${CLINICAL_AI_GUARDRAILS}

You are assisting a senior dermatologist and aesthetic medicine expert at DR Youth Clinic, a premium skin and hair clinic in India, in drafting a clinical intake knowledge-base entry — the doctor will review and edit every field before it ever reaches a patient.

A patient's main skin/hair concern is: "${concernLabel}"

${customPrompt ? `Clinic guidance to follow strictly:\n${customPrompt}\n` : ''}
Draft exactly 3 possible treatment CATEGORIES a doctor might discuss for this concern, ranked by relevance — these are discussion topics for a consultation, never a prescription.

For each, provide:
- name: concise treatment name (2-5 words)
- icon: a single relevant emoji that represents the treatment visually
- description: 1-2 sentence clinical description of how the treatment works and its benefit
- confidence: internal relevance score 0-100 (first: 90–98, second: 80–92, third: 72–85) — never shown to a patient directly, only used to pick High/Medium/Low
- sessions: typical session count and frequency (e.g. "4–6 sessions, every 3 weeks")
- duration: typical time per session (e.g. "30 min")
- recovery: expected downtime (e.g. "Minimal, mild redness for a day" or "None")
- price: typical price range in INR at a premium Indian clinic (e.g. "₹5,000 – ₹12,000/session")
- advantages: array of 2-3 short benefit phrases
- disadvantages: array of 1-2 short honest limitations (e.g. "Requires maintenance sessions") — never omit this, patients trust clinics that are upfront
- cta: a short call-to-action button label (e.g. "Book Consultation")
- clinicalIndicators: array of 1-3 short patient-reported signs/symptoms that make this category relevant to discuss (e.g. "Sudden hair shedding", "Family history of pattern baldness")
- possibleCauses: array of 1-3 short possible underlying causes worth the doctor exploring (e.g. "Telogen effluvium", "Androgenetic alopecia") — phrased as possibilities to investigate, never a confirmed diagnosis
- suggestedEvaluation: array of 1-2 short things a doctor might check/ask at consultation (e.g. "Scalp examination", "Thyroid/iron panel if indicated")
- contraindications: array of 0-2 short situations where this category may not be suitable (e.g. "Active scalp infection", "Pregnancy") — empty array if none notable
- doctorNotes: 1 short sentence of internal guidance for the doctor reviewing this entry (e.g. "Confirm duration and rule out telogen effluvium before discussing procedural options")
- patientEducation: array of 1-2 short, plain-language educational points safe to show a patient (never a guarantee, never diagnostic language)

Rules:
- Be specific and clinically accurate; never phrase anything as a confirmed diagnosis or a guaranteed outcome
- Use Indian Rupee (₹) for all prices
- Rankings should be realistic (most relevant/commonly discussed first)
- Descriptions should sound professional yet accessible to non-medical patients
- Never suggest surgical procedures unless the concern description implies an advanced/severe case

Return ONLY valid JSON array, no other text:
[
  { "name": "...", "icon": "...", "description": "...", "confidence": 95, "sessions": "...", "duration": "...", "recovery": "...", "price": "₹...", "advantages": ["...","..."], "disadvantages": ["..."], "cta": "Book Consultation", "clinicalIndicators": ["..."], "possibleCauses": ["..."], "suggestedEvaluation": ["..."], "contraindications": [], "doctorNotes": "...", "patientEducation": ["..."] }
]`;

    const text = await callClaude(prompt, 3000);

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON in AI response");

    const treatments = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(treatments) || treatments.length === 0) {
      throw new Error("Invalid AI response format");
    }

    // The model is asked for reasonable field shapes, but it's still
    // untrusted output — coerce every field to the type the admin editor
    // and public quiz expect rather than trusting the AI's JSON as-is, and
    // derive confidenceLevel the same way every other treatment does
    // (never let the model pick its own High/Medium/Low label).
    const str = (v: any) => (typeof v === "string" ? v : "");
    const strArray = (v: any) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
    const clean = treatments.slice(0, 3).map((t: any) => {
      const confidence = typeof t?.confidence === "number" ? Math.max(0, Math.min(100, t.confidence)) : 80;
      return {
        name: str(t?.name),
        icon: str(t?.icon) || "✨",
        description: str(t?.description),
        confidence,
        sessions: str(t?.sessions),
        duration: str(t?.duration),
        recovery: str(t?.recovery),
        price: str(t?.price),
        advantages: strArray(t?.advantages),
        disadvantages: strArray(t?.disadvantages),
        cta: str(t?.cta) || "Book Consultation",
        clinicalIndicators: strArray(t?.clinicalIndicators),
        possibleCauses: strArray(t?.possibleCauses),
        suggestedEvaluation: strArray(t?.suggestedEvaluation),
        contraindications: strArray(t?.contraindications),
        doctorNotes: str(t?.doctorNotes),
        patientEducation: strArray(t?.patientEducation),
        confidenceLevel: deriveConfidenceLevel(confidence),
      };
    });

    return NextResponse.json({ success: true, data: clean });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "AI generation failed" }, { status: 500 });
  }
}
