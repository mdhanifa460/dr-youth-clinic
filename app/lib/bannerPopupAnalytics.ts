'use client';

// Flash Offer Popup analytics — the PRIMARY signal is the dedicated
// BannerPopupEvent collection (works regardless of whether the clinic has
// GA4/GTM configured); pushDataLayerEvent is fired alongside as an
// independent bonus signal for clinics that do have GTM active, never a
// replacement for the primary call. Same fire-and-forget
// fetch(...).catch(()=>{}) shape as postInterestEvent()
// (app/lib/personalization.ts).
import { pushDataLayerEvent } from '@/app/lib/trackConversion';
import type { BannerPopupEventType } from '@/app/models/BannerPopupEvent';

export function postBannerPopupEvent(
  eventType: BannerPopupEventType,
  payload: { bannerId: string; offerName: string; page: string; source?: string }
) {
  try {
    fetch('/api/banner-popup-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bannerId: payload.bannerId,
        eventType,
        offerName: payload.offerName,
        page: payload.page,
        source: payload.source || 'homepage-load',
      }),
    }).catch(() => {});
  } catch {
    // Tracking must never throw into the calling page.
  }

  pushDataLayerEvent(eventType, {
    offerId: payload.bannerId,
    offerName: payload.offerName,
    presentationMode: 'flash-popup',
    page: payload.page,
    source: payload.source || 'homepage-load',
  });
}
