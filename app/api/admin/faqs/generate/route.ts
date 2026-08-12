import { NextResponse } from 'next/server';
import { requirePermission } from '@/app/lib/adminAuth';
import { connectDB } from '@/app/lib/mongodb';
import { Service } from '@/app/models/Service';
import { callGeminiText } from '@/app/lib/ai/gemini';

export const dynamic = 'force-dynamic';

// No Mongo cache here, unlike keyword-suggestions/meta-suggestions — those
// return raw suggestions an admin picks from without creating any record;
// this does too (the actual Faq documents only get created when the admin
// clicks "Add Selected" in the review modal, via the existing
// POST /api/admin/faqs, as drafts — active:false — until explicitly
// activated). Caching identical output across repeat generations would
// just make "regenerate for fresher wording" impossible.
async function generateFaqSuggestions(service: any) {
  if (!process.env.GEMINI_API_KEY) return null;

  // Only real, stored facts go into the prompt — the model is explicitly
  // told not to invent anything not listed here (no fabricated prices,
  // session counts, or clinical claims reaching a patient-facing FAQ).
  const facts = [
    `Service name: ${service.name}`,
    `Category: ${service.category}`,
    service.price ? `Price: ${service.currency || 'INR'} ${service.price}` : null,
    service.duration ? `Typical session duration: ${service.duration} minutes` : null,
    service.sessionsRequired ? `Sessions required: ${service.sessionsRequired}` : null,
    service.recoveryTime ? `Recovery time: ${service.recoveryTime}` : null,
    service.idealFor ? `Ideal for: ${service.idealFor}` : null,
    service.narrative ? `Description: ${service.narrative}` : null,
    service.heroDescription ? `Summary: ${service.heroDescription}` : null,
    (service.benefits || []).length
      ? `Benefits: ${service.benefits.map((b: any) => b.title).filter(Boolean).join(', ')}`
      : null,
  ].filter(Boolean).join('\n');

  const prompt = `You are writing FAQ content for DR Youth Clinic's website and AI chat assistant, for the treatment below.

${facts}

Generate 6-8 realistic, patient-friendly FAQ question-and-answer pairs a real patient researching this treatment would search for or ask a clinic chatbot.

Strict rules:
- Use ONLY the facts given above. Never state a specific price, session count, or duration that isn't listed above — if a fact isn't given, answer in general terms instead of guessing a number.
- Never diagnose, promise results, or make a medical claim beyond what's stated above.
- Do not use "you definitely have X" language or claim certainty about a patient's condition.
- Keep answers concise (2-4 sentences), warm, and professional — no medical jargon.
- Cover a realistic spread: at minimum include a "how much does it cost" question (answer generally if no price is given), a "how many sessions/how long" question, a "what is it good for / who is it for" question, and a "is it safe / does it hurt" question if appropriate.

Return ONLY valid JSON, no explanation, no markdown:
{
  "faqs": [
    { "question": "...", "answer": "...", "category": "${service.category}" }
  ]
}`;

  try {
    const raw = await callGeminiText(prompt, { temperature: 0.4, maxTokens: 1400, jsonMode: true });
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.faqs)) return null;
    const cleaned = parsed.faqs
      .filter((f: any) => typeof f?.question === 'string' && f.question.trim() && typeof f?.answer === 'string' && f.answer.trim())
      .slice(0, 10)
      .map((f: any) => ({
        question: String(f.question).trim(),
        answer: String(f.answer).trim(),
        category: typeof f.category === 'string' && f.category.trim() ? f.category.trim() : service.category,
      }));
    return cleaned.length ? cleaned : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const denied = await requirePermission('faqs', 'full');
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const { serviceId } = body;
  if (!serviceId) {
    return NextResponse.json({ success: false, message: 'serviceId is required' }, { status: 400 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { success: false, needsSetup: true, message: 'GEMINI_API_KEY not set in .env.local' },
      { status: 503 }
    );
  }

  await connectDB();

  const service = await (Service as any).findById(serviceId).lean();
  if (!service) {
    return NextResponse.json({ success: false, message: 'Service not found' }, { status: 404 });
  }

  const suggestions = await generateFaqSuggestions(service);
  if (!suggestions) {
    return NextResponse.json(
      { success: false, message: 'AI did not return valid FAQ suggestions. Try again.' },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true, suggestions, serviceName: service.name });
}
