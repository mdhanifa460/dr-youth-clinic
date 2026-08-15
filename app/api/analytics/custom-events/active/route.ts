import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { connectDB } from "@/app/lib/mongodb";
import { CustomAnalyticsEvent } from "@/app/models/CustomAnalyticsEvent";

// Public, unauthenticated — this is what CustomEventListener.tsx fetches
// once per page load. Deliberately a SEPARATE route from the admin CRUD
// route (app/api/admin/analytics/custom-events/route.ts): no auth needed,
// can cache aggressively, and the projection below never leaks
// createdBy/updatedBy or other admin-only audit fields to the public
// client bundle.
const getCachedActiveEvents = unstable_cache(
  async () => {
    await connectDB();
    return (CustomAnalyticsEvent as any)
      .find({ enabled: true })
      .select("name triggerType elementId pagePath parameters isKeyEvent")
      .lean();
  },
  ["custom-analytics-events-active"],
  { revalidate: 60, tags: ["custom-analytics-events"] }
);

export async function GET() {
  try {
    const events = await getCachedActiveEvents();
    return NextResponse.json({ success: true, data: events });
  } catch {
    // Tracking must never break the page it's mounted on — an empty list
    // just means CustomEventListener attaches nothing this load.
    return NextResponse.json({ success: true, data: [] });
  }
}
