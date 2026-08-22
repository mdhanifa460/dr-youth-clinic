// Branch-local date/time math for Booking Capacity & Availability — a new
// business day starts at LOCAL midnight (Asia/Kolkata for every branch
// today), not UTC midnight. bookingStats.ts's existing
// `new Date().toISOString().slice(0,10)` pattern is UTC-based and would
// misattribute a booking made between 18:30–23:59 UTC (00:00–05:29 IST) to
// the wrong calendar day if reused for a real capacity gate — this module
// exists specifically to avoid repeating that.
//
// Dependency-free: uses only built-in Intl (Node's ICU support covers every
// IANA zone) — no moment-timezone/date-fns-tz needed. Not India-specific:
// every function takes the IANA timezone string as a parameter, so a
// future non-Asia/Kolkata branch works identically, no code change.

interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function getLocalParts(timezone: string, at: Date): LocalParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = fmt.formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  // Intl reports hour '24' at local midnight-to-1am boundary in some
  // engines under hour12:false — normalize to 0.
  const hour = get('hour');
  return {
    year: get('year'), month: get('month'), day: get('day'),
    hour: hour === 24 ? 0 : hour, minute: get('minute'), second: get('second'),
  };
}

// "YYYY-MM-DD" in the branch's local timezone — the exact string shape
// Booking.date already uses everywhere else in this codebase.
export function getBranchLocalDateStr(timezone: string, at: Date = new Date()): string {
  const p = getLocalParts(timezone, at);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

// How many seconds remain until this branch's next local midnight — the
// TTL a daily capacity counter must expire at, so it resets exactly when a
// new business day starts locally, never on a rolling 24h window from
// whenever the first booking happened to land.
export function secondsUntilNextLocalMidnight(timezone: string, at: Date = new Date()): number {
  const p = getLocalParts(timezone, at);
  const secondsSinceLocalMidnight = p.hour * 3600 + p.minute * 60 + p.second;
  const remaining = 86400 - secondsSinceLocalMidnight;
  // Guard against a pathological 0 (would make Redis EXPIRE a no-op /
  // delete-immediately) — always at least 1 second.
  return remaining > 0 ? remaining : 86400;
}

// Pure calendar-date string arithmetic — "YYYY-MM-DD" strings sort/compare
// lexically as real dates, so date range checks elsewhere just use plain
// string comparison; this is only needed for "N days from now".
export function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  // Constructed as UTC noon specifically to dodge any DST-adjacent
  // date-rollover ambiguity from local-timezone Date arithmetic — this is
  // pure calendar-day addition on a YYYY-MM-DD string, not a real instant,
  // so there's no "local time" to preserve here at all.
  const d2 = new Date(Date.UTC(y, (m - 1), d, 12, 0, 0));
  d2.setUTCDate(d2.getUTCDate() + days);
  return d2.toISOString().slice(0, 10);
}
