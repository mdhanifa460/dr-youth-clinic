// Notification template engine for patient communications.
// Uses WhatsApp deep-links (wa.me) — zero cost, works without any API key.
// When WhatsApp Cloud API / MSG91 credentials are added to Settings, flip
// `NOTIFY_AUTO_SEND=true` in .env and wire sendNotification() accordingly.

type TemplateVars = {
  name:     string;
  service:  string;
  branch:   string;
  date:     string;
  time:     string;
  doctor:   string;
  reason?:  string;
  phone:    string;   // clinic's WhatsApp number for patient queries
  followUp?: string;
};

function render(template: string, vars: TemplateVars): string {
  return template
    .replace(/{{name}}/g,     vars.name)
    .replace(/{{service}}/g,  vars.service)
    .replace(/{{location}}/g, vars.branch)
    .replace(/{{branch}}/g,   vars.branch)
    .replace(/{{date}}/g,     vars.date)
    .replace(/{{time}}/g,     vars.time)
    .replace(/{{doctor}}/g,   vars.doctor)
    .replace(/{{reason}}/g,   vars.reason ?? "")
    .replace(/{{followUp}}/g, vars.followUp ?? "")
    .replace(/{{clinicPhone}}/g, vars.phone);
}

// Default template strings — can be overridden in Settings > WhatsApp tab
export const DEFAULT_TEMPLATES: Record<string, string> = {
  booking_confirmed:
    "Hello {{name}}! ✨\n\nYour appointment at *DR Youth Clinic* has been confirmed.\n\n" +
    "📅 *Treatment:* {{service}}\n" +
    "📍 *Branch:* {{branch}}\n" +
    "🗓️ *Date:* {{date}} at {{time}}\n" +
    "👨‍⚕️ *Doctor:* {{doctor}}\n\n" +
    "Please arrive *10 minutes early*. Avoid makeup on the treatment area.\n" +
    "For any queries, reply here or call {{clinicPhone}}.\n\n" +
    "_DR Youth Clinic – Your Skin's Best Friend_ 🌿",

  rescheduled:
    "Hello {{name}},\n\nYour appointment has been rescheduled.\n\n" +
    "📅 *New Date:* {{date}} at {{time}}\n" +
    "📍 *Branch:* {{branch}}\n" +
    "📝 *Reason:* {{reason}}\n\n" +
    "Apologies for any inconvenience. For queries: {{clinicPhone}}.\n\n" +
    "_DR Youth Clinic_ 🌿",

  cancelled:
    "Hello {{name}},\n\nYour appointment on {{date}} at {{branch}} has been cancelled.\n\n" +
    "📝 *Reason:* {{reason}}\n\n" +
    "To reschedule, please call {{clinicPhone}} or reply here.\n\n" +
    "_DR Youth Clinic_ 🌿",

  reminder_24h:
    "Hi {{name}}! 👋 *Reminder — your appointment is tomorrow!*\n\n" +
    "📅 *{{date}}* at *{{time}}*\n" +
    "📍 *{{branch}}* – with *{{doctor}}*\n\n" +
    "Please arrive 10 minutes early and avoid sun exposure today.\n" +
    "See you tomorrow! — _DR Youth Clinic_ ✨",

  reminder_2h:
    "Hi {{name}}! ⏰ Your appointment at DR Youth {{branch}} is *in 2 hours* ({{time}}).\n" +
    "*{{doctor}}* is ready for you. See you soon! 🌿",

  treatment_completed:
    "Thank you for visiting *DR Youth Clinic*, {{name}}! 😊\n\n" +
    "How are you feeling after your *{{service}}* session?\n\n" +
    "💧 Remember your post-care routine. If you have any concerns, just reply to this message.\n" +
    "{{followUp}}\n\n" +
    "_DR Youth Clinic – We care beyond the clinic_ 🌿",

  review_request:
    "Hi {{name}}! ⭐ Thank you for choosing DR Youth Clinic!\n\n" +
    "Could you spare 2 minutes to share your experience?\n" +
    "Your feedback helps other patients find the right care. 🙏\n\n" +
    "For queries: {{clinicPhone}}\n\n" +
    "_DR Youth Clinic_ 🌿",
};

export function buildMessage(
  trigger: string,
  vars: TemplateVars,
  customTemplate?: string
): string {
  const template = customTemplate ?? DEFAULT_TEMPLATES[trigger] ?? "";
  return render(template, vars);
}

export type CommunicationTemplateItem = {
  id: string;
  trigger: string;
  channel: 'whatsapp' | 'email';
  enabled: boolean;
  subject: string;
  body: string;
  order: number;
  branch: string;
};

// Real, admin-editable resolution — replaces the DEFAULT_TEMPLATES lookup
// above wherever Settings.communicationTemplates is available (see
// Settings.ts for why this array is the actual source of truth now, not
// the hardcoded object in this file). Returns every enabled template
// matching this trigger, one per channel — a trigger can fire both a
// WhatsApp and an Email version at once. Falls back to DEFAULT_TEMPLATES'
// whatsapp-only behavior if the Settings array is empty/missing, so this
// still works before any admin has saved Settings at all.
//
// `branch` (the appointment's branch slug, e.g. "chennai") is optional so
// every existing caller keeps working; when provided, a template scoped to
// that exact branch wins over a global (branch: '') template for the same
// trigger+channel, letting one clinic customize wording without affecting
// the others.
export function resolveTemplatesForTrigger(
  trigger: string,
  templates: CommunicationTemplateItem[],
  vars: TemplateVars,
  branch?: string
): { channel: 'whatsapp' | 'email'; subject: string; body: string }[] {
  const candidates = templates.filter(
    (t) => t.trigger === trigger && t.enabled && (!t.branch || t.branch === branch)
  );
  if (candidates.length === 0) {
    const fallback = DEFAULT_TEMPLATES[trigger];
    return fallback ? [{ channel: 'whatsapp', subject: '', body: render(fallback, vars) }] : [];
  }
  const byChannel = new Map<string, CommunicationTemplateItem>();
  for (const t of candidates) {
    const existing = byChannel.get(t.channel);
    if (!existing || (t.branch && !existing.branch)) byChannel.set(t.channel, t);
  }
  return Array.from(byChannel.values()).map((t) => ({
    channel: t.channel,
    subject: t.subject ? render(t.subject, vars) : '',
    body: render(t.body, vars),
  }));
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  // Normalize Indian phone: strip leading 0, add 91 country code
  const normalized = phone.replace(/\D/g, "").replace(/^0/, "").replace(/^(?!91)/, "91");
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function buildTemplateVars(appointment: {
  patientName: string;
  patientPhone: string;
  service: string;
  branch: string;
  date: string;
  startTime: string;
  doctorName: string;
  followUpDate?: string;
  cancellationReason?: string;
  clinicPhone?: string;
}, rescheduleReason?: string): TemplateVars {
  return {
    name:     appointment.patientName,
    service:  appointment.service,
    branch:   appointment.branch,
    date:     appointment.date,
    time:     appointment.startTime,
    doctor:   appointment.doctorName,
    reason:   rescheduleReason ?? appointment.cancellationReason ?? "",
    followUp: appointment.followUpDate
      ? `📅 Your next visit is scheduled for: *${appointment.followUpDate}*`
      : "",
    phone:    appointment.clinicPhone ?? "",
  };
}
