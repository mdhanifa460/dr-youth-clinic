'use client';

import { useEffect } from 'react';

// See app/not-found.tsx's comment and app/api/domain-migration/check-redirect/
// route.ts's comment for why this check runs client-side via an API call
// instead of a headers()-reading server component: this only ever fires
// after the 404 shell has already rendered, so it can't affect any other
// page's static generation. permanentRedirect()'s 308 became
// window.location.replace() — no real difference for an old, low-traffic
// migrated URL, and search engines still land on the final URL either way.
export default function NotFoundRedirectCheck() {
  useEffect(() => {
    const path = window.location.pathname;
    fetch(`/api/domain-migration/check-redirect?path=${encodeURIComponent(path)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.redirectUrl) window.location.replace(d.redirectUrl);
      })
      .catch(() => {});
  }, []);

  return null;
}
