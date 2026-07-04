import { NextResponse } from 'next/server';
import { getAdminSession } from '@/app/lib/adminAuth';
import { connectDB } from '@/app/lib/mongodb';
import { KeywordCache } from '@/app/models/KeywordCache';

export const dynamic = 'force-dynamic';

// Deterministic cache key — same service/category/city always hits same cache entry
function makeCacheKey(name: string, category: string, location: string) {
  return `${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}_${category.toLowerCase()}_${location.toLowerCase()}`;
}

// ── Gemini REST call (no SDK dependency) ─────────────────────────────────────
async function callGemini(serviceName: string, category: string, city: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = `You are a senior SEO strategist for DR Youth Clinic, a premium aesthetic dermatology clinic in India competing with top clinics like Oliva Clinic, Kaya Clinic, and Dermacos.

New service: "${serviceName}"
Category: ${category} treatment
City: ${city}, India

Generate 18 high-value keywords — exactly 6 per intent type — that will help this service outrank competitor clinics and appear in AI-generated health content.

Think like this:
- SEO: What do patients in ${city} actually type into Google when ready to book "${serviceName}"? Include city name in at least 2.
- GEO: What comparative/authoritative phrases would Perplexity, ChatGPT, or Gemini synthesise when asked about this treatment? ("best X for Y", "top rated X in ${city}", "most effective treatment for Z")
- AEO: What direct-answer questions would patients ask Alexa, Siri, or Google Answer Box? Must start with what/how/which/why/is/can.

Return ONLY valid JSON, no explanation, no markdown:
{
  "seo": ["kw1","kw2","kw3","kw4","kw5","kw6"],
  "geo": ["kw1","kw2","kw3","kw4","kw5","kw6"],
  "aeo": ["kw1","kw2","kw3","kw4","kw5","kw6"]
}

Rules: all lowercase, no duplicates, specific not generic, commercially relevant.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,       // low temp = consistent, repeatable keyword output
          maxOutputTokens: 400,   // 18 short keywords fit well under 300 tokens
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('[Gemini] API error', res.status, errText.slice(0, 300));
    return null;
  }

  const json = await res.json();
  const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    // Validate shape — must have seo/geo/aeo arrays
    if (
      Array.isArray(parsed.seo) &&
      Array.isArray(parsed.geo) &&
      Array.isArray(parsed.aeo)
    ) {
      return {
        seo: parsed.seo.slice(0, 6).map(String),
        geo: parsed.geo.slice(0, 6).map(String),
        aeo: parsed.aeo.slice(0, 6).map(String),
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ── POST /api/admin/keyword-suggestions ─────────────────────────────────────
export async function POST(req: Request) {
  // Admin-only
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorised' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { serviceName, category, location } = body;

  if (!serviceName?.trim() || !category || !location) {
    return NextResponse.json(
      { success: false, message: 'serviceName, category, and location are required' },
      { status: 400 }
    );
  }

  // No Gemini key configured?
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { success: false, needsSetup: true, message: 'GEMINI_API_KEY not set in .env.local' },
      { status: 503 }
    );
  }

  await connectDB();

  const cacheKey = makeCacheKey(serviceName, category, location);

  // ── 1. Check MongoDB cache first — if hit, zero Gemini cost ──────────────
  const cached = await KeywordCache.findOne({ cacheKey } as any).lean() as any;
  if (cached) {
    return NextResponse.json({
      success: true,
      fromCache: true,
      keywords: cached.keywords,
    });
  }

  // ── 2. Cache miss → call Gemini ───────────────────────────────────────────
  const city = location.charAt(0).toUpperCase() + location.slice(1);
  const keywords = await callGemini(serviceName.trim(), category, city);

  if (!keywords) {
    return NextResponse.json(
      { success: false, message: 'Gemini did not return valid keywords. Try again.' },
      { status: 502 }
    );
  }

  // ── 3. Persist to MongoDB (TTL = 30 days) ─────────────────────────────────
  await KeywordCache.create({
    cacheKey,
    serviceName: serviceName.trim(),
    category,
    location: location.toLowerCase(),
    keywords,
  });

  return NextResponse.json({ success: true, fromCache: false, keywords });
}
