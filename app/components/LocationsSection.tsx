"use client";

import Image from "next/image";
import Link from "next/link";

type Props = {
  activeCity?: string;
  showAll?: boolean;
};

type Location = {
  name: string;
  label: string;
  address: string;
  image?: string;
  flagship?: boolean;
};

const locations: Location[] = [
  {
    name: "chennai",
    label: "Chennai",
    address: "Nungambakkam, Chennai",
    image: "/images/chennai.jpg",
    flagship: true,
  },
  {
    name: "bangalore",
    label: "Bangalore",
    address: "Indiranagar, Bangalore",
    image: "/images/bangalore.jpg",
  },
  {
    name: "kochi",
    label: "Kochi",
    address: "Kakkanad, Kochi",
    image: "/images/kochi.jpg",
  },
  {
    name: "coimbatore",
    label: "Coimbatore",
    address: "Peelamedu, Coimbatore",
    image: "/images/coimbatore.jpg",
  },
];

export default function LocationsSection({
  activeCity,
  showAll = false,
}: Props) {

  // ✅ clean and stable logic
  const highlightCity = activeCity || "chennai";

  // ✅ filter for location page
  const filteredLocations = showAll
    ? locations
    : locations.filter((loc) => loc.name !== highlightCity);

  return (
    <section id="locations" className="py-24 px-6 md:px-10 bg-surface-container-low">
      <div className="max-w-7xl mx-auto space-y-12">

        {/* TITLE */}
        <div className="max-w-2xl">
          <h2 className="text-4xl font-extrabold text-primary font-headline">
            Our Clinics
          </h2>
          <p className="text-on-surface-variant mt-4">
            Experience advanced dermatological care across our premium locations.
          </p>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">

          {filteredLocations.map((city) => {
            const isActive = showAll && city.name === highlightCity;

            // 🔥 BIG CARD (HOME ONLY)
            if (isActive) {
              return (
                <Link
                  key={city.name}
                  href={`/${city.name}`}
                  className="lg:col-span-7 group bg-white rounded-2xl overflow-hidden shadow hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="flex flex-col md:flex-row">

                    {/* TEXT */}
                    <div className="p-6 space-y-4 flex-1">
                      {city.flagship && (
                        <span className="text-xs text-secondary font-bold uppercase">
                          Flagship Center
                        </span>
                      )}

                      <h3 className="text-2xl font-bold text-primary">
                        {city.label}
                      </h3>

                      <p className="text-gray-600">
                        {city.address}
                      </p>

                      <span className="text-secondary font-semibold">
                        Book Appointment →
                      </span>
                    </div>

                    {/* IMAGE */}
                    <div className="h-48 md:h-auto md:w-1/2 overflow-hidden">
                      <Image
                        src={city.image || "/images/default-clinic.jpg"}
                        alt={city.label}
                        width={500}
                        height={400}
                        sizes="(max-width: 768px) 100vw, 500px"
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition duration-300"
                      />
                    </div>

                  </div>
                </Link>
              );
            }

            // 🔹 NORMAL CARD
            return (
              <Link
                key={city.name}
                href={`/${city.name}`}
                className="lg:col-span-5 bg-white p-6 rounded-2xl shadow hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-primary">
                      {city.label}
                    </h3>

                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      Clinic
                    </span>
                  </div>

                  <p className="text-gray-600 mt-2">
                    {city.address}
                  </p>

                  <div className="w-full h-[1px] bg-gray-100 my-4"></div>
                </div>

                <span className="text-secondary font-semibold text-sm">
                  View →
                </span>
              </Link>
            );
          })}

        </div>

        {/* VIEW ALL (HOME ONLY) */}
        {showAll && (
          <div className="text-center pt-6">
            <Link
              href="/locations"
              className="text-secondary font-semibold hover:underline"
            >
              View All Locations →
            </Link>
          </div>
        )}

      </div>
    </section>
  );
}