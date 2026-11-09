import { NextResponse } from 'next/server';
import { requirePermission } from '@/app/lib/adminAuth';
import { connectDB } from '@/app/lib/mongodb';
import { GoogleReviewSyncState } from '@/app/models/GoogleReviewSyncState';
import { getBusinessCredentialSummary, isBusinessOAuthConfigured } from '@/app/lib/google/businessProfileOAuth';

export const dynamic = 'force-dynamic';

// Connection status for the Admin → Reviews panel. Never returns tokens.
export async function GET() {
  const denied = await requirePermission('reviews', 'view');
  if (denied) return denied;
  try {
    await connectDB();
    const [summary, state] = await Promise.all([
      getBusinessCredentialSummary(),
      (GoogleReviewSyncState as any).findOne({}).lean(),
    ]);
    return NextResponse.json({
      success: true,
      configured: isBusinessOAuthConfigured(),
      connected: summary.connected,
      connectedByEmail: summary.connectedByEmail,
      connectedAt: summary.connectedAt,
      locations: state?.businessLocations || [],
      lastSyncAt: state?.lastSyncAt || null,
      lastSyncStatus: state?.lastSyncStatus || null,
      lastSyncCounts: state?.lastSyncCounts || null,
      lastSyncError: state?.lastSyncError || '',
      lastSyncSource: state?.lastSyncSource || null,
    });
  } catch (err) {
    console.error('[google-business] status failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, message: 'Could not check the Google connection.' }, { status: 500 });
  }
}
