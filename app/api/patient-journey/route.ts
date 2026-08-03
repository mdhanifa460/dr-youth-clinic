import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { PatientJourney } from "@/app/models/PatientJourney";
import { checkRateLimit, getClientIp, tooManyRequestsResponse } from "@/app/lib/rateLimit";

// Public, unauthenticated — persists progress through the AI Beauty
// Journey (app/(public)/plan-my-journey/) as the visitor moves through
// modules, keyed by the client-generated sessionId already used for
// assessment analytics (see getOrCreateSessionId in assessmentFlow.ts).
// Upserts rather than requiring a separate "create" call: the first save
// for a session (typically right after Photo Capture) creates the
// document, every save after that just updates it — one endpoint for the
// whole journey's lifetime, same shape as how /api/leads is PATCHed
// incrementally as Plan My Journey collects more information.
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await checkRateLimit(`patient-journey:${ip}`, 60, 60 * 60 * 1000);
  if (!rl.allowed) return tooManyRequestsResponse(rl.resetAt);

  try {
    await connectDB();
    const { sessionId, goal, ...patch } = await req.json();

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ success: false, message: "sessionId is required" }, { status: 400 });
    }
    if (!goal && !(await (PatientJourney as any).exists({ sessionId, status: "in_progress" }))) {
      return NextResponse.json({ success: false, message: "goal is required to start a journey" }, { status: 400 });
    }

    const doc = await (PatientJourney as any).findOneAndUpdate(
      { sessionId, status: "in_progress" },
      { $set: { ...(goal ? { goal } : {}), ...patch } },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );

    return NextResponse.json({ success: true, data: { id: doc._id } });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Failed to save journey progress" }, { status: 500 });
  }
}
