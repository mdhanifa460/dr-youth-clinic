"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MdPhone, MdMenu, MdClose, MdPhotoLibrary, MdChevronRight } from "react-icons/md";
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

export interface MegaMenuConfig {
  enabled?: boolean;
  maxPerCategory?: number;
  showBookCta?: boolean;
  showConcerns?: boolean;
  bookLabel?: string;
  bookHref?: string;
}

interface MegaCategory {
  slug: string;
  label: string;
  icon: string;
  tagline: string;
  services: { name: string; slug: string }[];
}

interface MegaConcern {
  name: string;
  services: { name: string; slug: string; category: string }[];
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

const DEFAULT_LOGO_URL = `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/f_webp,q_auto,w_300/logo_l7n0ai.png`;

export default function Navbar({ navItems: navItemsProp, megaMenu }: { navItems?: NavItem[]; megaMenu?: MegaMenuConfig | null }) {
  const siteConfig = useSiteConfig();
  const logoUrl   = siteConfig.logoUrl || DEFAULT_LOGO_URL;
  const phone     = siteConfig.publicPhone    || "1800 890 9669";
  const phoneHref = `tel:${phone.replace(/\s+/g, "")}`;
  const [active, setActive] = useState("home");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileDropdown, setMobileDropdown] = useState<string | null>(null);
  const [megaOpen, setMegaOpen] = useState(false);
  const [megaCat, setMegaCat] = useState(0);
  const [megaData, setMegaData] = useState<MegaCategory[] | null>(null);
  const [megaConcerns, setMegaConcerns] = useState<MegaConcern[]>([]);
  const [mobileCat, setMobileCat] = useState<string | null>(null);
  const megaCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  // Services mega menu — data is fetched lazily the first time the menu is
  // opened (desktop hover/click or mobile menu), never on page load.
  const megaEnabled = megaMenu?.enabled !== false;
  const megaMax = Math.max(1, Math.min(20, Number(megaMenu?.maxPerCategory ?? 8)));
  const megaCity = CITY_SLUGS.includes(currentLocation) ? currentLocation : detectedLocation;
  const megaCityRef = useRef(megaCity);
  const loadMega = () => {
    if (megaData !== null && megaCityRef.current === megaCity) return;
    megaCityRef.current = megaCity;
    fetch(`/api/nav-services?city=${megaCity}`)
      .then((r) => r.json())
      .then((d) => {
        setMegaData(Array.isArray(d.categories) ? d.categories : []);
        setMegaConcerns(Array.isArray(d.concerns) ? d.concerns : []);
      })
      .catch(() => setMegaData([]));
  };
  const openMega = () => {
    if (megaCloseTimer.current) clearTimeout(megaCloseTimer.current);
    loadMega();
    setOpenDropdown(null);
    setMegaOpen(true);
  };
  // Small grace delay so the pointer can travel from the nav label down into
  // the panel without the menu flickering shut.
  const closeMegaSoon = () => {
    if (megaCloseTimer.current) clearTimeout(megaCloseTimer.current);
    megaCloseTimer.current = setTimeout(() => setMegaOpen(false), 160);
  };
  useEffect(() => {
    setMegaOpen(false);
    setMobileCat(null);
  }, [pathname]);
  useEffect(() => {
    if (mobileOpen && megaEnabled) loadMega();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileOpen]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMegaOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // On route change, reset active to "home" so the scroll tracker takes over cleanly
  useEffect(() => { setActive("home"); }, [pathname]);

  useEffect(() => {
    const sectionIds = navItems.map((i) => i.id);

    const handleScroll = () => {
      const scrollY = window.scrollY + 120;
      // Some homepage sections (e.g. the embedded Doctors highlight) have
      // no matching nav item — "Doctors" in the nav links to the separate
      // /doctors page instead. Scrolling through one of those used to leave
      // whichever nav item matched last still highlighted, which reads as
      // the highlight "sticking" or jumping to the wrong place. Falling
      // back to "home" (the same default used on route change) when
      // nothing matches keeps the highlight honest instead of stale.
      let matched = "";
      for (const id of sectionIds) {
        const section = document.getElementById(id);
        if (!section) continue;
        const top = section.offsetTop;
        const height = section.offsetHeight;
        if (scrollY >= top && scrollY < top + height) { matched = id; break; }
      }
      setActive(matched || "home");
    };

    const handleClickOutside = () => {
      setMegaOpen(false);
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
    // bg-white/90 (not fully opaque) let page content directly behind the
    // sticky header "ghost" through wherever a heading sits flush against
    // its bottom edge — backdrop-blur alone doesn't fully diffuse crisp
    // dark text that close. Confirmed on /book's mobile "Tell us about
    // yourself" heading; bumped to near-opaque to keep the frosted-glass
    // look without the bleed-through.
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/98 border-b border-gray-100 shadow-sm">

      {/* ── MOBILE ROW: [hamburger] [logo center] [photo icon] ── */}
      <div className="xl:hidden flex items-center justify-between px-4 py-3">

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
          {/* Was 130x44 — trimmed alongside the desktop logo below to
              reduce the header's own footprint (reported live: too much
              space around it). */}
          <Image
            src={logoUrl}
            alt="DR Youth Clinic"
            width={108}
            height={37}
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
      <div className="hidden xl:flex items-center justify-between max-w-7xl mx-auto px-6 xl:px-8 py-2.5 gap-3 xl:gap-5">

        {/* Logo */}
        <Link href="/" className="flex items-center shrink-0">
          {/* Was 150x52 — the earlier py-4->py-2.5 padding fix shrank the
              row's own padding, but the logo itself was still the tallest
              thing in it, so it kept dictating a taller header than
              needed. Reported live as still too much space. */}
          <Image
            src={logoUrl}
            alt="DR Youth Clinic"
            width={122}
            height={42}
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

            if (item.linkType === "services" && megaEnabled) {
              const isActiveSvc = active === item.id || pathname.includes("/services");
              const cats = megaData || [];
              const hasConcerns = megaMenu?.showConcerns !== false && megaConcerns.length > 0;
              // Index === cats.length is the synthetic "By Concern" entry.
              const concernSel = hasConcerns && megaCat === cats.length;
              const cur = concernSel ? undefined : cats[Math.min(megaCat, Math.max(0, cats.length - 1))];
              return (
                <div
                  key={item.id}
                  onMouseEnter={openMega}
                  onMouseLeave={closeMegaSoon}
                  onFocus={openMega}
                >
                  <div className="flex items-center gap-1">
                    <Link
                      href={resolveHref(item)}
                      className={`relative text-[13px] xl:text-[14px] font-semibold transition-all duration-200 whitespace-nowrap ${
                        isActiveSvc || megaOpen ? "text-[#0B2560]" : "text-gray-600 hover:text-[#0B2560]"
                      }`}
                    >
                      {item.label}
                      <span className={`absolute -bottom-1 left-0 h-[2px] bg-[#0B2560] rounded-full transition-all duration-300 ${isActiveSvc || megaOpen ? "w-full" : "w-0"}`} />
                    </Link>
                    <button
                      type="button"
                      aria-label={`${item.label} menu`}
                      aria-expanded={megaOpen}
                      onClick={(e) => { e.stopPropagation(); megaOpen ? setMegaOpen(false) : openMega(); }}
                      className="text-[10px] text-gray-500 hover:text-[#0B2560] p-1"
                    >
                      <span className={`inline-block transition-transform duration-200 ${megaOpen ? "rotate-180" : ""}`}>▼</span>
                    </button>
                  </div>

                  {megaOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 right-0 top-full z-[999] bg-white border-t border-gray-100 shadow-[0_24px_40px_rgba(11,37,96,0.12)]"
                    >
                      <div className="max-w-7xl mx-auto px-6 xl:px-8 grid grid-cols-[260px_1fr] min-h-[300px]">
                        {/* Left: categories */}
                        <ul className="py-4 pr-4 border-r border-gray-100 space-y-1">
                          {megaData === null && <li className="px-4 py-3 text-sm text-gray-400">Loading…</li>}
                          {cats.map((c, i) => (
                            <li key={c.slug}>
                              <Link
                                href={`/${megaCity}/services/${c.slug}`}
                                onMouseEnter={() => setMegaCat(i)}
                                onFocus={() => setMegaCat(i)}
                                className={`flex items-center justify-between gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                                  i === megaCat ? "bg-[#0B2560]/[0.06] text-[#0B2560]" : "text-gray-600 hover:bg-[#f6faff] hover:text-[#0B2560]"
                                }`}
                              >
                                <span className="flex items-center gap-2"><span aria-hidden>{c.icon}</span>{c.label}</span>
                                <MdChevronRight size={18} className={i === megaCat ? "text-[#F5A623]" : "text-gray-300"} />
                              </Link>
                            </li>
                          ))}
                          {hasConcerns && (
                            <li className="pt-1 mt-1 border-t border-gray-100">
                              <button
                                type="button"
                                onMouseEnter={() => setMegaCat(cats.length)}
                                onFocus={() => setMegaCat(cats.length)}
                                onClick={() => setMegaCat(cats.length)}
                                className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                                  concernSel ? "bg-[#0B2560]/[0.06] text-[#0B2560]" : "text-gray-600 hover:bg-[#f6faff] hover:text-[#0B2560]"
                                }`}
                              >
                                <span className="flex items-center gap-2"><span aria-hidden>🎯</span>By Concern</span>
                                <MdChevronRight size={18} className={concernSel ? "text-[#F5A623]" : "text-gray-300"} />
                              </button>
                            </li>
                          )}
                        </ul>

                        {/* Right: the highlighted category's services */}
                        <div className="py-5 pl-8 flex flex-col">
                          {concernSel ? (
                            <>
                              <p className="text-base font-extrabold text-[#0B2560]">Treatments by concern</p>
                              <p className="text-xs text-gray-500 mb-3">Find what helps with what you’re dealing with.</p>
                              <div className="grid grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-4">
                                {megaConcerns.slice(0, 6).map((cn) => (
                                  <div key={cn.name}>
                                    <p className="text-sm font-bold text-[#0B2560] mb-1">{cn.name}</p>
                                    <ul>
                                      {cn.services.slice(0, Math.min(megaMax, 4)).map((sv) => (
                                        <li key={cn.name + sv.slug}>
                                          <Link href={`/${megaCity}/services/${sv.category}/${sv.slug}`} className="block py-1 text-sm text-gray-600 hover:text-[#0B2560] hover:translate-x-0.5 transition">
                                            {sv.name}
                                          </Link>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : cur ? (
                            <>
                              <div className="flex items-baseline justify-between gap-4 mb-3">
                                <div>
                                  <p className="text-base font-extrabold text-[#0B2560]">{cur.label}</p>
                                  {cur.tagline && <p className="text-xs text-gray-500">{cur.tagline}</p>}
                                </div>
                                <Link href={`/${megaCity}/services/${cur.slug}`} className="text-xs font-bold text-[#0B2560] hover:text-[#F5A623] whitespace-nowrap">
                                  View all {cur.services.length} →
                                </Link>
                              </div>
                              <ul className="grid grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-1">
                                {cur.services.slice(0, megaMax).map((sv) => (
                                  <li key={sv.slug}>
                                    <Link
                                      href={`/${megaCity}/services/${cur.slug}/${sv.slug}`}
                                      className="block py-2 text-sm text-gray-700 hover:text-[#0B2560] hover:translate-x-0.5 transition"
                                    >
                                      {sv.name}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                              {cur.services.length > megaMax && (
                                <Link href={`/${megaCity}/services/${cur.slug}`} className="mt-2 text-sm font-semibold text-[#F5A623] hover:underline">
                                  +{cur.services.length - megaMax} more in {cur.label}
                                </Link>
                              )}
                            </>
                          ) : megaData !== null ? (
                            <p className="text-sm text-gray-400">No treatments listed yet.</p>
                          ) : null}
                          <div className="mt-auto pt-4 flex items-center gap-3">
                            {megaMenu?.showBookCta !== false && (
                              <Link
                                href={megaMenu?.bookHref || "/book"}
                                className="bg-[#0B2560] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:-translate-y-0.5 transition"
                              >
                                {megaMenu?.bookLabel || "Book Appointment"}
                              </Link>
                            )}
                            <Link href={resolveHref(item)} className="text-sm font-semibold text-[#0B2560] hover:text-[#F5A623]">
                              All services →
                            </Link>
                          </div>
                        </div>
                      </div>
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
          {/* Single unified entry point — "Free Clinical Intake" used to be a
              separate CTA pointing at /skin-quiz, creating a real choice
              between two competing "tell us about yourself" flows. Clinical
              Intake's engine now powers Plan My Journey from the inside
              (see app/lib/assessmentFlow.ts), so this is the only CTA. */}
          <Link
            href="/plan-my-journey"
            className="hidden xl:flex min-h-10 items-center gap-1.5 border border-[#F5A623] text-[#0B2560] px-3 py-2 rounded-xl text-sm font-semibold hover:bg-[#F5A623]/10 transition whitespace-nowrap"
          >
            ✨ Plan My Journey
          </Link>
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
          className="xl:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-1 max-h-[calc(100vh-64px)] overflow-y-auto"
        >
          {navItems.map((item) => {
            if (item.linkType === "locations") {
              return (
                <div key={item.id} className="pt-2 pb-1">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-3 mb-1">{item.label}</p>
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

            if (item.linkType === "services" && megaEnabled) {
              const isOpen = mobileDropdown === item.id;
              const cats = megaData || [];
              return (
                <div key={item.id}>
                  <button
                    onClick={() => setMobileDropdown(isOpen ? null : item.id)}
                    aria-expanded={isOpen}
                    className="min-h-11 flex items-center justify-between gap-2 text-sm font-semibold py-2.5 px-3 rounded-xl transition w-full text-gray-700 hover:text-[#0B2560] hover:bg-[#f6faff]"
                  >
                    <span>{item.label}</span>
                    <span className={`text-xs transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>▼</span>
                  </button>
                  {isOpen && (
                    <div className="pl-3 pb-1">
                      {megaData === null && <p className="px-3 py-2 text-sm text-gray-400">Loading…</p>}
                      {megaMenu?.showConcerns !== false && megaConcerns.length > 0 && (
                        <div>
                          <button
                            onClick={() => setMobileCat(mobileCat === "__concerns" ? null : "__concerns")}
                            aria-expanded={mobileCat === "__concerns"}
                            className="min-h-11 w-full flex items-center justify-between gap-2 text-sm font-semibold py-2 px-3 rounded-xl text-[#0B2560] hover:bg-[#f6faff]"
                          >
                            <span className="flex items-center gap-2"><span aria-hidden>🎯</span>By Concern</span>
                            <span className={`text-[10px] text-gray-400 transition-transform ${mobileCat === "__concerns" ? "rotate-180" : ""}`}>▼</span>
                          </button>
                          {mobileCat === "__concerns" && (
                            <div className="pl-6 border-l border-gray-100 ml-4 mb-1">
                              {megaConcerns.slice(0, 8).map((cn) => (
                                <div key={cn.name} className="py-1">
                                  <p className="px-3 pt-1 text-xs font-bold uppercase tracking-wide text-gray-400">{cn.name}</p>
                                  {cn.services.slice(0, 4).map((sv) => (
                                    <Link
                                      key={cn.name + sv.slug}
                                      href={`/${megaCity}/services/${sv.category}/${sv.slug}`}
                                      onClick={() => { setMobileOpen(false); setMobileDropdown(null); }}
                                      className="min-h-10 flex items-center text-sm py-2 px-3 rounded-lg text-gray-600 hover:text-[#0B2560] hover:bg-[#f6faff]"
                                    >
                                      {sv.name}
                                    </Link>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {cats.map((c) => {
                        const catOpen = mobileCat === c.slug;
                        return (
                          <div key={c.slug}>
                            <button
                              onClick={() => setMobileCat(catOpen ? null : c.slug)}
                              aria-expanded={catOpen}
                              className="min-h-11 w-full flex items-center justify-between gap-2 text-sm font-semibold py-2 px-3 rounded-xl text-[#0B2560] hover:bg-[#f6faff]"
                            >
                              <span className="flex items-center gap-2"><span aria-hidden>{c.icon}</span>{c.label}</span>
                              <span className={`text-[10px] text-gray-400 transition-transform ${catOpen ? "rotate-180" : ""}`}>▼</span>
                            </button>
                            {catOpen && (
                              <div className="pl-6 border-l border-gray-100 ml-4 mb-1">
                                {c.services.slice(0, megaMax).map((sv) => (
                                  <Link
                                    key={sv.slug}
                                    href={`/${megaCity}/services/${c.slug}/${sv.slug}`}
                                    onClick={() => { setMobileOpen(false); setMobileDropdown(null); }}
                                    className="min-h-10 flex items-center text-sm py-2 px-3 rounded-lg text-gray-600 hover:text-[#0B2560] hover:bg-[#f6faff]"
                                  >
                                    {sv.name}
                                  </Link>
                                ))}
                                <Link
                                  href={`/${megaCity}/services/${c.slug}`}
                                  onClick={() => { setMobileOpen(false); setMobileDropdown(null); }}
                                  className="min-h-10 flex items-center text-sm font-semibold py-2 px-3 text-[#F5A623]"
                                >
                                  View all {c.label} →
                                </Link>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <Link
                        href={resolveHref(item)}
                        onClick={() => { setMobileOpen(false); setMobileDropdown(null); }}
                        className="min-h-11 flex items-center text-sm font-semibold py-2 px-3 text-[#0B2560]"
                      >
                        All services →
                      </Link>
                    </div>
                  )}
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
              href="/plan-my-journey"
              onClick={() => setMobileOpen(false)}
              className="min-h-12 w-full bg-[#F5A623]/10 border border-[#F5A623] text-[#0B2560] py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5"
            >
              ✨ Plan My Journey
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
