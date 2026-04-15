import Image from "next/image";
import Link from "next/link";

const locations = [
  {
    name: "Chennai",
    image: "/images/hero-clinical.jpeg",
    address: "Nungambakkam, Chennai",
  },
  {
    name: "Bangalore",
    image: "/images/hero-bg.png",
    address: "Indiranagar, Bangalore",
  },
  {
    name: "Kochi",
    image: "/images/hero-bg.png",
    address: "Kakkanad, Kochi",
  },
  {
    name: "Coimbatore",
    image: "/images/hero-bg.png",
    address: "Peelamedu, Coimbatore",
  },
];

export default function LocationsSection() {
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

          {locations.map((loc, i) => (
            <Link
              key={i}
              href={`/${loc.name.toLowerCase()}`}
              className="group bg-white rounded-2xl overflow-hidden shadow hover:shadow-xl transition"
            >

              {/* IMAGE */}
              <div className="h-40 overflow-hidden">
                <Image
                  src={loc.image}
                  alt={loc.name}
                  width={400}
                  height={200}
                  className="w-full h-full object-cover group-hover:scale-105 transition"
                />
              </div>

              {/* CONTENT */}
              <div className="p-4 space-y-2">
                <h3 className="text-xl font-bold text-primary">
                  {loc.name}
                </h3>
                <p className="text-sm text-gray-600">
                  {loc.address}
                </p>

                <span className="text-secondary font-semibold text-sm">
                  View Clinic →
                </span>
              </div>

            </Link>
          ))}

        </div>

      </div>
    </section>
  );
}