type HoursRow = { day: string; hours: string };

const WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function toMinutes(h: string, m: string, ap: string) {
  return ((Number(h) % 12) + (ap.toUpperCase() === 'PM' ? 12 : 0)) * 60 + Number(m);
}

function covers(rowDay: string, weekday: number) {
  const day = rowDay.toLowerCase();
  const range = day.match(/([a-z]+)\s*[-–]\s*([a-z]+)/);
  const index = (d: string) => WEEK.findIndex((w) => w.startsWith(d.slice(0, 3)));
  if (range) {
    const from = index(range[1]);
    const to = index(range[2]);
    return from >= 0 && to >= 0 && weekday >= from && weekday <= to;
  }
  return day.startsWith(WEEK[weekday].slice(0, 3));
}

function label(minutes: number) {
  const h24 = Math.floor(minutes / 60);
  const h12 = h24 % 12 || 12;
  return `${String(h12).padStart(2, '0')}:00 ${h24 >= 12 ? 'PM' : 'AM'}`;
}

// Hourly slots inside the branch's own hours for that date. The last slot starts
// an hour before closing. Empty means the branch is closed that day.
export function slotsForDate(date: string, hours: HoursRow[]): string[] {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return [];
  const row = hours.find((h) => covers(h.day, parsed.getDay()));
  const time = row?.hours.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*[-–]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!time) return [];
  const open = toMinutes(time[1], time[2], time[3]);
  const close = toMinutes(time[4], time[5], time[6]);
  const slots: string[] = [];
  for (let m = Math.ceil(open / 60) * 60; m + 60 <= close; m += 60) slots.push(label(m));
  return slots;
}
