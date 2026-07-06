import type { AdminRole } from "./permissions";
import type { AppointmentStatus, RescheduleReason } from "../models/Appointment";

// ─── Status metadata ───────────────────────────────────────────────────────────

export const STATUS_META: Record<AppointmentStatus, {
  label:      string;
  color:      string;      // Tailwind bg class
  textColor:  string;      // Tailwind text class
  icon:       string;
  terminal:   boolean;     // Cannot transition out of terminal status
}> = {
  new_lead:             { label: "New Lead",            color: "bg-gray-100",    textColor: "text-gray-700",   icon: "🔔", terminal: false },
  requested:            { label: "Requested",           color: "bg-blue-100",    textColor: "text-blue-700",   icon: "📋", terminal: false },
  confirmed:            { label: "Confirmed",           color: "bg-green-100",   textColor: "text-green-700",  icon: "✅", terminal: false },
  reminder_sent:        { label: "Reminder Sent",       color: "bg-purple-100",  textColor: "text-purple-700", icon: "📲", terminal: false },
  checked_in:           { label: "Checked In",          color: "bg-teal-100",    textColor: "text-teal-700",   icon: "🏥", terminal: false },
  consultation_started: { label: "In Consultation",     color: "bg-indigo-100",  textColor: "text-indigo-700", icon: "👨‍⚕️", terminal: false },
  treatment_completed:  { label: "Treatment Done",      color: "bg-emerald-100", textColor: "text-emerald-700",icon: "💉", terminal: false },
  follow_up_scheduled:  { label: "Follow-up Scheduled", color: "bg-cyan-100",    textColor: "text-cyan-700",   icon: "📅", terminal: false },
  closed:               { label: "Closed",              color: "bg-gray-200",    textColor: "text-gray-600",   icon: "🏁", terminal: true  },
  cancelled:            { label: "Cancelled",           color: "bg-red-100",     textColor: "text-red-700",    icon: "❌", terminal: true  },
  no_show:              { label: "No Show",             color: "bg-orange-100",  textColor: "text-orange-700", icon: "👻", terminal: true  },
};

// ─── Status flow ordered for timeline display ──────────────────────────────────

export const STATUS_TIMELINE: AppointmentStatus[] = [
  "new_lead", "requested", "confirmed", "reminder_sent",
  "checked_in", "consultation_started", "treatment_completed",
  "follow_up_scheduled", "closed",
];

// ─── Role-gated transitions ────────────────────────────────────────────────────
// Each entry defines which statuses a given role may move to from the current status.

type Transition = {
  to:     AppointmentStatus;
  label:  string;
  roles:  AdminRole[];
};

export const TRANSITIONS: Record<AppointmentStatus, Transition[]> = {
  new_lead: [
    { to: "requested",  label: "Convert to Request", roles: ["super_admin","clinic_owner","receptionist","marketing_manager","customer_support"] },
    { to: "cancelled",  label: "Cancel",             roles: ["super_admin","clinic_owner","receptionist"] },
  ],
  requested: [
    { to: "confirmed",  label: "Confirm Appointment",roles: ["super_admin","clinic_owner","receptionist","customer_support"] },
    { to: "cancelled",  label: "Cancel",             roles: ["super_admin","clinic_owner","receptionist"] },
  ],
  confirmed: [
    { to: "reminder_sent", label: "Mark Reminder Sent", roles: ["super_admin","clinic_owner","receptionist"] },
    { to: "checked_in",    label: "Patient Checked In", roles: ["super_admin","clinic_owner","receptionist"] },
    { to: "no_show",       label: "Mark No-Show",       roles: ["super_admin","clinic_owner","receptionist"] },
    { to: "cancelled",     label: "Cancel",             roles: ["super_admin","clinic_owner","receptionist","doctor"] },
  ],
  reminder_sent: [
    { to: "checked_in", label: "Patient Checked In", roles: ["super_admin","clinic_owner","receptionist"] },
    { to: "no_show",    label: "Mark No-Show",       roles: ["super_admin","clinic_owner","receptionist"] },
    { to: "cancelled",  label: "Cancel",             roles: ["super_admin","clinic_owner","receptionist"] },
  ],
  checked_in: [
    { to: "consultation_started", label: "Start Consultation", roles: ["super_admin","clinic_owner","doctor","receptionist"] },
  ],
  consultation_started: [
    { to: "treatment_completed", label: "Complete Treatment",  roles: ["super_admin","clinic_owner","doctor"] },
  ],
  treatment_completed: [
    { to: "follow_up_scheduled", label: "Schedule Follow-up", roles: ["super_admin","clinic_owner","doctor","receptionist"] },
    { to: "closed",              label: "Close (No Follow-up)",roles: ["super_admin","clinic_owner","doctor","receptionist"] },
  ],
  follow_up_scheduled: [
    { to: "closed", label: "Mark Closed", roles: ["super_admin","clinic_owner","receptionist"] },
  ],
  closed:               [],
  cancelled:            [],
  no_show:              [],
};

export function getAllowedTransitions(current: AppointmentStatus, role: AdminRole): Transition[] {
  return (TRANSITIONS[current] ?? []).filter((t) => t.roles.includes(role));
}

// ─── Reschedule permission ─────────────────────────────────────────────────────

const RESCHEDULE_ROLES: AdminRole[] = ["super_admin", "clinic_owner", "receptionist"];
const RESCHEDULE_DOCTOR_STATUSES: AppointmentStatus[] = ["confirmed", "reminder_sent"];

export function canReschedule(role: AdminRole, status: AppointmentStatus): boolean {
  if (STATUS_META[status].terminal) return false;
  if (RESCHEDULE_ROLES.includes(role)) return true;
  // Doctors may propose reschedule only when appointment is upcoming (confirmed/reminder_sent)
  if (role === "doctor" && RESCHEDULE_DOCTOR_STATUSES.includes(status)) return true;
  return false;
}

// ─── Export permission ─────────────────────────────────────────────────────────

export const APPOINTMENT_EXPORT_ROLES: AdminRole[] = ["super_admin", "clinic_owner", "marketing_manager"];

// ─── Doctor slot block roles ───────────────────────────────────────────────────

export const SLOT_BLOCK_ROLES: AdminRole[] = ["super_admin", "clinic_owner", "doctor"];

// ─── Reschedule reasons ────────────────────────────────────────────────────────

export const RESCHEDULE_REASONS: Record<RescheduleReason, string> = {
  patient_requested:     "Patient Requested",
  doctor_unavailable:    "Doctor Unavailable",
  clinic_holiday:        "Clinic Holiday",
  emergency:             "Emergency",
  equipment_maintenance: "Equipment Maintenance",
  weather:               "Weather",
  other:                 "Other",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

export function addMinutes(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(":").map(Number);
  const total  = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function timeOverlaps(
  aStart: string, aEnd: string,
  bStart: string, bEnd: string
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

// Notifications that should be triggered by each status transition
export const TRANSITION_NOTIFICATIONS: Partial<Record<AppointmentStatus, string>> = {
  confirmed:     "booking_confirmed",
  cancelled:     "cancelled",
  reminder_sent: "reminder_24h",
};
