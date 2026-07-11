import { NextResponse } from 'next/server';
import { requirePermission } from '@/app/lib/adminAuth';
import { getSettings } from '@/app/models/Settings';
import { getTodayBookingStats } from '@/app/lib/bookingStats';

export const dynamic = 'force-dynamic';

// No "Revenue" or "Visitors" metric here.
// Revenue: Booking.service only ever stores the coarse category
// ('Skin'|'Hair'|'Laser'|'Other' — see app/(public)/book/Form.tsx), never a
// specific treatment, so there is no reliable way to look up a price per
// booking. A revenue figure computed from this field would be fabricated
// (in fact, the existing Intelligence dashboard's revenue numbers have this
// same flaw — a separate, pre-existing issue, not fixed here).
// Visitors: no server-side web-analytics data source exists in this
// codebase (GA4 is a client-side tracking script only).
// "Today's Completed" and "Pending Leads" are the real, accurate substitutes.
export async function GET() {
  const denied = await requirePermission('dashboard', 'view');
  if (denied) return denied;

  try {
    const settings = await getSettings();
    // Any Settings document that predates this field (i.e. every existing
    // installation) has adminUi === undefined — that must mean "enabled"
    // (the schema default), not "disabled". Only an explicit false disables.
    if (settings.adminUi?.analyticsStripEnabled === false) {
      return NextResponse.json({ enabled: false });
    }

    const { todayBookings, todayLeads, pendingLeads, todayCompleted } = await getTodayBookingStats();

    return NextResponse.json({ enabled: true, todayLeads, todayCompleted, todayBookings, pendingLeads });
  } catch {
    return NextResponse.json({ enabled: false });
  }
}
