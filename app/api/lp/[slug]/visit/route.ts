import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { LandingPage } from '@/app/models/LandingPage';

export const dynamic = 'force-dynamic';

// Public endpoint — no auth required. Increments visitor count only.
export async function POST(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    await connectDB();
    await (LandingPage as any).findOneAndUpdate(
      { slug: params.slug, status: 'published' },
      { $inc: { 'analytics.visitors': 1 } }
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
