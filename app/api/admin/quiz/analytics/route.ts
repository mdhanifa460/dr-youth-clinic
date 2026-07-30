import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import { AssessmentEvent } from "@/app/models/AssessmentEvent";
import { Lead } from "@/app/models/Lead";
import Booking from "@/app/models/Booking";
import { normalizePhone } from "@/app/lib/phone";

export async function GET() {
  const denied = await requirePermission("ai-assessment", "view");
  if (denied) return denied;

  try {
    await connectDB();

    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [events, leads, bookingPhones] = await Promise.all([
      AssessmentEvent.find({ createdAt: { $gte: since30d } } as any).select("event clinicLocation channel goal stepId sessionId createdAt").lean() as Promise<any[]>,
      Lead.find({ createdAt: { $gte: since30d } } as any).select("phone email primaryConcern recommendations campaign qrSource clinicLocation channel preferredClinic createdAt").lean() as Promise<any[]>,
      (Booking as any).distinct("phone"),
    ]);
    const started = events.filter((e) => e.event === "started").length;
    const completed = events.filter((e) => e.event === "completed").length;
    const consultationBookedClicks = events.filter((e) => e.event === "consultation_booked").length;

    // Per-step drop-off: for each sessionId, how many DISTINCT step_completed
    // events it has — the visitor's actual "depth" reached, independent of
    // which concern branch they took (hair vs acne ask different questions,
    // so aggregating by literal stepId wouldn't generalize). Depth d's count
    // is "sessions that got at least this far," a standard funnel shape.
    const stepEvents = events.filter((e) => e.event === "step_completed" && e.sessionId);
    const stepsBySession = new Map<string, Set<string>>();
    for (const e of stepEvents) {
      if (!stepsBySession.has(e.sessionId)) stepsBySession.set(e.sessionId, new Set());
      stepsBySession.get(e.sessionId)!.add(e.stepId);
    }
    const depths = Array.from(stepsBySession.values()).map((s) => s.size).filter((d) => d > 0);
    const maxDepth = depths.reduce((m, d) => Math.max(m, d), 0);
    const dropoffByStep = Array.from({ length: maxDepth }, (_, i) => {
      const stepNumber = i + 1;
      const reached = depths.filter((d) => d >= stepNumber).length;
      return { step: stepNumber, sessions: reached };
    });

    // Median time-to-complete: pair each sessionId's earliest "started" with
    // its earliest "completed" — only sessions with both count. Median
    // (not mean) so one abandoned-then-resumed outlier session can't skew
    // the whole number.
    const startedBySession = new Map<string, number>();
    const completedBySession = new Map<string, number>();
    for (const e of events) {
      if (!e.sessionId) continue;
      const t = new Date(e.createdAt).getTime();
      if (e.event === "started" && (!startedBySession.has(e.sessionId) || t < startedBySession.get(e.sessionId)!)) {
        startedBySession.set(e.sessionId, t);
      }
      if (e.event === "completed" && (!completedBySession.has(e.sessionId) || t < completedBySession.get(e.sessionId)!)) {
        completedBySession.set(e.sessionId, t);
      }
    }
    const durations: number[] = [];
    for (const [sid, startTs] of Array.from(startedBySession.entries())) {
      const endTs = completedBySession.get(sid);
      if (endTs !== undefined && endTs > startTs) durations.push(endTs - startTs);
    }
    durations.sort((a, b) => a - b);
    const medianCompletionMs = durations.length
      ? durations.length % 2 === 1
        ? durations[(durations.length - 1) / 2]
        : (durations[durations.length / 2 - 1] + durations[durations.length / 2]) / 2
      : null;

    // Goal-selected funnel — Plan My Journey only (skin-quiz's events carry
    // no goal); shows how many visitors picked each goal vs how many of
    // those sessions went on to complete the intake.
    const goalSelectedEvents = events.filter((e) => e.event === "goal_selected" && e.goal);
    const goalCounts: Record<string, { selected: number; completedSessions: Set<string> }> = {};
    for (const e of goalSelectedEvents) {
      if (!goalCounts[e.goal]) goalCounts[e.goal] = { selected: 0, completedSessions: new Set() };
      goalCounts[e.goal].selected++;
    }
    for (const e of events) {
      if (e.event === "completed" && e.goal && e.sessionId && goalCounts[e.goal]) {
        goalCounts[e.goal].completedSessions.add(e.sessionId);
      }
    }
    const goalFunnel = Object.entries(goalCounts)
      .map(([goal, c]) => ({ goal, selected: c.selected, completed: c.completedSessions.size }))
      .sort((a, b) => b.selected - a.selected);

    // Normalize both sides — leads saved before the phone.ts fix still have
    // raw, unformatted numbers, so a straight string comparison against
    // Booking.phone (always saved normalized) would miss real conversions.
    const bookingPhoneSet = new Set((bookingPhones as string[]).filter(Boolean).map(normalizePhone));
    const convertedLeads = leads.filter((l) => l.phone && bookingPhoneSet.has(normalizePhone(l.phone)));

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

    // Per-clinic and per-channel breakdown — lets a QR printed for a specific
    // branch/placement (?clinic=, ?channel=) be traced end-to-end: scans in,
    // leads captured, and actual bookings out.
    const groupBy = (key: "clinicLocation" | "channel") => {
      const buckets = new Map<string, { started: number; completed: number; leads: number; booked: number }>();
      const bucket = (k: string) => {
        if (!buckets.has(k)) buckets.set(k, { started: 0, completed: 0, leads: 0, booked: 0 });
        return buckets.get(k)!;
      };
      for (const e of events) {
        const k = e[key];
        if (!k) continue;
        if (e.event === "started") bucket(k).started++;
        else if (e.event === "completed") bucket(k).completed++;
      }
      for (const l of leads) {
        const k = l[key];
        if (!k) continue;
        bucket(k).leads++;
        if (l.phone && bookingPhoneSet.has(normalizePhone(l.phone))) bucket(k).booked++;
      }
      return Array.from(buckets.entries())
        .map(([label, s]) => ({ label, ...s, conversionRate: s.leads > 0 ? Math.round((s.booked / s.leads) * 100) : 0 }))
        .sort((a, b) => b.leads - a.leads);
    };
    const locationBreakdown = groupBy("clinicLocation");
    const channelBreakdown = groupBy("channel");

    // The patient's own clinic choice (Step 2 of the intake) — distinct from
    // clinicLocation above, which is QR/link attribution and may not match
    // where the patient actually said they want to be seen.
    const preferredClinicCounts: Record<string, number> = {};
    for (const l of leads) {
      if (!l.preferredClinic) continue;
      preferredClinicCounts[l.preferredClinic] = (preferredClinicCounts[l.preferredClinic] || 0) + 1;
    }
    const preferredClinicBreakdown = Object.entries(preferredClinicCounts)
      .map(([label, count]) => ({ label, count, pct: leads.length ? Math.round((count / leads.length) * 100) : 0 }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      success: true,
      data: {
        rangeDays: 30,
        started,
        completed,
        leadsCapture: leads.length,
        conversionRate: started > 0 ? Math.round((completed / started) * 100) : 0,
        // Leads are now created at Step 2 (name/phone/preferred clinic) before
        // email is ever asked for, so "captured" leads no longer implies an
        // email was given — this is the actual % of leads with a real email.
        emailCaptureRate: leads.length > 0 ? Math.round((leads.filter((l) => l.email).length / leads.length) * 100) : 0,
        bookingRate: leads.length > 0 ? Math.round((convertedLeads.length / leads.length) * 100) : 0,
        bookedCount: convertedLeads.length,
        mostCommonConcern,
        mostRecommendedTreatment,
        mostAcceptedTreatment,
        concernHeatmap,
        qrLeads,
        organicLeads: leads.length - qrLeads,
        locationBreakdown,
        channelBreakdown,
        preferredClinicBreakdown,
        // Phase 4 — Journey Engine funnel additions. bookedCount above stays
        // the phone-cross-reference proxy for an actual confirmed booking;
        // consultationBookedClicks is the new, more immediate signal (a
        // visitor clicking through to /book), shown alongside it, not
        // replacing it.
        consultationBookedClicks,
        dropoffByStep,
        medianCompletionSeconds: medianCompletionMs !== null ? Math.round(medianCompletionMs / 1000) : null,
        goalFunnel,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || "Failed to load analytics" }, { status: 500 });
  }
}
