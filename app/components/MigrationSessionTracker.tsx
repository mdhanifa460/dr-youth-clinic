'use client';

import { useEffect } from 'react';
import { pushDataLayerEvent } from '@/app/lib/trackConversion';
import { MIGRATION_FIRST_COOKIE, parseMigrationCookie } from '@/app/lib/migrationAttribution';

// Fires once per browser session (sessionStorage-gated — not on every
// page navigation) when the migration_first cookie is present, pushing
// its source/from onto GTM's dataLayer via the existing
// pushDataLayerEvent() helper (same one booking_confirmed etc. already
// use). This is what makes an old-domain-origin session queryable from
// GA4's Data API (app/lib/googleAnalytics.ts's `migrated` slice) at all —
// GA4 has no built-in concept of migration_source, it only sees whatever
// GTM is configured to forward as a custom event parameter.
//
// Inert until an admin does a one-time, no-code GTM setup step (map this
// event's migration_source/migration_from parameters to a GA4 Event tag
// with matching custom dimensions) — see Admin → Marketing Intelligence →
// Domain Migration for the exact instructions. Until then this still
// fires harmlessly into dataLayer, same as any other push nothing is
// currently reading.
export default function MigrationSessionTracker() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (sessionStorage.getItem('migration_event_sent')) return;

      const raw = document.cookie
        .split('; ')
        .find((c) => c.startsWith(`${MIGRATION_FIRST_COOKIE}=`))
        ?.slice(MIGRATION_FIRST_COOKIE.length + 1);
      if (!raw) return;

      const touch = parseMigrationCookie(decodeURIComponent(raw));
      if (!touch) return;

      pushDataLayerEvent('migration_session', {
        migration_source: touch.source,
        migration_from: touch.from,
      });
      sessionStorage.setItem('migration_event_sent', '1');
    } catch {
      // Tracking must never break the page it's mounted on.
    }
  }, []);

  return null;
}
