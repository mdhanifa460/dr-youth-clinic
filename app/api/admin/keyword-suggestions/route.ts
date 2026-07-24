import { NextResponse } from 'next/server';
import { requirePermission } from '@/app/lib/adminAuth';
import { connectDB } from '@/app/lib/mongodb';
import { KeywordCache } from '@/app/models/KeywordCache';
import { callGeminiText } from '@/app/lib/ai/gemini';

export const dynamic = 'force-dynamic';

// Deterministic cache key — same service/category/city always hits same cache entry
function makeCacheKey(name: string, category: string, location: string) {
  return `${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}_${category.toLowerCase()}_${location.toLowerCase()}`;
}

const ALL_CITIES = ['Chennai', 'Bangalore', 'Coimbatore', 'Kochi'];

// ── Gemini REST call (no SDK dependency) ─────────────────────────────────────
async function callGemini(serviceName: string, category: string, city: string) {
  if (!process.env.GEMINI_API_KEY) return null;

  // 'all' means this service is genuinely offered at every clinic — the SEO
  // keywords should spread real city-tagged search queries across all 4
  // cities (each is a distinct search a patient in that city actually
  // types), not default to one city or drop city-intent entirely.
  const isAllLocations = city === 'All';
  const locationBlock = isAllLocations
    ? `Cities: this service is offered at every DR Youth Clinic location — ${ALL_CITIES.join(', ')}, India. Spread city-tagged keywords across multiple of these cities rather than favouring one.`
    : `City: ${city}, India`;

  const prompt = `You are a senior SEO strategist for DR Youth Clinic, a premium aesthetic dermatology clinic in India competing with top clinics like Oliva Clinic, Kaya Clinic, and Dermacos.

New service: "${serviceName}"
Category: ${category} treatment
${locationBlock}

Real competitor pages that already rank well for this kind of service use titles like "PRP Hair Treatment In Chennai: Cost, Procedure, Results & Reviews" (city page) and "PRP Hair Treatment: Results, Reviews, Benefits & Procedure" (non-city page) — notice "Cost" and "Results" are consistently high-value terms in this market. Use that as a quality bar, not something to copy.

Generate 18 high-value keywords — exactly 6 per intent type — that will help this service outrank competitor clinics and appear in AI-generated health content.

Think like this:
- SEO: What do patients actually type into Google when ready to book "${serviceName}"? Cost/price-related queries convert heavily in this market — include at least 1. ${isAllLocations ? `Include city-tagged variants for at least 3 different cities from the list above (e.g. "${serviceName.toLowerCase()} cost in chennai", "${serviceName.toLowerCase()} bangalore"), plus 1-2 city-agnostic ones ("near me", "in india").` : `Include "${city}" in at least 2.`}
- GEO: What comparative/authoritative phrases would Perplexity, ChatGPT, or Gemini synthesise when asked about this treatment? ("best X for Y", "${isAllLocations ? 'top rated X in india' : `top rated X in ${city}`}", "most effective treatment for Z")
- AEO: What direct-answer questions would patients ask Alexa, Siri, or Google Answer Box? Must start with what/how/which/why/is/can.

Return ONLY valid JSON, no explanation, no markdown:
{
  "seo": ["kw1","kw2","kw3","kw4","kw5","kw6"],
  "geo": ["kw1","kw2","kw3","kw4","kw5","kw6"],
  "aeo": ["kw1","kw2","kw3","kw4","kw5","kw6"]
}

Rules: all lowercase, no duplicates, specific not generic, commercially relevant.`;

  try {
    // low temp = consistent, repeatable keyword output; 18 short keywords
    // fit well under 300 tokens.
    const raw = await callGeminiText(prompt, { temperature: 0.3, maxTokens: 400, jsonMode: true });
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
