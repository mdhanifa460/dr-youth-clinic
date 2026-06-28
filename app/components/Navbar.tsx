"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MdPhone, MdMenu, MdClose } from "react-icons/md";

export default function Navbar() {
  const [active, setActive] = useState("home");
  const [locationOpen, setLocationOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const currentLocation = pathname.split("/")[1] || "";

  // On route change, reset active to "home" so the scroll tracker takes over cleanly
  useEffect(() => { setActive("home"); }, [pathname]);

  useEffect(() => {
    const sections = ["home", "services", "expertise", "results", "blog", "contact"];

    const handleScroll = () => {
      const scrollY = window.scrollY + 120;
      for (const id of sections) {
        const section = document.getElementById(id);
        if (section) {
          const top = section.offsetTop;
          const height = section.offsetHeight;
          if (scrollY >= top && scrollY < top + height) setActive(id);
        }
      }
    };

    const handleClickOutside = () => {
      setLocationOpen(false);
      setMobileOpen(false);
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("click", handleClickOutside);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const homeLink =
    currentLocation && !["book", "admin"].includes(currentLocation)
      ? `/${currentLocation}`
      : "/";

  const navItems = [
    { name: "Home",     id: "home"      },
    { name: "Services", id: "services"  },
    { name: "About Us", id: "expertise" },
    { name: "Results",  id: "results"   },
    { name: "Blog",     id: "blog"      },
    { name: "Contact",  id: "contact"   },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/90 border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between gap-6">

        {/* LOGO */}
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

        {/* DESKTOP NAV */}
        <nav className="hidden md:flex items-center gap-7">
          {navItems.map((item, i) => {
            const isActive = active === item.id;
            return (
              <a
                key={i}
                href={`${homeLink}#${item.id}`}
                className={`relative text-[14px] font-semibold transition-all duration-200 ${
                  isActive
                    ? "text-[#0B2560]"
                    : "text-gray-600 hover:text-[#0B2560]"
                }`}
              >
                {item.name}
                {/* Animated underline */}
                <span
                  className={`absolute -bottom-1 left-0 h-[2px] bg-[#0B2560] rounded-full transition-all duration-300 ${
                    isActive ? "w-full" : "w-0"
                  }`}
                />
              </a>
            );
          })}

          {/* LOCATIONS DROPDOWN */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setLocationOpen(!locationOpen); }}
              className={`relative text-[14px] font-semibold flex items-center gap-1 transition ${
                ["chennai", "bangalore", "coimbatore", "kochi"].includes(currentLocation)
                  ? "text-[#0B2560]"
                  : "text-gray-600 hover:text-[#0B2560]"
              }`}
            >
              Locations
              <span className={`text-xs transition-transform duration-200 ${locationOpen ? "rotate-180" : ""}`}>▼</span>
              {/* Underline when on a city page */}
              {["chennai", "bangalore", "coimbatore", "kochi"].includes(currentLocation) && (
                <span className="absolute -bottom-1 left-0 h-[2px] bg-[#0B2560] rounded-full w-full" />
              )}
            </button>
            {locationOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-full mt-2 bg-white shadow-xl rounded-xl py-2 z-[999] min-w-[160px] border border-gray-100"
              >
                {["Chennai", "Bangalore", "Coimbatore", "Kochi"].map((city) => (
                  <Link
                    key={city}
                    href={`/${city.toLowerCase()}`}
                    onClick={() => setLocationOpen(false)}
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
        </nav>

        {/* RIGHT — Phone + CTA */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <a
            href="tel:18008909669"
            className="flex items-center gap-1.5 border border-gray-200 text-[#0B2560] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#f6faff] transition"
          >
            <MdPhone size={15} />
            1800 890 9669
          </a>
          <Link href="/book">
            <button className="bg-[#0B2560] text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-[0_6px_20px_rgba(11,37,96,0.25)] hover:-translate-y-0.5 hover:shadow-lg transition">
              Consult Online
            </button>
          </Link>
        </div>

        {/* MOBILE HAMBURGER */}
        <button
          className="md:hidden p-2 text-[#0B2560]"
          onClick={(e) => { e.stopPropagation(); setMobileOpen(!mobileOpen); }}
        >
          {mobileOpen ? <MdClose size={24} /> : <MdMenu size={24} />}
        </button>
      </div>

      {/* MOBILE MENU */}
      {mobileOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-1"
        >
          {navItems.map((item, i) => {
            const isActive = active === item.id;
            return (
              <a
                key={i}
                href={`${homeLink}#${item.id}`}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 text-sm font-semibold py-2.5 px-3 rounded-xl transition ${
                  isActive
                    ? "bg-[#f6faff] text-[#0B2560]"
                    : "text-gray-700 hover:text-[#0B2560] hover:bg-[#f6faff]"
                }`}
              >
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#0B2560] shrink-0" />}
                {item.name}
              </a>
            );
          })}

          {/* Locations divider + city links */}
          <div className="pt-2 pb-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 mb-1">Locations</p>
            {["Chennai", "Bangalore", "Coimbatore", "Kochi"].map((city) => (
              <Link
                key={city}
                href={`/${city.toLowerCase()}`}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 text-sm font-medium py-2 px-3 rounded-xl transition ${
                  currentLocation === city.toLowerCase()
                    ? "bg-[#f6faff] text-[#0B2560] font-bold"
                    : "text-gray-600 hover:text-[#0B2560] hover:bg-[#f6faff]"
                }`}
              >
                {city}
              </Link>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="pt-3 flex flex-col gap-2">
            <a href="tel:18008909669" className="flex items-center justify-center gap-2 border border-gray-200 text-[#0B2560] py-2.5 rounded-xl text-sm font-semibold">
              <MdPhone size={15} /> 1800 890 9669
            </a>
            <Link href="/book" onClick={() => setMobileOpen(false)}>
              <button className="w-full bg-[#0B2560] text-white py-2.5 rounded-xl font-semibold text-sm">
                Consult Online
              </button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
