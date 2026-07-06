import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/adminAuth";

export async function POST(req: NextRequest) {
  const denied = await requirePermission("services", "full");
  if (denied) return denied;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, message: "AI not configured" }, { status: 503 });
  }

  try {
    const { concernId } = await req.json();
    if (!concernId) {
      return NextResponse.json({ success: false, message: "concernId required" }, { status: 400 });
    }

    const prompt = `You are a senior dermatologist and aesthetic medicine expert at DR Youth Clinic, a premium skin and hair clinic in India.

A patient's main skin/hair concern is: "${concernId}"

Generate exactly 3 treatment recommendations for this concern, ranked by relevance. Think like a doctor prescribing the best evidence-based treatments for Indian patients at a premium aesthetic clinic.

For each treatment provide:
- name: concise treatment name (2-5 words)
- icon: a single relevant emoji that represents the treatment visually
- desc: 1-2 sentence clinical description of how the treatment works and its benefit
- sessions: recommended session count and frequency (e.g. "4–6 sessions, every 3 weeks")
- price: typical price range in INR at a premium Indian clinic (e.g. "₹5,000 – ₹12,000/session")
- match: percentage match score (first treatment: 90–98%, second: 80–92%, third: 72–85%)

Rules:
- Be specific and clinically accurate
- Use Indian Rupee (₹) for all prices
- Rankings should be realistic (most effective/popular first)
- Descriptions should sound professional yet accessible to non-medical patients

Return ONLY valid JSON array, no other text:
[
  { "name": "...", "icon": "...", "desc": "...", "sessions": "...", "price": "₹...", "match": 95 },
  { "name": "...", "icon": "...", "desc": "...", "sessions": "...", "price": "₹...", "match": 85 },
  { "name": "...", "icon": "...", "desc": "...", "sessions": "...", "price": "₹...", "match": 76 }
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
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "";

    // Extract JSON from response
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
