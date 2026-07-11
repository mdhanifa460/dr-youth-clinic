import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { Service } from "@/app/models/Service";
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from "@/app/lib/rateLimit";

export async function POST(req: Request) {
  // 5 simulations per hour per IP — this hits a paid AI API with no auth wall,
  // unlike the admin-side AI routes which sit behind requirePermission.
  const ip = getClientIp(req);
  const rl = checkRateLimit(`journey-simulator:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, message: "AI not configured" }, { status: 503 });
  }

  try {
    const { serviceId, concern, goal } = await req.json();

    if (!serviceId || typeof serviceId !== "string") {
      return NextResponse.json({ success: false, message: "serviceId required" }, { status: 400 });
    }
    if (!concern || typeof concern !== "string" || concern.trim().length < 3 || concern.trim().length > 300) {
      return NextResponse.json({ success: false, message: "Please describe your concern (3–300 characters)" }, { status: 400 });
    }
    if (goal && (typeof goal !== "string" || goal.length > 300)) {
      return NextResponse.json({ success: false, message: "Goal text is too long" }, { status: 400 });
    }

    await connectDB();
    const svc = await (Service as any)
      .findOne({ _id: serviceId, status: "active" })
      .select("name category sessionsCount journeyPhases sessionsRequired recoveryTime duration")
      .lean();

    if (!svc) {
      return NextResponse.json({ success: false, message: "Service not found" }, { status: 404 });
    }

    const sessions = svc.sessionsCount || 6;

    const prompt = `You are a patient-education assistant for DR Youth Clinic, a dermatology and aesthetic clinic in India. You are NOT a doctor and must not make diagnoses, medical guarantees, or promise specific results.

A prospective patient is looking at "${svc.name}" (category: ${svc.category}, typical course: ${sessions} sessions${svc.recoveryTime ? `, recovery: ${svc.recoveryTime}` : ""}).

Their concern: "${concern.trim()}"
${goal?.trim() ? `Their goal: "${goal.trim()}"` : ""}

Generate a personalised, realistic 4-phase treatment journey for THIS patient's specific situation (not a generic template) — reference their stated concern/goal naturally in the phase descriptions so it feels tailored to them.

Return ONLY valid JSON, no other text, in this exact shape:
{
  "summary": "1-2 sentence empathetic summary acknowledging their specific concern",
  "phases": [
    { "sessionRange": "Session 1-X", "title": "...", "description": "2-3 sentences, specific to their concern/goal" },
    { "sessionRange": "Session X-Y", "title": "...", "description": "..." },
    { "sessionRange": "Session Y-Z", "title": "...", "description": "..." },
    { "sessionRange": "Post-treatment", "title": "...", "description": "..." }
  ],
  "disclaimer": "1 sentence reminding them this is an AI-generated estimate and their actual plan will be set by a doctor at consultation"
}

The 4 sessionRange values must divide ${sessions} total sessions sensibly (e.g. roughly 25%/50%/100%/post-treatment), matching the style "Session 1-2", "Session 3-4", etc.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 900,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in AI response");

    const journey = JSON.parse(jsonMatch[0]);
    if (!journey?.phases || !Array.isArray(journey.phases) || journey.phases.length === 0) {
      throw new Error("Invalid AI response format");
    }

    return NextResponse.json({ success: true, data: journey });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Simulation failed" }, { status: 500 });
  }
}
