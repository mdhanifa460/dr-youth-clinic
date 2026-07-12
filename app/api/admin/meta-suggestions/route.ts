import { NextResponse } from 'next/server';
import { requirePermission } from '@/app/lib/adminAuth';
import { connectDB } from '@/app/lib/mongodb';
import { MetaSuggestionCache } from '@/app/models/MetaSuggestionCache';

export const dynamic = 'force-dynamic';

function makeCacheKey(name: string, category: string, location: string) {
  return `${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}_${category.toLowerCase()}_${location.toLowerCase()}`;
}

// ── Gemini REST call (no SDK dependency) ─────────────────────────────────────
async function callGemini(serviceName: string, category: string, city: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const isAllLocations = city === 'All';
  // An 'all'-location service is the SAME document rendered at every city's
  // URL — a title naming one city would be wrong on the other 3 city pages,
  // so this is a hard constraint, not a style preference.
  const locationBlock = isAllLocations
    ? `This service is offered at every DR Youth Clinic location across India (Chennai, Bangalore, Coimbatore, Kochi) — the same title and description will be reused across all 4 city pages, so do NOT name a specific city.`
    : `City: ${city}, India — this page is specific to the ${city} clinic, so you may reference ${city} directly.`;

  const prompt = `You are a senior SEO copywriter for DR Youth Clinic, a premium aesthetic dermatology clinic in India competing with top clinics like Oliva Clinic, Kaya Clinic, and Dermacos.

Service: "${serviceName}"
Category: ${category} treatment
${locationBlock}

Real competitor title patterns that already rank well in this market (use as a quality bar, do not copy verbatim):
- "PRP Hair Treatment In Chennai: Cost, Procedure, Results & Reviews" (Oliva Clinic, city-specific page)
- "PRP Hair Treatment: Results, Reviews, Benefits & Procedure" (Oliva Clinic, non-city page)
- "Acne Scar Treatment | Laser, Subcision & Dermaroller for Acne Scars – Kaya Clinic"
Note what makes these work: they front-load the service name, list concrete value terms (Cost, Results, Reviews, Procedure, Benefits) rather than vague adjectives, and keep calls-to-action ("book now") out of the title — that belongs in the description instead.

Generate 3 distinct (title, description) pairs for this service's page <title> and meta description tags. Vary the angle across the 3: one led by results/outcomes, one by expertise/technology, one by cost/value.

Rules:
- Title: 50-60 characters including " | DR Youth Clinic" at the end. Front-load the service name. ${isAllLocations ? 'Must NOT contain any specific city name.' : `May include "In ${city}"`}. Include 1-2 concrete value terms (Cost, Results, Reviews, Procedure, Benefits) where natural — not generic adjectives like "best" or "premium".
- Description: 140-160 characters. One concrete trust/value hook (real credential, technology, or outcome — not a vague claim), ending with an implicit call to action. ${isAllLocations ? 'Must NOT contain any specific city name — may say "at every DR Youth Clinic location" or "across India" if useful.' : `May naturally reference ${city}.`}
- No clickbait, no exclamation marks, no ALL CAPS, no unverifiable superlatives ("India's #1", "world's best").

Return ONLY valid JSON, no explanation, no markdown:
{
  "options": [
    {"title": "...", "description": "..."},
    {"title": "...", "description": "..."},
    {"title": "...", "description": "..."}
  ]
}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
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
    console.error('[Gemini] meta-suggestions API error', res.status, errText.slice(0, 300));
    return null;
  }

  const json = await res.json();
  const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.options)) return null;
    const options = parsed.options
      .filter((o: any) => o?.title && o?.description)
      .slice(0, 3)
      .map((o: any) => ({ title: String(o.title).slice(0, 60), description: String(o.description).slice(0, 160) }));
    return options.length > 0 ? options : null;
  } catch {
    return null;
  }
}

// ── POST /api/admin/meta-suggestions ─────────────────────────────────────
export async function POST(req: Request) {
  const denied = await requirePermission('seo', 'view');
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const { serviceName, category, location } = body;

  if (!serviceName?.trim() || !category || !location) {
    return NextResponse.json(
      { success: false, message: 'serviceName, category, and location are required' },
      { status: 400 }
    );
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { success: false, needsSetup: true, message: 'GEMINI_API_KEY not set in .env.local' },
      { status: 503 }
    );
  }

  await connectDB();

  const cacheKey = makeCacheKey(serviceName, category, location);

  const cached = await MetaSuggestionCache.findOne({ cacheKey } as any).lean() as any;
  if (cached) {
    return NextResponse.json({ success: true, fromCache: true, options: cached.options });
  }

  const city = location.toLowerCase() === 'all' ? 'All' : location.charAt(0).toUpperCase() + location.slice(1);
  const options = await callGemini(serviceName.trim(), category, city);

  if (!options) {
    return NextResponse.json(
      { success: false, message: 'Gemini did not return valid suggestions. Try again.' },
      { status: 502 }
    );
  }

  await MetaSuggestionCache.create({
    cacheKey,
    serviceName: serviceName.trim(),
    category,
    location: location.toLowerCase(),
    options,
  });

  return NextResponse.json({ success: true, fromCache: false, options });
}
