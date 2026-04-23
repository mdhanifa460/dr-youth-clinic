"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const [active, setActive] = useState("home");
  const [open, setOpen] = useState(false);

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

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-neutral">

      <div className="max-w-7xl mx-auto px-6 md:px-10 py-5 flex items-center justify-between">

        {/* LOGO */}
        <div className="flex items-center">
          <Image
            src="https://dryouthclinic.co.in/images/new-img/logo.png"
            alt="DR Youth Clinic"
            width={160}
            height={60}
            className="object-contain"
            priority
          />
        </div>

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
              href={`#${item.id}`}
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
              Locations
            </div>

            {open && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-full mt-2 bg-white shadow-lg rounded-xl p-4 z-[999]"
              >
                <div className="flex flex-col gap-2 min-w-[160px]">

                  <a href="/chennai" onClick={() => setOpen(false)} className="hover:bg-gray-100 px-2 py-1 rounded">
                    Chennai
                  </a>

                  <a href="/bangalore" onClick={() => setOpen(false)} className="hover:bg-gray-100 px-2 py-1 rounded">
                    Bangalore
                  </a>

                  <a href="/coimbatore" onClick={() => setOpen(false)} className="hover:bg-gray-100 px-2 py-1 rounded">
                    Coimbatore
                  </a>

                  <a href="/kochi" onClick={() => setOpen(false)} className="hover:bg-gray-100 px-2 py-1 rounded">
                    Kochi
                  </a>

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