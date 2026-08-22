'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MdLocationOn, MdPhone, MdEmail } from 'react-icons/md';
import { resolveFooterLocation, LOCATION_COOKIE } from '@/app/lib/footerLinks';

// The Footer's "Contact Us" address/phone used to be one fixed value for
// every visitor (whatever an admin typed into Homepage → Footer — Chennai
// by default), regardless of which branch they were actually looking at.
// Same fix, same reasoning, as FooterLinks.tsx: resolve the visitor's
// branch client-side (usePathname() first, refined by the
// preferred_location cookie post-mount — identical to Navbar.tsx's
// already-proven pattern, no hydration mismatch since the URL-based first
// value is identical on server and client), then fetch that branch's own
// address/phone from app/api/branch-contact. The admin-configured
// defaults (props) are the fallback for a location with nothing of its
// own set, AND what's shown for the one render before the fetch resolves.
export default function ContactInfo({
  defaultAddress,
  defaultPhone,
  defaultEmail,
}: {
  defaultAddress?: string;
  defaultPhone?: string;
  defaultEmail?: string;
}) {
  const pathname = usePathname();
  const [location, setLocation] = useState(() => resolveFooterLocation(pathname, ''));
  const [address, setAddress] = useState(defaultAddress || '');
  const [phone, setPhone] = useState(defaultPhone || '');

  useEffect(() => {
    const match = document.cookie.match(new RegExp(`(?:^|; )${LOCATION_COOKIE}=([^;]+)`));
    const cookieValue = match ? decodeURIComponent(match[1]) : '';
    setLocation(resolveFooterLocation(pathname, cookieValue));
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/branch-contact?location=${location}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled || !d.success) return;
        setAddress(d.data.address || defaultAddress || '');
        setPhone(d.data.phone || defaultPhone || '');
      })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  return (
    <ul className="space-y-4">
      {address && (
        <li className="flex gap-2.5 text-white/60 text-sm leading-relaxed">
          <MdLocationOn className="text-[#F5A623] shrink-0 mt-0.5" size={16} />
          <span>{address}</span>
        </li>
      )}
      {phone && (
        <li>
          <a href={`tel:${phone.replace(/\s/g, '')}`} className="flex gap-2.5 text-white/60 text-sm hover:text-white transition">
            <MdPhone className="text-[#F5A623] shrink-0 mt-0.5" size={16} />
            {phone}
          </a>
        </li>
      )}
      {defaultEmail && (
        <li>
          <a href={`mailto:${defaultEmail}`} className="flex gap-2.5 text-white/60 text-sm hover:text-white transition">
            <MdEmail className="text-[#F5A623] shrink-0 mt-0.5" size={16} />
            {defaultEmail}
          </a>
        </li>
      )}
    </ul>
  );
}
