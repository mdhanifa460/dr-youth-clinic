"use client";
import { Phone } from "lucide-react";

export default function CTA({ city = "" }: { city?: string }) {
  return (
    <section id="contact" className="px-6 md:px-10 mb-24">
      <div className="max-w-7xl mx-auto bg-primary rounded-[40px] p-12 md:p-20 text-center relative overflow-hidden">

        {/* LIGHT EFFECT */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_120%,#ffffff,transparent_60%)]"></div>

        <div className="relative z-10 space-y-8">

          {/* TITLE */}
          <h2 className="text-4xl md:text-5xl font-headline font-extrabold text-white max-w-4xl mx-auto leading-tight">
            Ready to experience the next level of aesthetic care?
          </h2>

          {/* DESCRIPTION */}
          <p className="text-white/80 text-lg max-w-2xl mx-auto font-semibold">
            Join thousands of satisfied patients who have transformed their confidence through our clinical expertise.
          </p>

          {/* ACTIONS */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-4">

            {/* PRIMARY BUTTON */}
            <button className="bg-white text-primary px-10 py-4 rounded-xl font-bold text-lg shadow-xl hover:-translate-y-1 hover:shadow-2xl transition">
              Schedule Consultation
            </button>

            {/* PHONE */}
            <a
              href="tel:+1234567890"
              className="flex items-center gap-3 text-white font-semibold text-lg hover:opacity-80 transition"
            >
              <Phone size={20} className="text-white" />
              +1 (800) YOUTH-CARE
            </a>

          </div>
        </div>
      </div>
    </section>
  );
}