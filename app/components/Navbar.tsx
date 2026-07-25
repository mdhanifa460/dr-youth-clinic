"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MdPhone, MdMenu, MdClose, MdPhotoLibrary } from "react-icons/md";
import { useSiteConfig } from "@/app/components/SiteConfigContext";

export interface NavChild {
  id: string;
  label: string;
  href: string;
  order: number;
}

export interface NavItem {
  id: string;
  label: string;
  linkType: "custom" | "services" | "locations" | "anchor";
  href: string;
  order: number;
  visible: boolean;
  children: NavChild[];
}

const CITIES = ["Chennai", "Bangalore", "Coimbatore", "Kochi"];
const CITY_SLUGS = CITIES.map((c) => c.toLowerCase());

// Matches the previous hardcoded navItems exactly — used only if Settings →
// Navigation has no items yet (e.g. a fresh install before the admin saves
// anything), so the menu is never blank.
const FALLBACK_NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home", linkType: "custom", href: "/", order: 0, visible: true, children: [] },
  { id: "services", label: "Services", linkType: "services", href: "", order: 1, visible: true, children: [] },
  { id: "doctors", label: "Doctors", linkType: "custom", href: "/doctors", order: 2, visible: true, children: [] },
  { id: "about", label: "About", linkType: "custom", href: "/about", order: 3, visible: true, children: [] },
  { id: "results", label: "Results", linkType: "custom", href: "/results", order: 4, visible: true, children: [] },
  { id: "stories", label: "Stories", linkType: "custom", href: "/web-stories", order: 5, visible: true, children: [] },
  { id: "blog", label: "Blog", linkType: "custom", href: "/blog", order: 6, visible: true, children: [] },
  { id: "offers", label: "Offers", linkType: "custom", href: "/offers", order: 7, visible: true, children: [] },
  { id: "contact", label: "Contact", linkType: "anchor", href: "contact", order: 8, visible: true, children: [] },
  { id: "locations", label: "Locations", linkType: "locations", href: "", order: 9, visible: true, children: [] },
];

