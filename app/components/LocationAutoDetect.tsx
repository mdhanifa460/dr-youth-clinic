'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { locations } from '@/app/data/locations';
import {
  AUTO_MAX_ACCURACY_M,
  AUTO_MAX_DISTANCE_KM,
  nearestClinic,
  readCookie,
  saveBranch,
} from '@/app/lib/branchPreference';

// Mounted in the public layout, so it runs on every public page.
export default function LocationAutoDetect() {
  const pathname = usePathname();

  // Opening a city page (/kochi, /kochi/services/...) is the clearest sign of
  // which branch the visitor wants. Saved here, when the page really renders,
  // and not in middleware, which can't tell a visit from a link prefetch.
  useEffect(() => {
    const segment = (pathname || '').split('/')[1]?.toLowerCase() || '';
    if (!locations[segment]) return;
    if (readCookie('preferred_location') === segment && readCookie('preferred_location_src')) return;
    saveBranch(segment, 'city');
  }, [pathname]);

  // If the visitor has ALREADY allowed location for this site, their precise
  // position decides the branch, which beats the IP guess (office networks,
  // VPNs and Zscaler often look like another city). It never shows a permission
  // prompt, and never replaces a clinic the visitor tapped or a city page they
  // opened. Runs once per full page load.
  useEffect(() => {
    if (!navigator?.permissions?.query || !navigator?.geolocation) return;
    const deliberate = () => ['manual', 'city'].includes(readCookie('preferred_location_src'));
    if (deliberate()) return;
    let cancelled = false;
    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        if (cancelled || status.state !== 'granted') return;
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            if (cancelled || deliberate()) return;
            const { key, km } = nearestClinic(coords.latitude, coords.longitude);
            if (coords.accuracy > AUTO_MAX_ACCURACY_M || km > AUTO_MAX_DISTANCE_KM) return;
            saveBranch(key, 'gps');
          },
          () => {},
          { timeout: 8000, maximumAge: 300_000 },
        );
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return null;
}
