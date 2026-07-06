import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/app/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const denied = await requirePermission('intelligence', 'full');
  if (denied) return denied;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, message: 'ANTHROPIC_API_KEY not set' }, { status: 501 });
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

Provide a sharp, clinic-specific BI analysis. Be specific — name services, patient segments, and rupee figures.

Return ONLY valid JSON:
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

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 1800,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic ${res.status}: ${err}`);
    }

    const data    = await res.json();
    const text    = data.content?.[0]?.text || '';
    const match   = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI returned unexpected format');

    const parsed = JSON.parse(match[0]);
    return NextResponse.json({ success: true, ...parsed });

  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
