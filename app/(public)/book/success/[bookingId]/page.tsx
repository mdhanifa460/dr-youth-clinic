import { redirect } from 'next/navigation';

// This dynamic-path route is kept only for backward compatibility with any
// already-shared/bookmarked /book/success/{bookingId} link — every new
// booking now goes straight to a bare, genuinely static /book/success
// instead, with bookingId carried in a cookie rather than the URL at all
// (see app/lib/bookingSuccessRedirect.ts's own comment for why: external
// ad-tool "Thank You Page" URL matching needs one truly stable, exact-
// match URL, and even a query param that changes per booking broke that).
// This old link still redirects to the ?bookingId= query-param shape —
// nothing sets the cookie for a link being opened fresh — which the
// success page accepts as a fallback specifically to keep this working.
//
// The redirect() call below is NOT what actually performs this in
// production — middleware.ts's own explicit check for this exact path
// shape runs first and redirects before this component ever renders. That
// duplication is deliberate: verified live against a real production
// build that this page's own redirect()/notFound() calls silently return
// 200 with no Location header instead of a real redirect (the same
// confirmed Next.js 14.2.35 bug middleware.ts's Domain Migration check
// already works around for a different route) — this call stays only as
// a harmless, inert fallback in case that middleware check is ever
// removed or its matcher changes, not as the real mechanism.
export default function LegacyBookingSuccessRedirect({ params }: { params: { bookingId: string } }) {
  redirect(`/book/success?bookingId=${encodeURIComponent(params.bookingId)}`);
}
