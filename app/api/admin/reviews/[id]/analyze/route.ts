import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import { Review } from '@/app/models/Review';
import { requirePermission } from '@/app/lib/adminAuth';
import { analyzeReview } from '@/app/lib/reviews/analyzeReview';

export const dynamic = 'force-dynamic';

// Admin-triggered only — never automatic, never runs during sync. Writes
// ONLY the aiAnalysis field; reported/reportStatus stay exactly as they
// were, since a suggestion is not a decision (see analyzeReview.ts's own
// comment). Requires the SAME 'reviews':'full' permission every other
// mutating review action already requires — no new permission module.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('reviews', 'full');
  if (denied) return denied;

  await connectDB();
  const review = await (Review as any).findById(params.id).select('rating reviewText').lean();
  if (!review) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });

  const result = await analyzeReview(review.rating, review.reviewText || '');

  const aiAnalysis = { ...result, analyzedAt: new Date() };
  await (Review as any).findByIdAndUpdate(params.id, { $set: { aiAnalysis } });
  revalidateTag('reviews');

  return NextResponse.json({ success: true, aiAnalysis });
}
