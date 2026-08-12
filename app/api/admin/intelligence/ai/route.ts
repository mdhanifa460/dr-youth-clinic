import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/app/lib/adminAuth';
import { generateText, getConfiguredProviderEnvKeyName, isConfiguredProviderReady } from '@/app/lib/ai';
import { parseClaudeJson } from '@/app/lib/ai/anthropic';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const denied = await requirePermission('intelligence', 'full');
  if (denied) return denied;

  if (!isConfiguredProviderReady()) {
    return NextResponse.json({ success: false, message: `${getConfiguredProviderEnvKeyName()} not set` }, { status: 501 });
  }

  try {
    const { stats } = await req.json();
    const o = stats?.overview || {};
    const top5 = (stats?.byService || []).slice(0, 5).map((s: any) => `${s.name} (${s.count})`).join(', ');
    const locs = (stats?.byLocation || []).map((l: any) => `${l.location}: ${l.count} bookings`).join(', ');

    const prompt = `You are a senior business advisor for DR Youth Clinic, a premium dermatology and aesthetic clinic chain in India (branches: Chennai, Bangalore, Coimbatore, Kochi).

LIVE BUSINESS DATA:
- Bookings Today / Week / Month / Total: ${o.todayBookings} / ${o.weekBookings} / ${o.monthBookings} / ${o.totalBookings}
- Completion Rate: ${o.conversionRate}%  |  Cancellation Rate: ${o.cancellationRate}%
- Unique Patients: ${o.uniquePatients}  |  Returning: ${o.returningPatients}  |  VIP (3+ visits): ${o.vipPatients}  |  Inactive 90d+: ${o.inactivePatients}
- Estimated Month Revenue: ₹${(o.estimatedMonthRevenue || 0).toLocaleString('en-IN')}
- Growth vs Last Month: ${stats?.forecast?.growthRate ?? 0}%  (${stats?.forecast?.trend ?? 'stable'})
- Avg Google Rating: ${o.avgRating}/5  |  Total Reviews: ${o.totalReviews}
- Active Services: ${o.activeServices}  |  Active Doctors: ${o.activeDoctors}  |  Active Clinics: ${o.activeClinics}
- Top Services: ${top5 || 'no data yet'}
- Clinic Performance: ${locs || 'no location data'}

Provide a sharp, clinic-specific BI analysis. Be specific — name services, patient segments, and rupee figures. Keep every text field SHORT — this is a scannable dashboard card, not a report: "detail"/"action"/"description" max 20 words each (1 sentence), "title" max 8 words, each "steps" entry max 10 words. Being concise here matters more than being exhaustive.

Return ONLY valid JSON, with EXACTLY 3 items in "insights" and EXACTLY 3 items in "recommendations" — no more, no fewer, even if more could be said:
{
  "insights": [
    {"title":"...","detail":"...","trend":"up|down|neutral","metric":"..."},
    {"title":"...","detail":"...","trend":"up|down|neutral","metric":"..."},
    {"title":"...","detail":"...","trend":"up|down|neutral","metric":"..."}
  ],
  "recommendations": [
    {"title":"...","action":"...","expectedImpact":"...","priority":"high|medium|low","timeframe":"..."},
    {"title":"...","action":"...","expectedImpact":"...","priority":"high|medium|low","timeframe":"..."},
    {"title":"...","action":"...","expectedImpact":"...","priority":"high|medium|low","timeframe":"..."}
  ],
  "opportunity": {
    "title":"...",
    "description":"...",
    "steps":["...","...","..."],
    "revenueImpact":"₹X–Y lakhs/month",
    "confidence":"High|Medium|Low"
  }
}`;

    // Cached (10 min) — the prompt encodes the live stats snapshot, so this
    // only actually re-generates when the underlying numbers move; a
    // dashboard refreshed twice in a few minutes reuses the same analysis
    // instead of paying for an effectively-identical one.
    //
    // The real fix for the truncation that caused this is the "keep every
    // field short, exactly 3 items" instruction added to the prompt above
    // plus the defensive .slice(0,3) below — not a bigger token ceiling on
    // its own. This shared http.ts's fetchWithRetry has a 20s timeout per
    // attempt, and a real direct test showed a 2500-token completion
    // taking ~19.6s (~127 tokens/sec for Haiku) — dangerously close to it,
    // so a naive maxTokens bump alone would trade a JSON-truncation bug
    // for a request-timeout bug. A real test also showed Claude ignoring
    // "exactly 3" and returning 5+5 items despite the length cap, so 1800
    // (~14s at that rate) keeps real margin over that observed variance
    // while staying well under the 20s timeout.
    const text = await generateText(prompt, { maxTokens: 1800, cacheKey: "admin:intelligence-ai", cacheTtlSeconds: 600 });
    // parseClaudeJson strips ```json fences, repairs the "raw control
    // character inside a string" quirk (a real, observed failure mode —
    // Claude emitting a literal newline instead of "\n" inside a "detail"
    // field), and throws a clean "please try again" message instead of a
    // raw parser SyntaxError for anything it can't recover — same shared,
    // hardened parser every other AI-JSON route in this codebase uses now.
    const parsed: any = parseClaudeJson(text);
    // Defensive bound regardless of prompt compliance — a real test run
    // returned 5 insights/5 recommendations despite the prompt explicitly
    // asking for exactly 3, which is exactly the kind of unpredictable
    // response size that pushed a real request past maxTokens and into
    // the truncated-JSON bug in the first place.
    if (Array.isArray(parsed?.insights)) parsed.insights = parsed.insights.slice(0, 3);
    if (Array.isArray(parsed?.recommendations)) parsed.recommendations = parsed.recommendations.slice(0, 3);
    return NextResponse.json({ success: true, ...parsed });

  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'AI generation failed — please try again.' }, { status: 500 });
  }
}
