import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { CustomAnalyticsEventLog } from "@/app/models/CustomAnalyticsEventLog";
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from "@/app/lib/rateLimit";

// Public, unauthenticated, fire-and-forget from CustomEventListener.tsx —
// same "never block the visitor-facing page on an analytics write"
// posture as booking-success-event's and banner-popup-event's routes,
// which this is a direct structural copy of. A failure here never affects
// the actual dataLayer push, which already happened before this call.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`custom-analytics-event-log:${ip}`, 120, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  try {
    const { customEventId, name, params, page } = await req.json();
    if (!customEventId || typeof customEventId !== "string" || !name || typeof name !== "string") {
      return NextResponse.json({ success: false, message: "customEventId and name are required" }, { status: 400 });
    }

    await connectDB();
    await CustomAnalyticsEventLog.create({
      customEventId,
      name: name.slice(0, 100),
      params: params && typeof params === "object" ? params : {},
      page: typeof page === "string" ? page.slice(0, 200) : "",
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Failed to log event" }, { status: 500 });
  }
}
