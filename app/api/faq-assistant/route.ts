import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from '@/app/lib/rateLimit';
import { answerFaqQuestion } from '@/app/lib/rag/RAGService';

const MAX_QUESTION_LENGTH = 300;
const MAX_FAQS = 200; // sanity cap on the client-supplied faqs list used for predefined matching

// Public, unauthenticated — hits the Gemini API with no auth wall (same
// posture as app/api/assessment-chat), so it's rate-limited per IP.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`faq-assistant:${ip}`, 20, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ success: false, message: 'AI not configured' }, { status: 503 });
  }

  try {
    const { question, faqs } = await req.json();
    if (!question || typeof question !== 'string' || !question.trim()) {
      return NextResponse.json({ success: false, message: 'question is required' }, { status: 400 });
    }
    if (!Array.isArray(faqs)) {
      return NextResponse.json({ success: false, message: 'faqs is required' }, { status: 400 });
    }

    const cleanFaqs = faqs
      .filter((f: any) => f && typeof f.question === 'string' && typeof f.answer === 'string')
      .slice(0, MAX_FAQS);

    const result = await answerFaqQuestion(question.trim().slice(0, MAX_QUESTION_LENGTH), cleanFaqs);
    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Failed to get an answer' }, { status: 500 });
  }
}