export default function Navbar({ navItems: navItemsProp }: { navItems?: NavItem[] }) {
  const siteConfig = useSiteConfig();
  const phone     = siteConfig.publicPhone    || "1800 890 9669";
  const phoneHref = `tel:${phone.replace(/\s+/g, "")}`;
  const [active, setActive] = useState("home");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileDropdown, setMobileDropdown] = useState<string | null>(null);
  const pathname = usePathname();
  const currentLocation = pathname.split("/")[1] || "";

  const navItems = (navItemsProp?.length ? navItemsProp : FALLBACK_NAV_ITEMS)
    .filter((i) => i.visible)
    .sort((a, b) => a.order - b.order);

  // middleware.ts sets this from the visitor's IP region (Karnataka -> bangalore,
  // Tamil Nadu -> chennai, Kerala -> kochi) on their first visit to "/". Read it
  // client-side so the Services link on the plain domain sends visitors to their
  // own city instead of always defaulting to Chennai — same cookie the homepage's
  // Services section already trusts server-side (app/(public)/page.tsx).
  const [detectedLocation, setDetectedLocation] = useState("chennai");
  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )preferred_location=([^;]+)/);
    const value = match ? decodeURIComponent(match[1]) : "";
    if (CITY_SLUGS.includes(value)) {
      setDetectedLocation(value);
    }
  }, []);

  // On route change, reset active to "home" so the scroll tracker takes over cleanly
  useEffect(() => { setActive("home"); }, [pathname]);

  useEffect(() => {
    const sectionIds = navItems.map((i) => i.id);

    const handleScroll = () => {
      const scrollY = window.scrollY + 120;
      for (const id of sectionIds) {
        const section = document.getElementById(id);
        if (section) {
          const top = section.offsetTop;
          const height = section.offsetHeight;
          if (scrollY >= top && scrollY < top + height) setActive(id);
        }
      }
    };

    const handleClickOutside = () => {
      setOpenDropdown(null);
      setMobileOpen(false);
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("click", handleClickOutside);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("click", handleClickOutside);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const homeLink = CITY_SLUGS.includes(currentLocation) ? `/${currentLocation}` : "/";

  // Services only exists as a real page once a location is picked (e.g. /bangalore/services).
  // There's no location-less services listing, so on the plain "/" domain fall back to
  // the visitor's detected/preferred city (see detectedLocation above), Chennai by default.
  const servicesHref = CITY_SLUGS.includes(currentLocation)
    ? `/${currentLocation}/services`
    : `/${detectedLocation}/services`;

  // Resolves an item's target — 'services'/'anchor' depend on runtime state
  // (current/detected city, current homepage) that an admin can't express
  // as a plain stored string; everything else uses `href` as-is.
  function resolveHref(item: NavItem): string {
    if (item.linkType === "services") return servicesHref;
    if (item.linkType === "anchor") return `${homeLink}#${item.href}`;
    return item.href || "#";
  }

  const isLocationActive = CITY_SLUGS.includes(currentLocation);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/90 border-b border-gray-100 shadow-sm">

      {/* ── MOBILE ROW: [hamburger] [logo center] [photo icon] ── */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3">

        {/* Left: hamburger */}
        <button
          className="w-11 h-11 rounded-xl flex items-center justify-center text-[#0B2560] hover:bg-[#f6faff] transition"
          onClick={(e) => { e.stopPropagation(); setMobileOpen(!mobileOpen); }}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <MdClose size={24} /> : <MdMenu size={24} />}
        </button>

        {/* Center: logo */}
        <Link href={homeLink} className="flex items-center">
          <Image
            src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/f_webp,q_auto,w_300/logo_l7n0ai.png`}
            alt="DR Youth Clinic"
            width={130}
            height={44}
            className="object-contain"
            priority
          />
        </Link>

        {/* Right: results / gallery icon */}
        <Link
          href="/results"
          className="w-11 h-11 rounded-xl flex items-center justify-center text-[#0B2560] hover:bg-[#f6faff] transition"
          aria-label="View results"
        >
          <MdPhotoLibrary size={22} />
        </Link>
      </div>

      {/* ── DESKTOP ROW: [logo] [nav] [phone + CTA] ── */}
      <div className="hidden lg:flex items-center justify-between max-w-7xl mx-auto px-6 xl:px-8 py-4 gap-3 xl:gap-5">

        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0">
          <Image
            src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/f_webp,q_auto,w_300/logo_l7n0ai.png`}
            alt="DR Youth Clinic"
            width={150}
            height={52}
            className="object-contain"
            priority
          />
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-4 xl:gap-6">
          {navItems.map((item) => {
            // 'locations' keeps its dedicated dropdown UI (4 fixed city
            // links) since its content isn't admin-editable child links.
            if (item.linkType === "locations") {
              return (
                <div key={item.id} className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === item.id ? null : item.id); }}
                    className={`relative text-[14px] font-semibold flex items-center gap-1 transition ${
                      isLocationActive ? "text-[#0B2560]" : "text-gray-600 hover:text-[#0B2560]"
                    }`}
                  >
                    {item.label}
                    <span className={`text-xs transition-transform duration-200 ${openDropdown === item.id ? "rotate-180" : ""}`}>▼</span>
                    {isLocationActive && (
                      <span className="absolute -bottom-1 left-0 h-[2px] bg-[#0B2560] rounded-full w-full" />
                    )}
                  </button>
                  {openDropdown === item.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-full mt-2 bg-white shadow-xl rounded-xl py-2 z-[999] min-w-[160px] border border-gray-100"
                    >
                      {CITIES.map((city) => (
                        <Link
                          key={city}
                          href={`/${city.toLowerCase()}`}
                          onClick={() => setOpenDropdown(null)}
                          className={`block px-4 py-2 text-sm font-medium transition ${
                            currentLocation === city.toLowerCase()
                              ? "bg-[#f6faff] text-[#0B2560] font-bold"
                              : "text-gray-700 hover:bg-[#f6faff] hover:text-[#0B2560]"
                          }`}
                        >
                          {city}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = active === item.id;
            const linkClassName = `relative text-[13px] xl:text-[14px] font-semibold transition-all duration-200 whitespace-nowrap ${
              isActive ? "text-[#0B2560]" : "text-gray-600 hover:text-[#0B2560]"
            }`;
            const underline = (
              <span
                className={`absolute -bottom-1 left-0 h-[2px] bg-[#0B2560] rounded-full transition-all duration-300 ${
                  isActive ? "w-full" : "w-0"
                }`}
              />
            );

            if (item.children.length > 0) {
              return (
                <div key={item.id} className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === item.id ? null : item.id); }}
                    className={`${linkClassName} flex items-center gap-1`}
                  >
                    {item.label}
                    <span className={`text-xs transition-transform duration-200 ${openDropdown === item.id ? "rotate-180" : ""}`}>▼</span>
                    {underline}
                  </button>
                  {openDropdown === item.id && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-full mt-2 bg-white shadow-xl rounded-xl py-2 z-[999] min-w-[180px] border border-gray-100"
                    >
                      {[...item.children].sort((a, b) => a.order - b.order).map((child) => (
                        <Link
                          key={child.id}
                          href={child.href}
                          onClick={() => setOpenDropdown(null)}
                          className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-[#f6faff] hover:text-[#0B2560] transition"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link key={item.id} href={resolveHref(item)} className={linkClassName}>
                {item.label}
                {underline}
              </Link>
            );
          })}
        </nav>

        {/* Phone + CTA */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/skin-quiz"
            className="hidden xl:flex min-h-10 items-center gap-1.5 border border-[#F5A623] text-[#0B2560] px-3 py-2 rounded-xl text-sm font-semibold hover:bg-[#F5A623]/10 transition whitespace-nowrap"
          >
            {siteConfig.skinQuizNav}
          </Link>
          {phone && (
            <a
              href={phoneHref}
              className="hidden xl:flex min-h-10 items-center gap-1.5 border border-gray-200 text-[#0B2560] px-3 py-2 rounded-xl text-sm font-semibold hover:bg-[#f6faff] transition"
            >
              <MdPhone size={15} />
              {phone}
            </a>
          )}
          <Link
            href="/book"
            className="min-h-10 bg-[#0B2560] text-white px-4 py-2.5 rounded-xl font-semibold text-sm shadow-[0_6px_20px_rgba(11,37,96,0.25)] hover:-translate-y-0.5 hover:shadow-lg transition flex items-center justify-center whitespace-nowrap"
          >
            {siteConfig.consultationBadge}
          </Link>
        </div>
      </div>

      {/* MOBILE MENU */}
      {mobileOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="lg:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-1 max-h-[calc(100vh-64px)] overflow-y-auto"
        >
          {navItems.map((item) => {
            if (item.linkType === "locations") {
              return (
                <div key={item.id} className="pt-2 pb-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-1">{item.label}</p>
                  {CITIES.map((city) => (
                    <Link
                      key={city}
                      href={`/${city.toLowerCase()}`}
                      onClick={() => setMobileOpen(false)}
                      className={`min-h-11 flex items-center gap-2 text-sm font-medium py-2 px-3 rounded-xl transition ${
                        currentLocation === city.toLowerCase()
                          ? "bg-[#f6faff] text-[#0B2560] font-bold"
                          : "text-gray-600 hover:text-[#0B2560] hover:bg-[#f6faff]"
                      }`}
                    >
                      {city}
                    </Link>
                  ))}
                </div>
              );
            }

            const isActive = active === item.id;
            const linkClassName = `min-h-11 flex items-center gap-2 text-sm font-semibold py-2.5 px-3 rounded-xl transition w-full ${
              isActive
                ? "bg-[#f6faff] text-[#0B2560]"
                : "text-gray-700 hover:text-[#0B2560] hover:bg-[#f6faff]"
            }`;
            const label = (
              <>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#0B2560] shrink-0" />}
                {item.label}
              </>
            );

            if (item.children.length > 0) {
              const isOpen = mobileDropdown === item.id;
              return (
                <div key={item.id}>
                  <button
                    onClick={() => setMobileDropdown(isOpen ? null : item.id)}
                    className={`${linkClassName} justify-between`}
                  >
                    <span className="flex items-center gap-2">{label}</span>
                    <span className={`text-xs transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>▼</span>
                  </button>
                  {isOpen && (
                    <div className="pl-4">
                      {[...item.children].sort((a, b) => a.order - b.order).map((child) => (
                        <Link
                          key={child.id}
                          href={child.href}
                          onClick={() => { setMobileOpen(false); setMobileDropdown(null); }}
                          className="min-h-10 flex items-center text-sm font-medium py-2 px-3 rounded-xl text-gray-600 hover:text-[#0B2560] hover:bg-[#f6faff] transition"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.id}
                href={resolveHref(item)}
                onClick={() => setMobileOpen(false)}
                className={linkClassName}
              >
                {label}
              </Link>
            );
          })}

          {/* CTA buttons */}
          <div className="pt-3 flex flex-col gap-2">
            <Link
              href="/skin-quiz"
              onClick={() => setMobileOpen(false)}
              className="min-h-12 w-full bg-[#F5A623]/10 border border-[#F5A623] text-[#0B2560] py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5"
            >
              {siteConfig.skinQuizNav} — Prepare Your Visit
            </Link>
            {phone && (
              <a href={phoneHref} className="min-h-12 flex items-center justify-center gap-2 border border-gray-200 text-[#0B2560] py-3 rounded-xl text-sm font-semibold">
                <MdPhone size={15} /> {phone}
              </a>
            )}
            <Link
              href="/book"
              onClick={() => setMobileOpen(false)}
              className="min-h-12 w-full bg-[#0B2560] text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center"
            >
              {siteConfig.consultationBadge}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
