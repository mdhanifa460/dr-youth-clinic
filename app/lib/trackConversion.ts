'use client';

// Generic event push — always safe to call regardless of whether GTM is
// actually loaded on this page (a no-op array push if nothing's reading
// dataLayer yet). This is the primary path once GTM is the active
// tracking layer: an admin adds a GTM trigger matching `event` and routes
// it to GA4 / Meta Pixel / Google Ads / anywhere else from inside the GTM
// container, with zero further code changes needed on this end.
export function pushDataLayerEvent(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  try {
    const w = window as any;
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ event, ...params });
  } catch {
    // Tracking must never break the page it's called from.
  }
}

export interface BookingConversionParams {
  bookingId: string;
  service?: string;
  location?: string;
  // Attribution — resolved server-side (see app/lib/utmAttribution.ts) and
  // handed back on the booking-creation response; passed straight through
  // here, never re-derived client-side.
  source?: string;
  medium?: string;
  campaign?: string;
  sourceAccount?: string;
  // True when this success response is a replay of an already-processed
  // idempotent request (see app/lib/bookingIdempotency.ts) — a retry after
  // a lost response, NOT a second booking. When true, booking_completed is
  // skipped below so a retry never double-counts a conversion.
  alreadyProcessed?: boolean;
}

// The exact param set for the `booking_completed` GA4/GTM event — pure and
// separately unit-testable. Omits any field that's empty/undefined rather
// than sending a blank value GTM would otherwise forward to GA4 as a real
// (empty) event parameter. `branch` and `location` are deliberately the
// same value under two keys — the app's own field is `location`, but GTM/
// GA4 configuration may reference either name.
export function buildBookingCompletedParams(params: BookingConversionParams): Record<string, string> {
  const out: Record<string, string> = { booking_id: params.bookingId };
  if (params.location) {
    out.branch = params.location;
    out.location = params.location;
  }
  if (params.source) out.source = params.source;
  if (params.sourceAccount) out.source_account = params.sourceAccount;
  if (params.campaign) out.campaign = params.campaign;
  if (params.medium) out.medium = params.medium;
  return out;
}

// Fires the one event that actually matters for ad-spend attribution — a
// successful booking. Pushes to GTM's dataLayer (the primary path once an
// admin has GTM configured — see app/layout.tsx's gtmActive gate) AND
// calls gtag/fbq directly as a fallback for a clinic still using direct
// GA4/Meta Pixel with GTM off — those direct calls naturally no-op when
// GTM is the active layer, since gtag/fbq are never defined on the page
// in that case (GA4/Meta Pixel's direct-load Scripts are skipped
// whenever gtmActive is true), so this never double-fires either path.
export function trackBookingConversion(params: BookingConversionParams) {
  if (typeof window === 'undefined') return;

  pushDataLayerEvent('booking_confirmed', {
    booking_id: params.bookingId,
    service: params.service,
    location: params.location,
  });

  // booking_completed — the canonical, single-source-of-truth booking
  // conversion event: GTM Custom Event Trigger → GA4 Event Tag → GA4 Key
  // Event → optional Google Ads import. Additive alongside booking_confirmed
  // above (which keeps firing unchanged for whatever it's already wired to
  // in the live GTM container) rather than a rename, so nothing already
  // live can break. Only ever called right after a successful booking-
  // creation POST response — never on a page view of /book/success/{id} —
  // so a manually reopened success URL can never create a fake conversion.
  // Skipped on a replayed idempotent response so a retry never fires twice
  // for the same booking.
  if (!params.alreadyProcessed) {
    pushDataLayerEvent('booking_completed', buildBookingCompletedParams(params));
  }

  const w = window as any;

  try {
    if (typeof w.gtag === 'function') {
      w.gtag('event', 'booking_confirmed', {
        transaction_id: params.bookingId,
        service: params.service,
        location: params.location,
      });
    }
  } catch {
    // Never let a broken pixel break the booking success flow itself.
  }

  try {
    if (typeof w.fbq === 'function') {
      w.fbq('track', 'Schedule', {
        content_name: params.service,
        content_category: params.location,
      });
    }
  } catch {
    // Same as above.
  }
}
