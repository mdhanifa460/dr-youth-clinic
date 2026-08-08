import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import Connector from "@/app/models/Connector";
import Booking from "@/app/models/Booking";
import { CRMConnector } from "@/app/lib/crm/CRMConnector";
import { runCrmSync } from "@/app/lib/crm/sync";
import { pushBookingToCrm } from "@/app/lib/crm/pushBooking";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// vercel.json schedules this every 15 minutes, same cadence as the existing
// notification dispatcher. Each tick does two things, independently of
// each other so one failing never blocks the other:
//   1. PULL — doctors + branches, but only once config.pullIntervalMin has
//      actually elapsed since the last sync (default matches the cron
//      cadence, but an admin can widen it without a second cron entry).
//   2. PUSH retry sweep — any Booking still pendingSync:true (a website
//      lead/booking whose initial push failed, or was created before a
//      CRM connector existed) gets one more attempt, capped at
//      config.retryCount so a permanently-rejecting record doesn't get
//      hammered forever.
function isAuthorizedCronRequest(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const connectorDoc = await (Connector as any).findOne({ type: "crm", status: "active" }).lean();
  if (!connectorDoc) {
    return NextResponse.json({ success: true, message: "No active CRM connector — nothing to do." });
  }

  const connector = await CRMConnector.loadActive();
  if (!connector) {
    return NextResponse.json({ success: true, message: "No active CRM connector — nothing to do." });
  }

  const result: { pulled: boolean; pullSummary?: unknown; pushed: number } = { pulled: false, pushed: 0 };

  // 1. Scheduled PULL, respecting the configured interval.
  const nextSyncAt: Date | null = connectorDoc.health?.nextSyncAt || null;
  const dueForPull = !nextSyncAt || new Date() >= new Date(nextSyncAt);
  if (dueForPull) {
    try {
      const summary = await runCrmSync(connector, "scheduled");
      const pullIntervalMin = connectorDoc.config?.pullIntervalMin || 15;
      await (Connector as any).findByIdAndUpdate(connectorDoc._id, {
        "health.lastSyncAt": new Date(),
        "health.nextSyncAt": new Date(Date.now() + pullIntervalMin * 60 * 1000),
      });
      result.pulled = true;
      result.pullSummary = summary;
    } catch (e: any) {
      result.pullSummary = { error: e?.message || "Pull sync failed" };
    }
  }

  // 2. PUSH retry sweep — bounded to a 7-day window and a 25-item batch so
  // this stays fast and never becomes an unbounded backlog processor.
  const retryCount = connectorDoc.config?.retryCount ?? 3;
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const pending = await (Booking as any)
    .find({ pendingSync: true, syncAttempts: { $lt: retryCount }, createdAt: { $gte: sevenDaysAgo } })
    .limit(25)
    .lean();

  for (const booking of pending) {
    await pushBookingToCrm(booking);
    result.pushed++;
  }

  return NextResponse.json({ success: true, ...result });
}
