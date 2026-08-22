import Image from "next/image";
import Link from "next/link";
import { HOMEPAGE_DEFAULTS } from "@/app/lib/homepageDefaults";
import FooterLinks from "@/app/components/FooterLinks";
import ContactInfo from "@/app/components/ContactInfo";
import type { SiteConfig } from "@/app/lib/siteConfig";

const DEFAULT_LOGO_URL = `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/f_webp,q_auto,w_300/logo_l7n0ai.png`;

// Every column, the bottom-bar links, and the copyright line all come
// from `data` (a HomepageSection document, edited at Admin → Homepage →
// Footer) — nothing here is hardcoded content, only structure/styling.
// Social icons are deliberately NOT shown here — they're already in
// TopBar, and repeating them in the footer was redundant.
export default async function Footer({ data, siteConfig }: { data?: any; siteConfig?: SiteConfig }) {
  const resolvedData = data ?? HOMEPAGE_DEFAULTS.footer.data;
  const logoUrl = siteConfig?.logoUrl || DEFAULT_LOGO_URL;

  const {
    tagline = "",
    quickLinksHeading = "Quick Links",
    quickLinks = [],
    proceduresHeading = "Our Procedures",
    procedures = [],
    patientCareHeading = "Patient Care",
    patientCare = [],
    contactHeading = "Contact Us",
    contact = {},
    copyright = `© ${new Date().getFullYear()} DR Youth Clinic. All Rights Reserved.`,
    bottomLinks = HOMEPAGE_DEFAULTS.footer.data.bottomLinks,
  } = resolvedData;

  return (
    <footer className="bg-[#0B2560] text-white">
      <div className="max-w-7xl mx-auto px-6 md:px-10 pt-16 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-10">

          {/* COL 1 — BRAND */}
          <div className="md:col-span-1 space-y-5">
            <Link href="/" className="inline-block">
              <Image
                src={logoUrl}
                alt="DR Youth Clinic"
                width={130}
                height={44}
                className="object-contain brightness-0 invert"
              />
            </Link>
            <p className="text-white/60 text-sm leading-relaxed">{tagline}</p>
          </div>

          {/* COL 2 — QUICK LINKS */}
          <FooterLinks heading={quickLinksHeading} links={quickLinks} />

          {/* COL 3 — OUR PROCEDURES */}
          <FooterLinks heading={proceduresHeading} links={procedures} />

          {/* COL 4 — PATIENT CARE */}
          <div>
            <h4 className="text-sm font-bold mb-5 tracking-wide">{patientCareHeading}</h4>
            <ul className="space-y-3">
              {patientCare.map((p: any, i: number) => (
                <li key={i}>
                  <Link
                    href={p.href}
                    className="block py-1.5 text-white/60 text-sm hover:text-white transition"
                  >
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* COL 5 — CONTACT */}
          <div>
            <h4 className="text-sm font-bold mb-5 tracking-wide">{contactHeading}</h4>
            {/* Address/phone now resolve to the VISITOR'S actual branch
                (client-side — see ContactInfo.tsx for why, same reasoning
                as FooterLinks.tsx), not one fixed branch's info for every
                visitor. `contact.address`/`contact.phone` (the admin's
                Homepage → Footer default) are the fallback shown before
                that resolves and for a branch with nothing of its own set.
                Email has no per-branch concept in this schema — stays the
                one admin-configured address. */}
            <ContactInfo defaultAddress={contact.address} defaultPhone={contact.phone} defaultEmail={contact.email} />
          </div>
        </div>

        {/* BOTTOM BAR */}
        <div className="mt-12 pt-6 border-t border-white/10 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/60 text-xs">{copyright}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-5 gap-y-2">
            {bottomLinks.map((l: any, i: number) => (
              <Link
                key={i}
                href={l.href}
                className={l.accent
                  ? "text-[#F5A623]/70 text-xs hover:text-[#F5A623] transition font-medium"
                  : "text-white/60 text-xs hover:text-white/90 transition"}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
