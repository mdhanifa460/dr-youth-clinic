// The Diwali section shows itself only inside this window (India time), so it appears
// and disappears on its own without a deploy. Diwali 2026 fell on 8 November.
// It ran from 12:00 AM on Diwali day and was switched off at the start of 9 Nov once
// the festival was over (end is exclusive). Change both dates to reuse it next year.
export const DIWALI_WINDOW = {
  start: new Date('2026-11-08T00:00:00+05:30'),
  end: new Date('2026-11-09T00:00:00+05:30'),
};

export function isDiwaliSeason(now: Date = new Date()): boolean {
  return now >= DIWALI_WINDOW.start && now < DIWALI_WINDOW.end;
}
