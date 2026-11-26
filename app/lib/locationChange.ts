'use client';

// When the visitor's branch changes on the current page (they tap a clinic or use
// "Near me" on the homepage), the footer, phone, WhatsApp button and navbar have
// already read the preferred_location cookie once on mount. This event tells them
// to read it again, so the whole page switches branch together without a reload.
import { useEffect, useState } from 'react';

export const LOCATION_CHANGE_EVENT = 'preferred-location-change';

export function announceLocationChange() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(LOCATION_CHANGE_EVENT));
}

// Returns a number that goes up each time the branch changes. Add it to an
// effect's dependencies to re-read the cookie.
export function useLocationChangeVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener(LOCATION_CHANGE_EVENT, bump);
    return () => window.removeEventListener(LOCATION_CHANGE_EVENT, bump);
  }, []);
  return version;
}
