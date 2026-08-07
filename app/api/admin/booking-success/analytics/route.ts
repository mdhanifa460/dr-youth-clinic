import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { BookingSuccessEvent } from '@/app/models/BookingSuccessEvent';
import { requirePermission } from '@/app/lib/adminAuth';

// Aggregate counts per event type, all-time — shown as a small stats row
// in the admin CMS editor (app/admin/booking-success) so "Track analytics"
// is something an admin can actually see in-app, not just a pixel fired
// into an external dashboard they'd have to go dig through separately.
export async function GET() {
  const denied = await requirePermission('booking-success', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const rows = await (BookingSuccessEvent as any).aggregate([
      { $group: { _id: '$eventType', count: { $sum: 1 } } },
    ]);
    const counts: Record<string, number> = {};
    for (const row of rows) counts[row._id] = row.count;
    return NextResponse.json({ success: true, data: counts });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to fetch analytics' }, { status: 500 });
  }
}
