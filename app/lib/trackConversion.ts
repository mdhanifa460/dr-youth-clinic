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

// Fires the one event that actually matters for ad-spend attribution — a
// successful booking. Pushes to GTM's dataLayer (the primary path once an
// admin has GTM configured — see app/layout.tsx's gtmActive gate) AND
// calls gtag/fbq directly as a fallback for a clinic still using direct
// GA4/Meta Pixel with GTM off — those direct calls naturally no-op when
// GTM is the active layer, since gtag/fbq are never defined on the page
// in that case (GA4/Meta Pixel's direct-load Scripts are skipped
// whenever gtmActive is true), so this never double-fires either path.
export function trackBookingConversion(params: { bookingId: string; service?: string; location?: string }) {
  if (typeof window === 'undefined') return;

  pushDataLayerEvent('booking_confirmed', {
    booking_id: params.bookingId,
    service: params.service,
    location: params.location,
  });

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
