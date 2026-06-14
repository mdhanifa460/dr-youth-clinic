"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const [active, setActive] = useState("home");
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const currentLocation = pathname.split("/")[1] || "";

  useEffect(() => {
    const sections = ["home", "services", "results", "expertise", "contact"];

    const handleScroll = () => {
      const scrollY = window.scrollY + 120;

      for (let id of sections) {
        const section = document.getElementById(id);
        if (section) {
          const top = section.offsetTop;
          const height = section.offsetHeight;

          if (scrollY >= top && scrollY < top + height) {
            setActive(id);
          }
        }
      }
    };

    const handleClickOutside = () => setOpen(false);

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("click", handleClickOutside);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const homeLink = currentLocation && !["book", "admin"].includes(currentLocation) ? `/${currentLocation}` : "/";

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-neutral">

      <div className="max-w-7xl mx-auto px-6 md:px-10 py-5 flex items-center justify-between">

        {/* LOGO */}
        <Link href="/" className="flex items-center">
          <Image
            src="https://dryouthclinic.co.in/images/new-img/logo.png"
            alt="DR Youth Clinic - Premium Dermatology"
            width={160}
            height={60}
            className="object-contain"
            priority
          />
        </Link>

        {/* NAV LINKS */}
        <nav className="hidden md:flex items-center gap-10">

          {/* NORMAL LINKS */}
          {[
            { name: "Home", id: "home" },
            { name: "Services", id: "services" },
            { name: "Results", id: "results" },
            { name: "About", id: "expertise" },
            { name: "Contact", id: "contact" },
          ].map((item, i) => (
            <a
              key={i}
              href={`${homeLink}#${item.id}`}
              className={`text-[15px] font-body font-bold transition-all duration-300 ${
                active === item.id
                  ? "text-primary border-b-2 border-primary pb-1"
                  : "text-gray-600 hover:text-secondary"
              }`}
            >
              {item.name}
            </a>
          ))}

          {/* 🔥 LOCATIONS DROPDOWN */}
          <div className="relative">
            <div
              onClick={(e) => {
                e.stopPropagation();
                setOpen(!open);
              }}
              className="text-[15px] font-body font-bold text-gray-600 cursor-pointer hover:text-secondary"
            >
              Locations ▼
            </div>

            {open && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-full mt-2 bg-white shadow-lg rounded-xl p-4 z-[999]"
              >
                <div className="flex flex-col gap-2 min-w-[160px]">
                  <Link href="/chennai" onClick={() => setOpen(false)} className="hover:bg-gray-100 px-2 py-1 rounded text-gray-700 font-semibold">
                    Chennai
                  </Link>
                  <Link href="/bangalore" onClick={() => setOpen(false)} className="hover:bg-gray-100 px-2 py-1 rounded text-gray-700 font-semibold">
                    Bangalore
                  </Link>
                  <Link href="/coimbatore" onClick={() => setOpen(false)} className="hover:bg-gray-100 px-2 py-1 rounded text-gray-700 font-semibold">
                    Coimbatore
                  </Link>
                  <Link href="/kochi" onClick={() => setOpen(false)} className="hover:bg-gray-100 px-2 py-1 rounded text-gray-700 font-semibold">
                    Kochi
                  </Link>
                </div>
              </div>
            )}
          </div>

        </nav>

        {/* CTA BUTTON */}
        <div>
          <Link href="/book">
            <button className="bg-primary text-white px-6 py-2.5 rounded-xl font-body font-semibold shadow-[0px_10px_25px_rgba(26,54,93,0.2)] hover:-translate-y-0.5 hover:shadow-lg transition">
              Book Appointment
            </button>
          </Link>
        </div>

      </div>
    </header>
  );
}