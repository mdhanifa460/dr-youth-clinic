import { locations } from '@/app/data/locations';

// The single canonical list of real clinic branch slugs — derived from
// app/data/locations.ts (the one place branch display data already lives)
// rather than yet another hardcoded copy. middleware.ts and
// app/api/admin/intelligence/route.ts each keep their own literal
// ['chennai','bangalore','coimbatore','kochi'] array; this file doesn't
// replace those (touching middleware's working geo-detection logic is out
// of scope and risky — see this repo's own redirect-loop incident), it's
// only for new analytics code that needs to normalize free-text location
// values written inconsistently across Lead/Booking entry points.
export const BRANCH_SLUGS = Object.keys(locations);

// Lead.preferredClinic/clinicLocation/city and Booking.location are all
// unvalidated free-text strings, populated inconsistently across entry
// points (lowercase slug in one form, capitalized label in another,
// occasional stray text). Resolves any of those down to one of the 4 real
// branch slugs, or null if it doesn't match one — callers decide how to
// bucket the null case (usually 'unknown') rather than silently dropping
// the record.
export function canonicalizeLocation(raw?: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  if (BRANCH_SLUGS.includes(v)) return v;
  // Tolerate minor free-text variants, e.g. "Chennai Clinic" or "chennai-anna-nagar".
  const match = BRANCH_SLUGS.find(slug => v.includes(slug));
  return match || null;
}
