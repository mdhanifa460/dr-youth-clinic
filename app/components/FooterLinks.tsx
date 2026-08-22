'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { resolveFooterHref, resolveFooterLocation, LOCATION_COOKIE } from '@/app/lib/footerLinks';

// Client-side location resolution for the Footer's Quick Links / Our
// Procedures columns — the ONLY part of Footer.tsx that actually needs to
// know the visitor's city. Footer.tsx itself stays a Server Component (it
// does real data-driven rendering from `data`/`siteConfig`); this is split
// out specifically because calling headers()/cookies() in that Server
// Component caused a real, confirmed production incident (500s on every
// /[city]/services/[category] page — see Footer.tsx's own comment for the
// full writeup). Footer.tsx was left calling
// resolveFooterLocation("", "") — always the empty-string fallback,
// always "chennai" — as a deliberate short-term safety measure, but that
// meant EVERY visitor on EVERY page (confirmed live even on /bangalore)
// saw Chennai-scoped Procedures/Contact links. This closes that gap the
// same safe way Navbar.tsx already resolves its own city-aware links:
// usePathname() (identical on server and client, no hydration risk) as
// the first-render value, refined from the preferred_location cookie only
// inside a post-mount effect (document.cookie doesn't exist during SSR).
export default function FooterLinks({
  heading,
  links,
}: {
  heading: string;
  links: { href: string; label: string }[];
}) {
  const pathname = usePathname();
  const [location, setLocation] = useState(() => resolveFooterLocation(pathname, ''));

  useEffect(() => {
    const match = document.cookie.match(new RegExp(`(?:^|; )${LOCATION_COOKIE}=([^;]+)`));
    const cookieValue = match ? decodeURIComponent(match[1]) : '';
    setLocation(resolveFooterLocation(pathname, cookieValue));
  }, [pathname]);

  return (
    <div>
      <h4 className="text-sm font-bold mb-5 tracking-wide">{heading}</h4>
      <ul className="space-y-3">
        {links.map((l, i) => (
          <li key={i}>
            <Link
              href={resolveFooterHref(l.href, l.label, location)}
              className="block py-1.5 text-white/60 text-sm hover:text-white transition"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
