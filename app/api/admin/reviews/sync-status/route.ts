import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { GoogleReviewSyncState } from '@/app/models/GoogleReviewSyncState';
import { requirePermission } from '@/app/lib/adminAuth';

// Read-only — lets the admin Reviews page show "Last Google Sync: …" on
// page load, not just immediately after clicking Sync in the current
// browser session.
export async function GET() {
  const denied = await requirePermission('reviews', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const state = await (GoogleReviewSyncState as any).findOne({}).lean();
    return NextResponse.json({ success: true, state: state || null });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
