"use client";
import Image from "next/image";
import { Globe, Share2, ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-primary text-white mt-24">

      <div className="grid grid-cols-1 md:grid-cols-4 gap-10 px-6 md:px-10 py-16 max-w-7xl mx-auto">

        {/* LOGO */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Image
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCzQalUPAosSCDd9BhS1cazDLHuaysjEnaTr4M_bvJ0uab3zsZp6bWN59xBrD5uBDw7pjehWnjO90Z4Bq1qy4J07nXSEUo7QNtYWuEuI4UcprjPmveNCrXIsLxszXBKjCIY0wXaVJee4i32OMhmsUWy5rfXjnNzkB-4nJ0sB74QGixAffrZN_esPPKHnbFRwnQ2dyEZCiPxl3qiBZ_-QoZfsPatjtoyX1I6HdTiToZr0urPJVcFGxPQc28K__-Ih2I3ANr_fREv21M"
              alt="DR Youth Clinic"
              width={36}
              height={36}
              className="object-contain invert"
            />
            <span className="text-lg font-bold font-headline">
              DR Youth Clinic
            </span>
          </div>

          <p className="text-white/70 leading-relaxed text-sm">
            Setting the benchmark for premium dermatological care and medical aesthetics since 2004.
          </p>
        </div>

        {/* LOCATIONS */}
        <div className="space-y-6">
          <h4 className="font-headline font-bold text-lg">Our Locations</h4>
          <ul className="space-y-3 text-white/70">
            {["Chennai", "Bangalore", "Kochi", "Coimbatore"].map((city) => (
              <li key={city}>
                <a href="#" className="hover:text-white transition">
                  {city}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* LINKS */}
        <div className="space-y-6">
          <h4 className="font-headline font-bold text-lg">Quick Links</h4>
          <ul className="space-y-3 text-white/70">
            <li><a href="#" className="hover:text-white">Clinical Services</a></li>
            <li><a href="#" className="hover:text-white">Patient Results</a></li>
            <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-white">Terms of Service</a></li>
          </ul>
        </div>

        {/* NEWSLETTER */}
        <div className="space-y-6">
          <h4 className="font-headline font-bold text-lg">Newsletter</h4>
          <p className="text-white/70 text-sm">
            Subscribe for skin health tips and exclusive updates.
          </p>

          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Your email"
              className="bg-white/10 rounded-lg px-4 py-2 text-white placeholder:text-white/50 w-full focus:outline-none focus:ring-2 focus:ring-secondary"
            />
            <button className="bg-secondary px-4 py-2 rounded-lg font-semibold hover:bg-secondary/80 transition">
              Join
            </button>
          </div>
        </div>

      </div>

      {/* BOTTOM */}
      <div className="border-t border-white/10 py-6 px-6 md:px-10 max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">

        <p className="text-white/60 text-sm">
          © 2024 DR Youth Clinic. All rights reserved.
        </p>

        <div className="flex gap-5 text-white/70">
          <Globe className="hover:text-white cursor-pointer" />
          <Share2 className="hover:text-white cursor-pointer" />
          <ShieldCheck className="hover:text-white cursor-pointer" />
        </div>

      </div>
    </footer>
  );
}