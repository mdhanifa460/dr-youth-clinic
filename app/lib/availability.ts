import { getEffectiveBranchConfig } from './branchConfig';

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export interface DayAvailability {
  date: string; // YYYY-MM-DD
  weekday: string;
  open: boolean;
  reason?: 'closed_day' | 'holiday' | 'not_configured';
  holidayLabel?: string;
  slots: string[];
}

// Branch-LEVEL availability only — is the clinic open this day, and which
// admin-configured slot times exist — not a specific doctor's personal
// calendar. The patient-facing Booking flow (app/api/booking/route.ts,
// used by the AI chat's own booking panel) has no doctor-selection step at
// all, so there's no real per-doctor capacity model to check against here;
// building that would mean wiring into the separate admin CRM Appointment/
// DoctorSlotBlock system, a materially bigger change. This still replaces
// "let the LLM guess" with real operatingHours/holidays/slotConfig data —
// the actual facts a patient asking "is 5pm tomorrow open" needs.
export async function getBranchAvailability(location: string, days = 3): Promise<DayAvailability[]> {
  const config = await getEffectiveBranchConfig(location);
  const results: DayAvailability[] = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const weekday = WEEKDAYS[d.getDay()];

    const holiday = (config.holidays || []).find((h: any) => h.date === dateStr);
    if (holiday) {
      results.push({ date: dateStr, weekday, open: false, reason: 'holiday', holidayLabel: holiday.label, slots: [] });
      continue;
    }

    const hoursForDay = (config.operatingHours || []).find((h: any) => h.day === weekday);
    if (!hoursForDay) {
      // Branch has no operatingHours configured at all for this weekday —
      // distinct from an explicit isOpen:false, so callers/patients aren't
      // told "closed" when the truth is just "not set up yet".
      results.push({ date: dateStr, weekday, open: false, reason: 'not_configured', slots: [] });
      continue;
    }
    if (!hoursForDay.isOpen) {
      results.push({ date: dateStr, weekday, open: false, reason: 'closed_day', slots: [] });
      continue;
    }

    results.push({ date: dateStr, weekday, open: true, slots: config.slotConfig?.availableTimes || [] });
  }

  return results;
}
