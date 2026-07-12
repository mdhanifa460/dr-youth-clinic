import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/adminAuth";

export async function POST(req: NextRequest) {
  const denied = await requirePermission("ai-assessment", "full");
  if (denied) return denied;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, message: "AI not configured" }, { status: 503 });
  }

  try {
    const { concernLabel, customPrompt } = await req.json();
    if (!concernLabel) {
      return NextResponse.json({ success: false, message: "concernLabel required" }, { status: 400 });
    }

    const prompt = `You are a senior dermatologist and aesthetic medicine expert at DR Youth Clinic, a premium skin and hair clinic in India.

A patient's main skin/hair concern is: "${concernLabel}"

${customPrompt ? `Clinic guidance to follow strictly:\n${customPrompt}\n` : ''}
Generate exactly 3 treatment recommendations for this concern, ranked by relevance. Think like a doctor prescribing the best evidence-based treatments for Indian patients at a premium aesthetic clinic.

For each treatment provide:
- name: concise treatment name (2-5 words)
- icon: a single relevant emoji that represents the treatment visually
- description: 1-2 sentence clinical description of how the treatment works and its benefit
- confidence: percentage match score (first treatment: 90–98%, second: 80–92%, third: 72–85%)
- sessions: recommended session count and frequency (e.g. "4–6 sessions, every 3 weeks")
- duration: typical time per session (e.g. "30 min")
- recovery: expected downtime (e.g. "Minimal, mild redness for a day" or "None")
- price: typical price range in INR at a premium Indian clinic (e.g. "₹5,000 – ₹12,000/session")
- advantages: array of 2-3 short benefit phrases
- disadvantages: array of 1-2 short honest limitations (e.g. "Requires maintenance sessions") — never omit this, patients trust clinics that are upfront
- cta: a short call-to-action button label (e.g. "Book Consultation")

Rules:
- Be specific and clinically accurate
- Use Indian Rupee (₹) for all prices
- Rankings should be realistic (most effective/popular first)
- Descriptions should sound professional yet accessible to non-medical patients
- Never recommend surgical procedures unless the concern description implies an advanced/severe case

Return ONLY valid JSON array, no other text:
[
  { "name": "...", "icon": "...", "description": "...", "confidence": 95, "sessions": "...", "duration": "...", "recovery": "...", "price": "₹...", "advantages": ["...","..."], "disadvantages": ["..."], "cta": "Book Consultation" }
]`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1536,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "";

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON in AI response");

    const treatments = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(treatments) || treatments.length === 0) {
      throw new Error("Invalid AI response format");
    }

    return NextResponse.json({ success: true, data: treatments.slice(0, 3) });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "AI generation failed" }, { status: 500 });
  }
}
