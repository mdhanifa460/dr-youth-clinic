import { NextResponse } from 'next/server';
import { requirePermission } from '@/app/lib/adminAuth';
import { connectDB } from '@/app/lib/mongodb';
import { MetaSuggestionCache } from '@/app/models/MetaSuggestionCache';
import { callGeminiText } from '@/app/lib/ai/gemini';

export const dynamic = 'force-dynamic';

function makeCacheKey(name: string, category: string, location: string) {
  return `${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}_${category.toLowerCase()}_${location.toLowerCase()}`;
}

// ── Gemini REST call (no SDK dependency) ─────────────────────────────────────
async function callGemini(serviceName: string, category: string, city: string) {
  if (!process.env.GEMINI_API_KEY) return null;

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
- Title: 30-42 characters. Do NOT include "DR Youth Clinic" or "| DR Youth Clinic" — the site automatically appends " | DR Youth Clinic" to every page title, so adding it yourself would duplicate it. Front-load the service name. ${isAllLocations ? 'Must NOT contain any specific city name.' : `May include "In ${city}"`}. Include 1-2 concrete value terms (Cost, Results, Reviews, Procedure, Benefits) where natural — not generic adjectives like "best" or "premium".
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

  try {
    const raw = await callGeminiText(prompt, { temperature: 0.4, maxTokens: 500, jsonMode: true });
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

// ── City home page (/chennai etc.) — Admin → Locations → SEO ─────────────────
const CITY_PAGE_CITIES = ['chennai', 'bangalore', 'coimbatore', 'kochi'];

function cleanList(v: unknown, max: number, len: number): string[] {
  return Array.isArray(v)
    ? v.map((s) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, len)).filter(Boolean).slice(0, max)
    : [];
}

async function callGeminiCityPage(city: string, specialties: string[], about: string) {
  const prompt = `You are a senior local-SEO copywriter for DR Youth Clinic, a dermatology and aesthetic clinic chain in India competing with Oliva Clinic, Kaya Clinic and Dermacos.

Page: the ${city} branch home page — the page that should rank for searches like "skin clinic in ${city}", "dermatologist in ${city}", "hair treatment ${city}".
Treatments this branch offers: ${specialties.length ? specialties.join(', ') : 'skin, hair and laser treatments'}.
${about ? `About this branch (from the clinic's own text): ${about}` : ''}

Generate 3 distinct (title, description) pairs for this page's <title> and meta description. Vary the angle: one led by the treatments offered, one by doctor-led expertise, one by local convenience (area, booking).

Rules:
- Title: 35-55 characters. Must contain "${city}". Do NOT include "DR Youth Clinic" — the site appends " | DR Youth Clinic" itself. Lead with what people search for (e.g. "Skin & Hair Clinic in ${city}").
- Description: 140-160 characters. Name 2-3 real treatments from the list above, one concrete trust hook taken only from the text above (never invent credentials, years, ratings or prices), and end with an implicit call to action.
- No clickbait, no exclamation marks, no ALL CAPS, no unverifiable superlatives ("best", "#1", "top-rated").

Return ONLY valid JSON, no explanation, no markdown:
{"options":[{"title":"...","description":"..."},{"title":"...","description":"..."},{"title":"...","description":"..."}]}`;

  try {
    const raw = await callGeminiText(prompt, { temperature: 0.5, maxTokens: 600, jsonMode: true });
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

async function cityPageSuggestions(body: any) {
  const location = String(body.location || '').toLowerCase();
  if (!CITY_PAGE_CITIES.includes(location)) {
    return NextResponse.json({ success: false, message: 'Unknown city' }, { status: 400 });
  }
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { success: false, needsSetup: true, message: 'GEMINI_API_KEY not set in .env.local' },
      { status: 503 }
    );
  }
  await connectDB();
  const cacheKey = `citypage_${location}`;
  // "Regenerate" asks for fresh ideas; the first click reuses the last set.
  if (!body.refresh) {
    const cached = await MetaSuggestionCache.findOne({ cacheKey } as any).lean() as any;
    if (cached) return NextResponse.json({ success: true, fromCache: true, options: cached.options });
  }
  const city = location.charAt(0).toUpperCase() + location.slice(1);
  const about = String(body.about ?? '').replace(/\s+/g, ' ').trim().slice(0, 400);
  const options = await callGeminiCityPage(city, cleanList(body.specialties, 10, 40), about);
  if (!options) {
    return NextResponse.json({ success: false, message: 'Gemini did not return valid suggestions. Try again.' }, { status: 502 });
  }
  await (MetaSuggestionCache as any).findOneAndUpdate(
    { cacheKey },
    { $set: { cacheKey, serviceName: `${city} city page`, category: 'location-page', location, options, createdAt: new Date() } },
    { upsert: true }
  );
  return NextResponse.json({ success: true, fromCache: false, options });
}

// ── POST /api/admin/meta-suggestions ─────────────────────────────────────
export async function POST(req: Request) {
  const denied = await requirePermission('seo', 'view');
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  if (body.pageType === 'location') return cityPageSuggestions(body);
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
