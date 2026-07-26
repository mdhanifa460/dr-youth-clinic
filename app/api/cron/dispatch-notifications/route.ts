import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import NotificationQueue from "@/app/models/NotificationQueue";
import { sendWhatsAppText } from "@/app/lib/whatsapp";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// vercel.json schedules this once daily (0 2 * * * UTC — before clinic
// opening hours in IST) because this project is on Vercel's Hobby plan,
// which only permits daily-or-coarser Cron schedules; Hobby also doesn't
// guarantee the exact minute within that day. This means reminders sent
// through this dispatcher are effectively "same-day" precision, not
// "N hours before" precision — a same-day morning run can queue and send a
// same-afternoon reminder, but a genuine "2 hours before" reminder needs a
// finer-grained schedule than Hobby allows. Upgrading to Pro (or any plan
// with sub-daily Cron) is what unlocks tighter timing — that's a plan
// decision, not a code change; this route works identically either way,
// only vercel.json's `schedule` needs to change.
//
// Vercel signs every request it makes to a scheduled Cron route with
// `Authorization: Bearer ${CRON_SECRET}` — this is Vercel's own documented
// mechanism, not something built here. Without this check, this route
// would be a public, unauthenticated endpoint that sends arbitrary queued
// WhatsApp messages to whoever hits it.
function isAuthorizedCronRequest(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function sendEmailPlainText(to: string, subject: string, text: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { success: false, error: "RESEND_API_KEY not configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "DR Youth Clinic <onboarding@resend.dev>",
        to: [to],
        subject,
        text,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { success: false, error: `Resend API error (${res.status}): ${body.slice(0, 200)}` };
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || "Network error calling Resend" };
  }
}

// Picks up every NotificationQueue row that's due and still pending, and
// actually sends it — this is the piece notificationTemplates.ts's own
// comment anticipated ("when WhatsApp Cloud API credentials are added...
// wire sendNotification() accordingly") but was never built; queued items
// have sat waiting for a staff member to click a wa.me link until now.
//
// A WhatsApp free-text send only succeeds within Meta's 24h customer-
// service window (the patient must have messaged the business number
// recently) — that's a real Meta platform constraint, not a bug here. When
// it fails for that reason, the row is marked failed with Meta's own error
// message, and the existing whatsappUrl deep-link (already on every row)
// remains available for a staff member to send manually instead — this
// dispatcher is a first attempt layered on top of the existing fallback,
// not a replacement for it.
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const due = await (NotificationQueue as any)
    .find({ status: "pending", scheduledAt: { $lte: new Date() } })
    .limit(50) // one Cron tick processes a bounded batch — the next tick picks up the rest
    .lean();

  const results = { total: due.length, sent: 0, failed: 0 };

  for (const item of due) {
    let outcome: { success: boolean; error?: string };

    if (item.channel === "whatsapp") {
      outcome = item.recipientPhone
        ? await sendWhatsAppText(item.recipientPhone, item.message)
        : { success: false, error: "No recipient phone on this queue item" };
    } else if (item.channel === "email") {
      outcome = item.recipientEmail
        ? await sendEmailPlainText(item.recipientEmail, "DR Youth Clinic", item.message)
        : { success: false, error: "No recipient email on this queue item" };
    } else {
      outcome = { success: false, error: `Channel "${item.channel}" is not yet configured for auto-send` };
    }

    await (NotificationQueue as any).findByIdAndUpdate(item._id, {
      $set: outcome.success
        ? { status: "sent", sentAt: new Date() }
        : { status: "failed", errorMessage: outcome.error || "Unknown error" },
    });

    if (outcome.success) results.sent++; else results.failed++;
  }

  return NextResponse.json({ success: true, ...results });
}
