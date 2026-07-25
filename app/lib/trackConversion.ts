'use client';

// Fires the one event that actually matters for ad-spend attribution — a
// successful booking — through whichever pixels Settings → Analytics has
// configured (GA4/gtag and/or Meta Pixel/fbq, both already loaded in
// app/layout.tsx when their IDs are set). No-ops safely if a pixel isn't
// configured or hasn't loaded yet, so this is safe to call unconditionally
// from every booking success path.
export function trackBookingConversion(params: { bookingId: string; service?: string; location?: string }) {
  if (typeof window === 'undefined') return;

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
