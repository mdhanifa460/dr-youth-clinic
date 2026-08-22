import Booking from '@/app/models/Booking';
import { getEffectiveBranchConfig } from '@/app/lib/branchConfig';
import { getBranchAvailability } from '@/app/lib/availability';
import { atomicIncrement } from '@/app/lib/rateLimit';
import { getBranchLocalDateStr, secondsUntilNextLocalMidnight, addDaysToDateStr } from '@/app/lib/branchTimezone';

// Booking Capacity & Availability — the ONE centralized business-policy
// gate every real-appointment-creating path calls, per the explicit
// requirement that no channel accidentally bypass it. Deliberately NOT a
// new slot-scheduling engine: it reuses getEffectiveBranchConfig() (the
// existing global-default + branch-override merge) and
// getBranchAvailability() (the existing open/closed + holiday logic)
// exactly as they already work — this file only adds the ONE genuinely
// new concept, a per-branch-per-day appointment counter, on top of them.
//
// Terminology: "Daily Appointment Capacity" is a CLINIC BUSINESS POLICY
// (how many real appointments this branch can handle today) — completely
// separate from app/lib/rateLimit.ts's per-IP anti-abuse throttle, which
// this file never touches and never reads.

export type CapacityRejectionCode =
  | 'BOOKING_DISABLED'
  | 'SAME_DAY_BOOKING_DISABLED'
  | 'DATE_OUT_OF_RANGE'
  | 'BOOKING_CAPACITY_REACHED';

export interface CapacityCheckResult {
  allowed: boolean;
  code?: CapacityRejectionCode;
  message?: string;
  // Only meaningful on a BOOKING_CAPACITY_REACHED rejection for today's
  // date — lets the frontend offer "request a same-day appointment"
  // instead of just "try tomorrow". No auto-creation/waitlist happens
  // here yet (deliberately out of scope this phase) — this is only the
  // signal a future feature would key off of.
  sameDayRequestAvailable?: boolean;
  // Best-effort advisory only (a plain read, not part of the atomic
  // reservation) — the first upcoming date, within the branch's own
  // advance-booking window, that currently has room. Never a promise/hold
  // on that date; a customer submitting for it still goes through the
  // same real capacity check.
  nextAvailableDate?: string | null;
}

// Pure — a Lead vs. a real, capacity-consuming Appointment. Matches the
// exact same "has date && time" reasoning app/lib/crm/pushBooking.ts
// already uses to decide pushWebsiteLead vs. pushWebsiteBooking, refined
// with the ONE extra check that distinction needs here: app/api/booking's
// own "To be scheduled" placeholder (used for flows with no real date/time
// step, e.g. an AI-chat callback request) is a non-empty string, so a
// blind `Boolean(date && time)` would wrongly treat every such lead as a
// real appointment. A genuinely chosen date/time is required.
export function isRealAppointment(date?: string | null, time?: string | null): boolean {
  if (!date || !time) return false;
  if (date === 'To be scheduled' || time === 'To be scheduled') return false;
  return true;
}

// The one shared atomic counter — branch + LOCAL calendar date, TTL'd to
// branch-local midnight. ALWAYS increments regardless of whether it ends
// up over capacity (same "increment first, compare after" shape
// checkRateLimit's distributed path already uses) — this is what makes it
// the single accurate source of "how many real appointments has this
// branch accumulated today," across every channel that calls it, not just
// the interactive website flow that also enforces the result.
export async function reserveCapacitySlot(
  branch: string,
  localDateStr: string,
  timezone: string
): Promise<number> {
  const key = `booking-capacity:${branch.toLowerCase()}:${localDateStr}`;
  const ttl = secondsUntilNextLocalMidnight(timezone);
  return atomicIncrement(key, ttl);
}

