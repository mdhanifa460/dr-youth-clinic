"use client";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [active, setActive] = useState("home");

  useEffect(() => {
    const sections = ["home", "services", "results", "locations", "expertise", "contact"];

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

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
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
          {[
            { name: "Home", id: "home" },
            { name: "Services", id: "services" },
            { name: "Results", id: "results" },
            { name: "Locations", id: "locations" },
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
        </nav>

        {/* CTA BUTTON */}
        <div>
          <button className="bg-primary text-white px-6 py-2.5 rounded-xl font-body font-semibold shadow-[0px_10px_25px_rgba(26,54,93,0.2)] hover:-translate-y-0.5 hover:shadow-lg transition">
            Book Appointment
          </button>
        </div>

      </div>
    </header>
  );
}