import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/app/lib/mongodb";
import { requirePermission } from "@/app/lib/adminAuth";
import Booking from "@/app/models/Booking";
import Appointment from "@/app/models/Appointment";
import AppointmentAuditLog from "@/app/models/AppointmentAuditLog";
import NotificationQueue from "@/app/models/NotificationQueue";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requirePermission("bookings", "view");
  if (denied) return denied;

  const phone = new URL(req.url).searchParams.get("phone") || "";
  if (!phone) return NextResponse.json({ success: false, message: "Phone required" }, { status: 400 });

  await connectDB();

  // Normalize — strip all non-digits then match last 10 digits
  const digits = phone.replace(/\D/g, "");
  const last10 = digits.slice(-10);
  const phoneRegex = new RegExp(last10 + "$");

  const [bookings, appointments] = await Promise.all([
    (Booking as any).find({ phone: phoneRegex }).sort({ createdAt: -1 }).limit(20).lean(),
    (Appointment as any).find({ patientPhone: phoneRegex }).sort({ date: -1 }).limit(20).lean(),
  ]);

  // Patient Timeline v1 — merges every existing real data source this
  // patient already has (no new model needed): the audit trail Appointment
  // status changes already write (AppointmentAuditLog), and every
  // WhatsApp/email notification queued for their appointments
  // (NotificationQueue). Booking/appointment creation events are added
  // directly since they don't already have their own audit-log entries.
  const appointmentIds = appointments.map((a: any) => a._id);
  const [auditLogs, notifications] = appointmentIds.length
    ? await Promise.all([
        (AppointmentAuditLog as any).find({ appointmentId: { $in: appointmentIds } }).sort({ createdAt: -1 }).limit(50).lean(),
        (NotificationQueue as any).find({ appointmentId: { $in: appointmentIds } }).sort({ createdAt: -1 }).limit(50).lean(),
      ])
    : [[], []];

  type TimelineEvent = { type: string; label: string; detail: string; at: string; icon: string };
  const timeline: TimelineEvent[] = [
    ...bookings.map((b: any) => ({
      type: "booking", icon: "📋", label: "Booking submitted",
      detail: `${b.service || "General enquiry"} — ${b.location || ""}`.trim(),
      at: b.createdAt,
    })),
    ...appointments.map((a: any) => ({
      type: "appointment", icon: "📅", label: "Appointment scheduled",
      detail: `${a.service} with ${a.doctorName} — ${a.date} ${a.startTime}`,
      at: a.createdAt,
    })),
    ...auditLogs.map((l: any) => ({
      type: "audit", icon: "📝", label: (l.action || "").replace(/_/g, " "),
      detail: l.details?.newStatus ? `→ ${l.details.newStatus}${l.details.note ? `: ${l.details.note}` : ""}` : (l.details?.note || ""),
      at: l.createdAt,
    })),
    ...notifications.map((n: any) => ({
      type: "notification", icon: n.channel === "email" ? "📧" : "💬",
      label: `${n.channel === "email" ? "Email" : "WhatsApp"} — ${(n.trigger || "").replace(/_/g, " ")}`,
      detail: n.status === "sent" ? "Sent" : n.status === "failed" ? `Failed: ${n.errorMessage}` : "Pending",
      at: n.createdAt,
    })),
  ].sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime());

  return NextResponse.json({
    success: true,
    data: {
      bookings,
      appointments,
      timeline,
      totalVisits: bookings.length + appointments.length,
    },
  });
}
