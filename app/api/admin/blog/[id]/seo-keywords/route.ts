import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/app/lib/adminAuth';

export const dynamic = 'force-dynamic';

// Mirrors app/api/admin/landing-pages/[id]/seo-keywords/route.ts's Gemini
// call verbatim (same model, same JSON contract) with a blog-flavored
// prompt — kept as a sibling route rather than generalizing the landing-page
// one, matching this codebase's "one route per surface" convention.
async function callGemini(title: string, category: string, existingDescription: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = `You are a senior SEO strategist for DR Youth Clinic, a premium aesthetic dermatology clinic in India competing with top clinics like Oliva Clinic, Kaya Clinic, and Dermacos.

Blog article title: "${title}"
Article category: ${category || 'General'}
${existingDescription ? `Current description: "${existingDescription}"` : ''}

Write SEO metadata for this Medical Knowledge Center article:
- title: an SEO meta title under 60 characters, informative, include the core topic
- description: a meta description under 155 characters, accurate and compelling, no clickbait
- keywords: exactly 12 high-value, lowercase, comma-relevant search keywords a patient would type into Google when researching this topic in India (mix of short "head" terms and longer "long-tail" phrases, no duplicates)

Return ONLY valid JSON, no explanation, no markdown:
{"title": "...", "description": "...", "keywords": ["kw1","kw2","kw3","kw4","kw5","kw6","kw7","kw8","kw9","kw10","kw11","kw12"]}`;

  const res = await fetch(
    // gemini-2.5-flash-lite 404s as "no longer available to new users" on
    // current API keys — switched to the alias verified working live.
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 500,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('[Gemini] Blog SEO keywords API error', res.status, errText.slice(0, 300));
    return null;
  }

  const json = await res.json();
  const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed.title === 'string' &&
      typeof parsed.description === 'string' &&
      Array.isArray(parsed.keywords)
    ) {
      return {
        title: parsed.title.slice(0, 70),
        description: parsed.description.slice(0, 180),
        keywords: parsed.keywords.slice(0, 15).map(String),
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ── POST /api/admin/blog/[id]/seo-keywords ──────────────────────────────────
// `params.id` is unused (matches the landing-pages sibling route) — an
// unsaved new post has no id yet, so BlogForm calls this with a placeholder
// path segment and it still works.
export async function POST(req: NextRequest) {
  const denied = await requirePermission('blog', 'full');
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  // SeoAiAssistant.tsx (shared with the landing-pages SEO panel) always POSTs
  // its `template` prop under the key "template" — read that key here too,
  // even though this route's own concept is "category", or the category
  // BlogForm passes in never actually reaches this route.
  const { title, template: category, description } = body as { title?: string; template?: string; description?: string };

  if (!title?.trim()) {
    return NextResponse.json(
      { success: false, message: 'title is required' },
      { status: 400 }
    );
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { success: false, needsSetup: true, message: 'GEMINI_API_KEY not set in .env.local' },
      { status: 503 }
    );
  }

  const result = await callGemini(title.trim(), category || '', description || '');

  if (!result) {
    return NextResponse.json(
      { success: false, message: 'Gemini did not return valid SEO metadata. Try again.' },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true, ...result });
}
