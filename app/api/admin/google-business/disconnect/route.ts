import { NextResponse } from 'next/server';
import { requirePermission } from '@/app/lib/adminAuth';
import { disconnectBusinessProfile } from '@/app/lib/google/businessProfileOAuth';

export const dynamic = 'force-dynamic';

// Removes the Google connection. Reviews already imported stay as they are.
export async function POST() {
  const denied = await requirePermission('reviews', 'full');
  if (denied) return denied;
  try {
    await disconnectBusinessProfile();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, message: 'Could not disconnect.' }, { status: 500 });
  }
}
