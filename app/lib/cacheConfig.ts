// Time-based expiry for unstable_cache entries whose tag is ALSO revalidated
// on demand (revalidateTag) by every route that writes that data. For those
// entries the timer is only a safety net — admin edits still show up
// immediately — so it can be long. Each expiry that a visitor (or crawler)
// hits makes Vercel re-render and re-write the entry, and those ISR Writes
// were the largest line on the Vercel bill with 60–300s timers.
//
// Entries whose tag has NO revalidateTag caller anywhere (page-seo,
// location-content, faqs, bookings, academy-*) keep their short timers —
// for them the timer is the only way new data appears.
export const CACHE_SAFETY_NET_SECONDS = 3600;
