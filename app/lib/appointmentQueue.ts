// Shared helper — import from here instead of the route file to avoid circular issues.
import NotificationQueue from "@/app/models/NotificationQueue";
import { getSettings } from "@/app/models/Settings";
import { buildWhatsAppUrl, buildTemplateVars, resolveTemplatesForTrigger } from "./notificationTemplates";
import { TRANSITION_NOTIFICATIONS } from "./appointmentFlow";

// Resolves which trigger (if any) an appointment-status transition fires —
// Settings.automationRules is the real, admin-editable source; the
// hardcoded TRANSITION_NOTIFICATIONS map (appointmentFlow.ts) is only the
// fallback for any status with no matching row, so behavior is unchanged
// until an admin actually adds/edits a rule.
export async function resolveAutomationTrigger(status: string, settingsArg?: any): Promise<string | undefined> {
  const settings = settingsArg ?? (await getSettings());
  const rule = settings.automationRules?.items?.find((r: any) => r.status === status && r.enabled);
  if (rule) return rule.trigger;
  return (TRANSITION_NOTIFICATIONS as Record<string, string>)[status];
}

export async function queueNotification(
  appointment: {
    _id: unknown;
    patientName: string;
    patientPhone: string;
    patientEmail?: string;
    service: string;
    branch: string;
    date: string;
    startTime: string;
    doctorName: string;
    followUpDate?: string;
    cancellationReason?: string;
  },
  trigger: string,
  _actorId: unknown
) {
  try {
    const settings  = await getSettings();
    const phone     = settings.booking?.clinicWhatsapp || "";
    const vars      = buildTemplateVars({ ...appointment, clinicPhone: phone });
    // Real, admin-editable templates (Settings.communicationTemplates) —
    // one queue row per enabled channel for this trigger, so a trigger can
    // send both a WhatsApp message and an email without duplicating the
    // trigger logic per channel.
    const resolved = resolveTemplatesForTrigger(trigger, settings.communicationTemplates?.items || [], vars);

    for (const t of resolved) {
      if (t.channel === "email" && !appointment.patientEmail) continue; // nothing to send it to

      await (NotificationQueue as any).create({
        appointmentId:  appointment._id,
        trigger,
        channel:        t.channel,
        recipientName:  appointment.patientName,
        recipientPhone: appointment.patientPhone,
        recipientEmail: appointment.patientEmail || "",
        message:        t.body,
        whatsappUrl:    t.channel === "whatsapp" ? buildWhatsAppUrl(appointment.patientPhone, t.body) : "",
        scheduledAt:    new Date(),
        status:         "pending",
      });
    }
  } catch {
    // Non-critical
  }
}
