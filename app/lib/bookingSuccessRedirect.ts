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
// was configured with, never a real conversion again. The fix: bookingId
// now travels in a short-lived cookie instead, read server-side by the
// success page — never in the URL.
//
// `location` is a DIFFERENT case and deliberately handled the opposite
// way — back in the visible URL, not a cookie. It's a small, fixed set
// (chennai/bangalore/coimbatore/kochi), and each branch's own ad
// campaigns only ever send traffic that converts under that one branch —
// so from any single campaign's point of view, "?location=bangalore" IS
// a completely static string across every one of its real conversions.
// That's what makes it safe to put back in the URL without reintroducing
// the bookingId problem: marketing needs branch-wise conversion rules
// (one exact-match Thank-You-Page URL per branch campaign), and a cookie
// is invisible to an ad platform's own "Page URL" based trigger/variable
// — only the literal address-bar URL works for that. The success PAGE
// itself still ignores this param and always reads the real branch off
// the Booking record server-side (see that page's own comment) — this
// exists purely for external tools reading the visible URL.
//
// This changes NOTHING about our own conversion tracking — see
// app/lib/trackConversion.ts's own comment: trackBookingConversion()
// already fires from the booking-creation response itself, never from a
// page view of /book/success. The cookie exists purely so the success
// page can still look up and display the right booking's details, and so
// a THIRD-PARTY platform's own page-load-based trigger has a truly
// static URL to match against for bookingId's part of the problem.
//
// Neither bookingId nor location is a secret (both were already visible
// in the URL/browser history/server logs under earlier designs) — this
// is a transport choice per value, not a new trust boundary.
export const BOOKING_SUCCESS_ID_COOKIE = "booking_success_id";

interface RouterLike {
  push: (href: string) => void;
}

// Short-lived: just long enough to survive the redirect + the success
// page's first load, never meant to persist as a real session.
const COOKIE_MAX_AGE_SECONDS = 120;

export function goToBookingSuccess(router: RouterLike, bookingId: string, location?: string) {
  document.cookie = `${BOOKING_SUCCESS_ID_COOKIE}=${encodeURIComponent(bookingId)}; path=/book; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
  const loc = (location || "").trim().toLowerCase();
  router.push(loc ? `/book/success?location=${encodeURIComponent(loc)}` : "/book/success");
}
