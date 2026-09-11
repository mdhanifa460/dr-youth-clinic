// Centralizes how every booking-creation entry point navigates to the
// fixed-path "thank you" page (app/(public)/book/success/page.tsx).
//
// bookingId used to travel as a ?bookingId=... query param on that URL —
// a deliberate earlier design (see that page's own comment) so an
// external ad tool could configure "Thank You Page" conversion tracking
// against ONE stable path instead of a per-booking dynamic route. That
// still left a real problem, reported live: at least one ad platform's
// thank-you-page trigger only supports an EXACT URL match, not "URL
// contains" — and since bookingId is different on every booking, an
// exact-match rule against it can only ever match the one sample URL it
// was configured with, never a real conversion again. The fix: the URL
// is now genuinely, permanently static (bare /book/success, no query
// string at all, ever) and bookingId travels in a short-lived cookie
// instead, read server-side by the success page.
//
// This changes NOTHING about our own conversion tracking — see
// app/lib/trackConversion.ts's own comment: trackBookingConversion()
// already fires from the booking-creation response itself, never from a
// page view of /book/success. This cookie exists purely so the success
// page can still look up and display the right booking's details, and so
// a THIRD-PARTY platform's own page-load-based trigger has a truly
// static URL to match against.
//
// bookingId is not a secret (it was already visible in the URL, browser
// history, and server logs under the old design) — this is a transport
// change, not a new trust boundary.
export const BOOKING_SUCCESS_ID_COOKIE = "booking_success_id";

interface RouterLike {
  push: (href: string) => void;
}

// Short-lived: just long enough to survive the redirect + the success
// page's first load, never meant to persist as a real session.
const COOKIE_MAX_AGE_SECONDS = 120;

export function goToBookingSuccess(router: RouterLike, bookingId: string) {
  document.cookie = `${BOOKING_SUCCESS_ID_COOKIE}=${encodeURIComponent(bookingId)}; path=/book; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
  router.push("/book/success");
}
