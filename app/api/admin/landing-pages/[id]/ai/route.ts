import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/app/lib/adminAuth';

type AiType = 'headline' | 'cta' | 'faq' | 'seo' | 'benefits' | 'problem';

function buildPrompt(type: AiType, context: string): string {
  switch (type) {
    case 'headline':
      return `You are a conversion-focused copywriter for DR Youth Clinic, a premium skin, hair, and laser treatment clinic in India. Write 3 powerful headline options for a landing page about: "${context}". Each headline should be urgent, benefit-driven, and under 12 words. Return only the 3 headlines, one per line, no numbering.`;

    case 'cta':
      return `Write 5 compelling call-to-action button texts for a clinic landing page about: "${context}". Each CTA should create urgency and encourage immediate action. Keep each under 6 words. Return only the CTAs, one per line.`;

    case 'faq':
      return `Generate 5 frequently asked questions with concise answers for a DR Youth Clinic landing page about: "${context}". Format as JSON array: [{"q": "question", "a": "answer"}]. Return only the JSON array.`;

    case 'seo':
      return `Write SEO metadata for a DR Youth Clinic landing page about: "${context}". Return as JSON: {"title": "...", "description": "...", "keywords": "..."}. Title under 60 chars, description under 155 chars, keywords as comma-separated list. Return only the JSON.`;

    case 'benefits':
      return `List 6 key benefits of DR Youth Clinic's treatment for: "${context}". Format as JSON array: [{"icon": "emoji", "title": "short title", "desc": "1-line description"}]. Return only the JSON array.`;

    case 'problem':
      return `List 8 common problems or pain points that patients experience related to: "${context}" in the context of a skin/hair clinic. Return only the problems as a JSON array of strings. Example: ["Hair fall every morning", "Thinning at the crown"]. Return only the JSON array.`;

    default:
      return `Write compelling marketing copy for DR Youth Clinic about: "${context}".`;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const denied = await requirePermission('landing-pages', 'full');
  if (denied) return denied;

  try {
    const { type, context } = await req.json() as { type: AiType; context: string };

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: 'AI service not configured' },
        { status: 503 }
      );
    }

    const prompt = buildPrompt(type, context || 'skin and hair treatments');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic API error:', err);
      return NextResponse.json(
        { success: false, message: 'AI generation failed' },
        { status: 502 }
      );
    }

    const data = await response.json();
    const result = data.content?.[0]?.text ?? '';

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('AI route error:', error);
    return NextResponse.json(
      { success: false, message: 'AI generation failed' },
      { status: 500 }
    );
  }
}
