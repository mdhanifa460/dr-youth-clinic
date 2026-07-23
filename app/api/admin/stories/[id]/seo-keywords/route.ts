import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/app/lib/adminAuth';

export const dynamic = 'force-dynamic';

// Mirrors app/api/admin/blog/[id]/seo-keywords/route.ts's Gemini call
// verbatim (same model, same JSON contract) with a story-flavored prompt —
// kept as a sibling route rather than generalizing the blog one, matching
// this codebase's "one route per surface" convention.
async function callGemini(title: string, storyType: string, description: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = `You are a senior SEO strategist for DR Youth Clinic, a premium aesthetic dermatology clinic in India competing with top clinics like Oliva Clinic, Kaya Clinic, and Dermacos.

Web Story title: "${title}"
Story type: ${storyType || 'General'}
${description ? `Story description: "${description}"` : ''}

Write SEO metadata for this Web Story (a short, visual, swipeable mobile format like Google Web Stories):
- title: an SEO meta title under 60 characters, informative, include the core topic. Do NOT include "DR Youth Clinic" — the site automatically appends " | DR Youth Clinic" to every page title.
- description: a meta description under 155 characters, accurate and compelling, no clickbait
- keywords: exactly 10 high-value, lowercase, relevant search keywords a patient would type into Google when researching this topic in India

Return ONLY valid JSON, no explanation, no markdown:
{"title": "...", "description": "...", "keywords": ["kw1","kw2","kw3","kw4","kw5","kw6","kw7","kw8","kw9","kw10"]}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 400, responseMimeType: 'application/json' },
      }),
    }
  );

  if (!res.ok) {
    console.error('[Gemini] Story SEO keywords API error', res.status, (await res.text().catch(() => '')).slice(0, 300));
    return null;
  }

  const json = await res.json();
  const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.title === 'string' && typeof parsed.description === 'string' && Array.isArray(parsed.keywords)) {
      return {
        title: parsed.title.slice(0, 70),
        description: parsed.description.slice(0, 180),
        keywords: parsed.keywords.slice(0, 12).map(String),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const denied = await requirePermission('stories', 'full');
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const { title, template: storyType, description } = body as { title?: string; template?: string; description?: string };

  if (!title?.trim()) {
    return NextResponse.json({ success: false, message: 'title is required' }, { status: 400 });
  }
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ success: false, needsSetup: true, message: 'GEMINI_API_KEY not set in .env.local' }, { status: 503 });
  }

  const result = await callGemini(title.trim(), storyType || '', description || '');
  if (!result) {
    return NextResponse.json({ success: false, message: 'Gemini did not return valid SEO metadata. Try again.' }, { status: 502 });
  }

  return NextResponse.json({ success: true, ...result });
}
