'use client';

import { useEffect } from 'react';
import {
  AUTO_MAX_ACCURACY_M,
  AUTO_MAX_DISTANCE_KM,
  isManualBranch,
  nearestClinic,
  saveBranch,
} from '@/app/lib/branchPreference';

// Runs on every public page (mounted in the public layout). If the visitor has
// ALREADY allowed location for this site, their precise position decides the
// branch, which beats the IP guess (office networks, VPNs and Zscaler often look
// like another city). It never shows a permission prompt, and never replaces a
// clinic the visitor picked themselves.
export default function LocationAutoDetect() {
  useEffect(() => {
    if (isManualBranch()) return;
    if (!navigator?.permissions?.query || !navigator?.geolocation) return;
    let cancelled = false;
    navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        if (cancelled || status.state !== 'granted') return;
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => {
            if (cancelled || isManualBranch()) return;
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
