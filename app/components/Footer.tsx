import { unstable_cache } from "next/cache";
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
import { connectDB } from "@/app/lib/mongodb";
import { HomepageSection } from "@/app/models/HomepageSection";
import { HOMEPAGE_DEFAULTS } from "@/app/lib/homepageDefaults";

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  facebook: <FaFacebookF size={13} />,
  instagram: <FaInstagram size={13} />,
  youtube: <FaYoutube size={13} />,
  whatsapp: <FaWhatsapp size={13} />,
  twitter: <FaTwitter size={13} />,
};

const getFooterData = unstable_cache(
  async () => {
    try {
      await connectDB();
      const section = (await HomepageSection.findOne({
        sectionKey: "footer",
      }).lean()) as any;
      return section?.data ?? HOMEPAGE_DEFAULTS.footer.data;
    } catch {
      return HOMEPAGE_DEFAULTS.footer.data;
    }
  },
  ["footer-data"],
  { revalidate: 300, tags: ["homepage-layout"] }
);

export default async function Footer() {
  const data = await getFooterData();

  const {
    tagline = "",
    quickLinks = [],
    procedures = [],
    patientCare = [],
    contact = {},
    copyright = "© 2024 DR Youth Clinic. All Rights Reserved.",
    socialLinks = [],
  } = data;

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
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                {socialLinks.map((s: any, i: number) => (
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
            <h4 className="text-sm font-bold mb-5 tracking-wide">Quick Links</h4>
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
            <h4 className="text-sm font-bold mb-5 tracking-wide">Our Procedures</h4>
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
            <h4 className="text-sm font-bold mb-5 tracking-wide">Patient Care</h4>
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
            <h4 className="text-sm font-bold mb-5 tracking-wide">Contact Us</h4>
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
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {socialLinks.map((s: any, i: number) => (
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
      </div>
    </footer>
  );
}
