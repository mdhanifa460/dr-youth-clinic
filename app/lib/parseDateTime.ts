// Best-effort natural-language date/time extraction for the chat's
// availability grounding — deliberately simple regex matching, not a full
// NLP library. Returns null on anything it isn't confident about; callers
// must treat null as "couldn't parse a specific slot" and fall back to a
// broader answer (see app/api/ai-chat/route.ts's availability grounding),
// never guess.

export interface ParsedDateTime {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM, 24-hour
}

function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function parseRelativeDate(text: string, now: Date = new Date()): string | null {
  const lower = text.toLowerCase();
  if (/\btoday\b/.test(lower)) return toDateString(now);
  // Checked before the plain "tomorrow" pattern — "day after tomorrow"
  // also matches \btomorrow\b, so the more specific phrase must win first.
  if (/\bday after tomorrow\b/.test(lower)) return toDateString(new Date(now.getTime() + 2 * 86400000));
  if (/\btomorrow\b/.test(lower)) return toDateString(new Date(now.getTime() + 86400000));

  // "next monday" / "on friday" / bare weekday name — resolves to the next
  // occurrence of that weekday (today counts as "next" if it matches and
  // the phrase says "next", otherwise the closest upcoming one).
  for (let i = 0; i < WEEKDAYS.length; i++) {
    const day = WEEKDAYS[i];
    if (new RegExp(`\\b${day}\\b`).test(lower)) {
      const todayIdx = now.getDay();
      let diff = (i - todayIdx + 7) % 7;
      if (diff === 0 && /\bnext\b/.test(lower)) diff = 7;
      return toDateString(new Date(now.getTime() + diff * 86400000));
    }
  }
  return null;
}

export function parseTime(text: string): string | null {
  // Matches "11am", "11 am", "11:30am", "11:30 AM", "17:00", "5 pm"
  const match = text.toLowerCase().match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const meridiem = match[3];

  if (hour > 23 || minute > 59) return null;

  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;
  // No am/pm given and hour is ambiguous (1-7) — too uncertain to guess
  // between e.g. "at 5" meaning 5am vs 5pm; only accept unambiguous
  // 24-hour-style or explicitly-marked values.
  if (!meridiem && hour >= 1 && hour <= 7) return null;

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// Returns a slot only when BOTH a date and a time are confidently parsed —
// a partial match (date but no time, or vice versa) isn't a specific
// enough slot to check real availability against, so it's treated the
// same as "couldn't parse" rather than guessing the missing half.
export function parseDateTime(text: string, now: Date = new Date()): ParsedDateTime | null {
  const date = parseRelativeDate(text, now);
  const time = parseTime(text);
  if (!date || !time) return null;
  return { date, time };
}
