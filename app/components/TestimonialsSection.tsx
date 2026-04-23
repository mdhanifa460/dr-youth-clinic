"use client";

import Image from "next/image";
import { testimonials } from "../data/testimonials";

export default function TestimonialsSection() {
  return (
    <section className="py-24 px-6 md:px-10 bg-surface-container-low">
      <div className="max-w-7xl mx-auto space-y-12">

        {/* HEADER */}
        <div className="max-w-2xl">
          <h2 className="text-4xl font-extrabold text-primary">
            What Our Patients Say
          </h2>
          <p className="text-gray-600 mt-4">
            Real experiences from our satisfied patients across all locations.
          </p>
        </div>

        {/* HORIZONTAL SCROLL */}
        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">

          {testimonials.map((item) => (
            <div
              key={item.id}
              className="min-w-[300px] bg-white rounded-2xl p-6 shadow hover:shadow-xl transition flex flex-col justify-between"
            >

              {/* TOP */}
              <div>

                {/* USER */}
                <div className="flex items-center gap-4 mb-4">
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={50}
                    height={50}
                    className="rounded-full object-cover"
                  />

                  <div>
                    <h4 className="font-semibold text-primary">
                      {item.name}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {item.location}
                    </p>
                  </div>
                </div>

                {/* RATING */}
                <div className="flex mb-3">
                  {Array.from({ length: item.rating }).map((_, i) => (
                    <span key={i}>⭐</span>
                  ))}
                </div>

                {/* REVIEW */}
                <p className="text-gray-600 text-sm leading-relaxed">
                  "{item.review}"
                </p>

              </div>

            </div>
          ))}

        </div>

      </div>
    </section>
  );
}