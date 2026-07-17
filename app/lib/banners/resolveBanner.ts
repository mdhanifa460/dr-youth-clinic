import { connectDB } from "@/app/lib/mongodb";
import { Banner } from "@/app/models/Banner";
import type { BannerDoc } from "@/app/lib/banners/types";

export type BannerSlot =
  | { page: "homepage" }
  | { page: "location"; location: string }
  | { page: "service"; location: string; service: string };

// Derives the admin-list-display-only `targetPages` field from the three
// show*Page booleans that are the actual source of truth — called
// explicitly by the admin API route handlers on every create/update, since
// this codebase's CRUD convention (findByIdAndUpdate) does not trigger
// Mongoose 'save' middleware (see the note in app/models/Banner.ts).
export function deriveTargetPages(banner: {
  showOnHomepage?: boolean;
  showOnLocationPage?: boolean;
  showOnServicePage?: boolean;
}): ("homepage" | "location" | "service")[] {
  const pages: ("homepage" | "location" | "service")[] = [];
  if (banner.showOnHomepage) pages.push("homepage");
  if (banner.showOnLocationPage) pages.push("location");
  if (banner.showOnServicePage) pages.push("service");
  return pages;
}

function timeStringToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// Handles overnight windows (e.g. 22:00-02:00) by checking whether `now`
// falls in either segment when start > end.
function inTimeWindow(nowMinutes: number, start: string, end: string): boolean {
  const s = timeStringToMinutes(start);
  const e = timeStringToMinutes(end);
  if (s <= e) return nowMinutes >= s && nowMinutes <= e;
  return nowMinutes >= s || nowMinutes <= e;
}

// The admin's <input type="date"> submits a midnight timestamp
// ("YYYY-MM-DDT00:00:00.000Z"); comparing that directly against `now` for an
// END bound would make the banner disappear at the START of its last day
// instead of running through it. Every *End* comparison below uses this to
// mean "through the end of that calendar day."
function endOfDayUTC(date: Date | string): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

// now = new Date() uses the server's local time (UTC on Vercel by default).
// No timezone conversion in v1 — consistent with Offer.validUntil, which
// has the exact same caveat and has never needed one. Smart-rule
// day-of-week/time-window fields in the admin UI should be labeled as
// "evaluated in UTC" rather than silently assumed to be IST.
function matchesSchedule(b: Pick<any, "startDate" | "endDate">, now: Date): boolean {
  if (b.startDate && new Date(b.startDate) > now) return false;
  if (b.endDate && endOfDayUTC(b.endDate) < now) return false;
  return true;
}

// A banner with no smartRules attached (undefined) is always eligible —
// this is the documented fallback/default behavior. A banner WITH
// smartRules but every sub-field empty behaves identically (avoids a
// footgun where an accidentally-empty rules object silently disables a
// banner). Every present sub-condition must pass (AND).
function matchesSmartRules(rules: any, now: Date): boolean {
  if (!rules) return true;

  if (Array.isArray(rules.daysOfWeek) && rules.daysOfWeek.length > 0) {
    if (!rules.daysOfWeek.includes(now.getDay())) return false;
  }

  // A one-sided window (only start or only end set) still expresses a real
  // restriction — "from 22:00 onward" or "until 06:00" — rather than being
  // silently ignored just because its sibling field is empty.
  if (rules.timeWindowStart || rules.timeWindowEnd) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const start = rules.timeWindowStart || "00:00";
    const end = rules.timeWindowEnd || "23:59";
    if (!inTimeWindow(nowMinutes, start, end)) return false;
  }

  if (rules.dateRangeStart && new Date(rules.dateRangeStart) > now) return false;
  if (rules.dateRangeEnd && endOfDayUTC(rules.dateRangeEnd) < now) return false;

  return true;
}

// Resolves the single highest-priority banner eligible for a given slot, or
// null when nothing matches — the caller (a homepage/location/service page
// server component) treats null as "render the existing hardcoded hero
// instead." Queries Mongoose directly (no public REST hop), matching how
// these pages already fetch all their other content.
export async function resolveBanner(slot: BannerSlot): Promise<BannerDoc | null> {
  try {
    await connectDB();

    const query: Record<string, any> = { status: "active" };

    if (slot.page === "homepage") {
      query.showOnHomepage = true;
    } else if (slot.page === "location") {
      query.showOnLocationPage = true;
      query.$or = [{ targetLocations: { $size: 0 } }, { targetLocations: slot.location }];
    } else {
      query.showOnServicePage = true;
      // Both service AND location targeting apply to a service-page banner
      // — combined explicitly as two ANDed $or conditions rather than a mix
      // of top-level $or/$and keys, so the intent (both must match) is
      // unambiguous.
      query.$and = [
        { $or: [{ targetServices: { $size: 0 } }, { targetServices: slot.service }] },
        { $or: [{ targetLocations: { $size: 0 } }, { targetLocations: slot.location }] },
      ];
    }

    const candidates = await (Banner as any).find(query).sort({ priority: -1 }).lean();
    if (!candidates.length) return null;

    const now = new Date();
    const eligible = candidates.filter((b: any) => matchesSchedule(b, now) && matchesSmartRules(b.smartRules, now));

    return (eligible[0] as BannerDoc) ?? null;
  } catch {
    // Never let a banner-resolution failure break the page it's decorating
    // — fall back to the existing hardcoded hero exactly as if no banner
    // were configured.
    return null;
  }
}
