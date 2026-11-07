// The Diwali section shows itself only inside this window (India time), so it appears
// and disappears on its own without a deploy. Diwali 2026 falls on 8 November.
// Starts at 12:00 AM on Diwali day and stops when 13 November ends (end is exclusive).
export const DIWALI_WINDOW = {
  start: new Date('2026-11-08T00:00:00+05:30'),
  end: new Date('2026-11-14T00:00:00+05:30'),
};

export function isDiwaliSeason(now: Date = new Date()): boolean {
  return now >= DIWALI_WINDOW.start && now < DIWALI_WINDOW.end;
}