// Best-effort READ (not a reservation) of today's count for a branch/date —
// used only for the advisory nextAvailableDate search and any read-only
// display, never as the enforcement mechanism itself (that's
// reserveCapacitySlot's job, via the atomic counter, not this DB count).
async function countExistingAppointments(branch: string, dateStr: string): Promise<number> {
  return (Booking as any).countDocuments({
    location: branch.toLowerCase(),
    date: dateStr,
    // Matches isRealAppointment()'s own definition — a real chosen time,
    // not empty and not the "To be scheduled" placeholder.
    time: { $nin: ['', 'To be scheduled'] },
  } as any).catch(() => 0);
}

async function findNextAvailableDate(
  branch: string,
  localToday: string,
  timezone: string,
  capacity: number | null,
  advanceBookingDays: number | null
): Promise<string | null> {
  const maxLookahead = advanceBookingDays != null ? Math.min(advanceBookingDays, 30) : 30;
  const days = await getBranchAvailability(branch, maxLookahead + 1).catch(() => []);
  for (const day of days) {
    if (day.date <= localToday) continue; // "next" means strictly after today
    if (!day.open) continue;
    if (capacity == null) return day.date; // unlimited — first open day qualifies
    const used = await countExistingAppointments(branch, day.date);
    if (used < capacity) return day.date;
  }
  return null;
}

export interface CapacityCheckInput {
  branch: string;
  date: string; // YYYY-MM-DD, as already collected by the booking form
  time: string;
}

// The full interactive gate — used by the one patient-facing, real-time
// booking flow (app/api/booking/route.ts, which the website form, the
// consultation bar, and the AI chat's booking panel all already share).
// Runs BEFORE Booking.create(), per the explicit requirement. Webhook/CRM
// paths that can carry a real date/time use reserveCapacitySlot() directly
// instead (see those files' own comments) — they still count toward the
// same shared total, but are never rejected outright, since silently
// dropping a real inbound lead would be worse than accepting an
// over-capacity one for staff to triage.
export async function checkBookingCapacity(input: CapacityCheckInput): Promise<CapacityCheckResult> {
  const config = await getEffectiveBranchConfig(input.branch);

  if (config.bookingEnabled === false) {
    return {
      allowed: false,
      code: 'BOOKING_DISABLED',
      message: 'Online booking is currently unavailable for this location. Please call us directly.',
    };
  }

  const localToday = getBranchLocalDateStr(config.timezone);
  const isSameDay = input.date === localToday;

  if (isSameDay && config.sameDayBookingEnabled === false) {
    return {
      allowed: false,
      code: 'SAME_DAY_BOOKING_DISABLED',
      message: "Same-day appointments aren't available online for this location. Please choose a different date, or call us directly for urgent requests.",
    };
  }

  if (input.date < localToday) {
    return {
      allowed: false,
      code: 'DATE_OUT_OF_RANGE',
      message: 'That date has already passed. Please choose an upcoming date.',
    };
  }
  if (config.advanceBookingDays != null) {
    const maxDate = addDaysToDateStr(localToday, config.advanceBookingDays);
    if (input.date > maxDate) {
      return {
        allowed: false,
        code: 'DATE_OUT_OF_RANGE',
        message: `That date isn't open for booking yet. Please choose a date within the next ${config.advanceBookingDays} days.`,
      };
    }
  }

  if (config.dailyAppointmentCapacity == null) {
    return { allowed: true }; // unlimited — no reservation needed
  }

  const count = await reserveCapacitySlot(input.branch, input.date, config.timezone);
  if (count <= config.dailyAppointmentCapacity) {
    return { allowed: true };
  }

  const nextAvailableDate = await findNextAvailableDate(
    input.branch, localToday, config.timezone, config.dailyAppointmentCapacity, config.advanceBookingDays
  ).catch(() => null);

  return {
    allowed: false,
    code: 'BOOKING_CAPACITY_REACHED',
    message: isSameDay
      ? "Today's appointments are fully booked. Please choose another available date."
      : "That date's appointments are fully booked. Please choose another available date.",
    sameDayRequestAvailable: isSameDay && config.sameDayBookingEnabled !== false,
    nextAvailableDate,
  };
}
