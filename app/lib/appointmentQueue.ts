// Shared helper — import from here instead of the route file to avoid circular issues.
import NotificationQueue from "@/app/models/NotificationQueue";
import { getSettings } from "@/app/models/Settings";
import { buildMessage, buildWhatsAppUrl, buildTemplateVars } from "./notificationTemplates";

export async function queueNotification(
  appointment: {
    _id: unknown;
    patientName: string;
    patientPhone: string;
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
    const message   = buildMessage(trigger, vars);
    const waUrl     = buildWhatsAppUrl(appointment.patientPhone, message);

    await (NotificationQueue as any).create({
      appointmentId:  appointment._id,
      trigger,
      channel:        "whatsapp",
      recipientName:  appointment.patientName,
      recipientPhone: appointment.patientPhone,
      message,
      whatsappUrl:    waUrl,
      scheduledAt:    new Date(),
      status:         "pending",
    });
  } catch {
    // Non-critical
  }
}
