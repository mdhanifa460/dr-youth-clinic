import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import { AssessmentEvent } from "@/app/models/AssessmentEvent";
import { Lead } from "@/app/models/Lead";
import Booking from "@/app/models/Booking";

export async function GET() {
  const denied = await requirePermission("ai-assessment", "view");
  if (denied) return denied;

  try {
    await connectDB();

    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [started, completed, leads, bookingPhones] = await Promise.all([
      AssessmentEvent.countDocuments({ event: "started", createdAt: { $gte: since30d } } as any),
      AssessmentEvent.countDocuments({ event: "completed", createdAt: { $gte: since30d } } as any),
      Lead.find({ createdAt: { $gte: since30d } } as any).select("phone primaryConcern recommendations campaign qrSource createdAt").lean() as Promise<any[]>,
      (Booking as any).distinct("phone"),
    ]);

    const bookingPhoneSet = new Set((bookingPhones as string[]).filter(Boolean));
    const convertedLeads = leads.filter((l) => l.phone && bookingPhoneSet.has(l.phone));

    // Most common concern — across all leads
    const concernCounts: Record<string, number> = {};
    for (const l of leads) {
      if (!l.primaryConcern) continue;
      concernCounts[l.primaryConcern] = (concernCounts[l.primaryConcern] || 0) + 1;
    }
    const mostCommonConcern = Object.entries(concernCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Most recommended treatment — across all leads' recommendation lists
    const recCounts: Record<string, number> = {};
    for (const l of leads) {
      const recs = Array.isArray(l.recommendations) ? l.recommendations : [];
      for (const r of recs) {
        const name = typeof r === "string" ? r : r?.name;
        if (!name) continue;
        recCounts[name] = (recCounts[name] || 0) + 1;
      }
    }
    const mostRecommendedTreatment = Object.entries(recCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Most accepted treatment — top recommendation among leads who went on to
    // book (phone matched in Booking) — a real, computed proxy for
    // "accepted", not a fabricated number.
    const acceptedCounts: Record<string, number> = {};
    for (const l of convertedLeads) {
      const recs = Array.isArray(l.recommendations) ? l.recommendations : [];
      const top = recs[0];
      const name = typeof top === "string" ? top : top?.name;
      if (!name) continue;
      acceptedCounts[name] = (acceptedCounts[name] || 0) + 1;
    }
    const mostAcceptedTreatment = Object.entries(acceptedCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Concern heatmap (% share of leads)
    const concernHeatmap = Object.entries(concernCounts)
      .map(([concern, count]) => ({ concern, count, pct: leads.length ? Math.round((count / leads.length) * 100) : 0 }))
      .sort((a, b) => b.count - a.count);

    // QR vs organic split
    const qrLeads = leads.filter((l) => l.qrSource).length;

    return NextResponse.json({
      success: true,
      data: {
        rangeDays: 30,
        started,
        completed,
        leadsCapture: leads.length,
        conversionRate: started > 0 ? Math.round((completed / started) * 100) : 0,
        emailCaptureRate: completed > 0 ? Math.round((leads.length / completed) * 100) : 0,
        bookingRate: leads.length > 0 ? Math.round((convertedLeads.length / leads.length) * 100) : 0,
        bookedCount: convertedLeads.length,
        mostCommonConcern,
        mostRecommendedTreatment,
        mostAcceptedTreatment,
        concernHeatmap,
        qrLeads,
        organicLeads: leads.length - qrLeads,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Failed to load analytics" }, { status: 500 });
  }
}
