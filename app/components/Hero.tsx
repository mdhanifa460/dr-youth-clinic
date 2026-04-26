"use client";
import Image from "next/image";
import { BadgeCheck } from "lucide-react";

export default function Hero({ city = "" }: { city?: string }) {
  const cityName = city
  ? "in " + city.charAt(0).toUpperCase() + city.slice(1)
  : "You Can Trust";
  return (
    <section id="home" className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden">

      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#f6faff] to-[#e8eff7] -z-10">
        <div className="absolute top-0 right-0 w-2/3 h-full opacity-20 translate-x-20">
          <Image
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBm1NEgX3uMFfFLvUMrsjaxl3mNk6btkGANh-M9tcm3JFH5kNd44ktGmWGEjjP08EOMo1p-xJzYG94C2p0brWqpDTWUAkAaFNEUdlc-8G1EnbKydlgNxdWzxC8cVkM_8BTML2aGe9rJOGnauhtPWOIyLbXMmgADsX-DMFH644HrrfXZLm7OnoJ6z5J9b9iU2hFIcKISguFfmJkBZFXrzhIFVQWbwpaDfPSE7DZJKB-sS99G2n08Hduvqi-fBFH-56PvmHShjLbvM1g"
            alt="Background"
            fill
            className="object-cover rounded-l-[120px]"
            priority
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-10 w-full grid md:grid-cols-2 gap-12 items-center">

        {/* LEFT */}
        <div className="max-w-xl space-y-8">

          {/* BADGE */}
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-tertiary text-primary text-sm font-semibold tracking-wide">
            <BadgeCheck size={16} className="text-primary" />
            DERMATOLOGY & AESTHETIC EXCELLENCE
          </span>

          {/* TITLE */}
          <h1 className="text-5xl md:text-6xl font-headline font-extrabold text-primary leading-tight">
            Advanced Skin & <br />
            Aesthetic Care <br />
            <span className="text-secondary"> {cityName} </span>
          </h1>

          {/* DESCRIPTION */}
          <p className="text-gray-800 text-lg leading-relaxed max-w-lg font-body font-semibold">
            Personalized treatments in {city || "your city"} for skin, hair, and laser care.
          </p>

          {/* BUTTONS */}
          <div className="flex flex-wrap gap-4 pt-4">
            <a href="#booking">
              <button className="bg-primary text-white px-8 py-4 rounded-xl font-semibold shadow-[0_10px_25px_rgba(0,32,69,0.2)] hover:-translate-y-0.5 hover:shadow-lg transition">
                Book Appointment
              </button>
            </a>

            <button className="bg-white border border-gray-300 text-primary px-8 py-4 rounded-xl font-semibold hover:bg-gray-50 transition">
              View Results
            </button>
          </div>
        </div>

        {/* RIGHT */}
        <div className="relative mt-10 md:mt-0">
          <div className="absolute -inset-4 bg-primary/10 blur-3xl rounded-full"></div>

          <div className="relative bg-white p-4 rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.1)]">
            <Image
              src="/images/hero-clinical.jpeg"
              alt="Clinical"
              width={400}
              height={400}
              sizes="(max-width: 768px) 100vw, 400px"
              className="rounded-[28px] w-full h-[420px] object-cover transition duration-500 hover:scale-[1.02]"
              priority
            />

            {/* BADGE */}
            <div className="absolute -bottom-4 -left-4 bg-secondary p-6 rounded-2xl shadow-xl max-w-[200px]">
              <p className="text-4xl text-white font-extrabold font-headline block mb-2">10k+</p>
              <p className="text-white/90 font-semibold text-sm">Successful Procedures Completed</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
