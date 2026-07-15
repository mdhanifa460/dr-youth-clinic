import Image from "next/image";
import Link from "next/link";
import {
  FaFacebookF,
  FaInstagram,
  FaYoutube,
  FaWhatsapp,
  FaTwitter,
} from "react-icons/fa";
import { MdLocationOn, MdPhone, MdEmail } from "react-icons/md";
import { HOMEPAGE_DEFAULTS } from "@/app/lib/homepageDefaults";
import type { SiteConfig } from "@/app/lib/siteConfig";

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  facebook: <FaFacebookF size={13} />,
  instagram: <FaInstagram size={13} />,
  youtube: <FaYoutube size={13} />,
  whatsapp: <FaWhatsapp size={13} />,
  twitter: <FaTwitter size={13} />,
};

// Data is fetched once in PublicLayout and passed down — no DB call here
export default async function Footer({ data, siteConfig }: { data?: any; siteConfig?: SiteConfig }) {
  const resolvedData = data ?? HOMEPAGE_DEFAULTS.footer.data;

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
    copyright = "© 2024 DR Youth Clinic. All Rights Reserved.",
    socialLinks = [],
  } = resolvedData;

  // Merge brand URLs from Settings as fallback when homepage editor link is '#' or empty
  const BRAND_FALLBACK: Record<string, string> = {
    instagram: siteConfig?.instagramUrl || '',
    facebook:  siteConfig?.facebookUrl  || '',
    youtube:   siteConfig?.youtubeUrl   || '',
  };
  const resolvedSocialLinks = socialLinks.map((s: any) => ({
    ...s,
    url: (!s.url || s.url === '#') ? (BRAND_FALLBACK[s.platform] || '#') : s.url,
  })).filter((s: any) => s.url && s.url !== '#');

  return (
    <footer className="bg-[#0B2560] text-white">
      <div className="max-w-7xl mx-auto px-6 md:px-10 pt-16 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-10">

          {/* COL 1 — BRAND */}
          <div className="md:col-span-1 space-y-5">
            <Link href="/" className="inline-block">
              <Image
                src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/f_webp,q_auto,w_300/logo_l7n0ai.png`}
                alt="DR Youth Clinic"
                width={130}
                height={44}
                className="object-contain brightness-0 invert"
              />
            </Link>
            <p className="text-white/60 text-sm leading-relaxed">{tagline}</p>
            {resolvedSocialLinks.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                {resolvedSocialLinks.map((s: any, i: number) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#F5A623] hover:text-[#0B2560] transition"
                  >
                    {SOCIAL_ICONS[s.platform] ?? s.platform}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* COL 2 — QUICK LINKS */}
          <div>
            <h4 className="text-sm font-bold mb-5 tracking-wide">{quickLinksHeading}</h4>
            <ul className="space-y-3">
              {quickLinks.map((l: any, i: number) => (
                <li key={i}>
                  <Link
                    href={l.href}
                    className="text-white/60 text-sm hover:text-white transition"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* COL 3 — OUR PROCEDURES */}
          <div>
            <h4 className="text-sm font-bold mb-5 tracking-wide">{proceduresHeading}</h4>
            <ul className="space-y-3">
              {procedures.map((p: any, i: number) => (
                <li key={i}>
                  <Link
                    href={p.href}
                    className="text-white/60 text-sm hover:text-white transition"
                  >
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* COL 4 — PATIENT CARE */}
          <div>
            <h4 className="text-sm font-bold mb-5 tracking-wide">{patientCareHeading}</h4>
            <ul className="space-y-3">
              {patientCare.map((p: any, i: number) => (
                <li key={i}>
                  <Link
                    href={p.href}
                    className="text-white/60 text-sm hover:text-white transition"
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
            <ul className="space-y-4">
              {contact.address && (
                <li className="flex gap-2.5 text-white/60 text-sm leading-relaxed">
                  <MdLocationOn
                    className="text-[#F5A623] shrink-0 mt-0.5"
                    size={16}
                  />
                  <span>{contact.address}</span>
                </li>
              )}
              {contact.phone && (
                <li>
                  <a
                    href={`tel:${contact.phone.replace(/\s/g, "")}`}
                    className="flex gap-2.5 text-white/60 text-sm hover:text-white transition"
                  >
                    <MdPhone className="text-[#F5A623] shrink-0 mt-0.5" size={16} />
                    {contact.phone}
                  </a>
                </li>
              )}
              {contact.email && (
                <li>
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex gap-2.5 text-white/60 text-sm hover:text-white transition"
                  >
                    <MdEmail className="text-[#F5A623] shrink-0 mt-0.5" size={16} />
                    {contact.email}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* BOTTOM BAR */}
        <div className="mt-12 pt-6 border-t border-white/10 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {resolvedSocialLinks.map((s: any, i: number) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/40 hover:text-white transition"
                >
                  {SOCIAL_ICONS[s.platform] ?? s.platform}
                </a>
              ))}
            </div>
            <p className="text-white/40 text-xs">{copyright}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-5 gap-y-2">
            <Link href="/about" className="text-white/35 text-xs hover:text-white/70 transition">About Us</Link>
            <Link href="/skin-quiz" className="text-[#F5A623]/70 text-xs hover:text-[#F5A623] transition font-medium">✨ {siteConfig?.skinQuizLabel ?? 'Free Clinical Intake'}</Link>
            <Link href="/privacy-policy" className="text-white/35 text-xs hover:text-white/70 transition">Privacy Policy</Link>
            <Link href="/terms" className="text-white/35 text-xs hover:text-white/70 transition">Terms of Service</Link>
            <Link href="/blog" className="text-white/35 text-xs hover:text-white/70 transition">Blog</Link>
            <Link href="/offers" className="text-white/35 text-xs hover:text-white/70 transition">Offers</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
