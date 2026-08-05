import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { getJourneyConfig } from "@/app/models/JourneyConfig";
import { resolveDoctorsForGoal } from "@/app/lib/journeyGoals.server";
import { locations } from "@/app/data/locations";
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from "@/app/lib/rateLimit";

// Public, unauthenticated — re-narrows the AI Beauty Journey's doctor list
// once the client knows the visitor's clinic (see useClinicLocation in
// PlanMyJourneyClient.tsx). The initial server render (page.tsx) resolves
// an unfiltered, wider doctor pool per goal since it doesn't yet know the
// visitor's location; this route applies the same location filter the
// rest of the site already uses (getLocationDoctors, the service detail
// page's doctor lookup) once that's known, without re-rendering the page.
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`journey-doctors:${ip}`, 30, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  const goalSlug = req.nextUrl.searchParams.get("goal") || "";
  const location = req.nextUrl.searchParams.get("location") || "";

  if (!goalSlug) {
    return NextResponse.json({ success: false, message: "goal is required" }, { status: 400 });
  }
  // Only accept a real, known clinic slug — anything else is treated as
  // "no location known" rather than passed through to the query.
  const validLocation = Object.keys(locations).includes(location) ? location : undefined;

  try {
    await connectDB();
    const config = await getJourneyConfig();
    const meta = config.goals.find((g) => g.slug === goalSlug && g.enabled);
    if (!meta) {
      return NextResponse.json({ success: false, message: "Unknown or disabled goal" }, { status: 404 });
    }

    const doctors = await resolveDoctorsForGoal(meta, validLocation);
    return NextResponse.json({ success: true, data: doctors });
  } catch {
    return NextResponse.json({ success: false, message: "Failed to load doctors" }, { status: 500 });
  }
}
