import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/app/lib/adminAuth';
import { callGeminiText } from '@/app/lib/ai/gemini';
import { connectDB } from '@/app/lib/mongodb';
import { getSettings } from '@/app/models/Settings';

export const dynamic = 'force-dynamic';

// Mirrors app/api/admin/blog/[id]/seo-keywords/route.ts verbatim (same
// model, same JSON contract) with a video-flavored prompt.
async function callGemini(title: string, category: string, existingDescription: string) {
  if (!process.env.GEMINI_API_KEY) return null;

  const prompt = `You are a senior SEO strategist for DR Youth Clinic, a premium aesthetic dermatology clinic in India competing with top clinics like Oliva Clinic, Kaya Clinic, and Dermacos.

Video title: "${title}"
Video category: ${category || 'General'}
${existingDescription ? `Current description: "${existingDescription}"` : ''}

Write SEO metadata for this educational video's page in the clinic's Video Academy:
- title: an SEO meta title under 60 characters, informative, include the core topic. Do NOT include "DR Youth Clinic" — the site automatically appends " | DR Youth Clinic" to every page title, so adding it yourself would duplicate it.
- description: a meta description under 155 characters, accurate and compelling, no clickbait
- keywords: exactly 12 high-value, lowercase, comma-relevant search keywords a patient would type into Google when researching this topic in India (mix of short "head" terms and longer "long-tail" phrases, no duplicates)

Return ONLY valid JSON, no explanation, no markdown:
{"title": "...", "description": "...", "keywords": ["kw1","kw2","kw3","kw4","kw5","kw6","kw7","kw8","kw9","kw10","kw11","kw12"]}`;

  try {
    const raw = await callGeminiText(prompt, { temperature: 0.4, maxTokens: 500, jsonMode: true, cacheKey: 'seo-keywords:video' });
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

export async function POST(req: NextRequest) {
  const denied = await requirePermission('videos', 'full');
  if (denied) return denied;

  await connectDB();
  const settings = await getSettings();
  if (!settings.videoAI?.generateSeoEnabled) {
    return NextResponse.json({ success: false, message: 'AI SEO generation is turned off for videos — enable it in Settings → Video AI.' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { title, template: category, description } = body as { title?: string; template?: string; description?: string };

  if (!title?.trim()) {
    return NextResponse.json({ success: false, message: 'title is required' }, { status: 400 });
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
