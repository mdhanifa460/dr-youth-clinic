import Link from 'next/link';
import { MdLocationOn, MdAccessTime, MdPhone } from 'react-icons/md';

// Map display name → route key (handles Bengaluru → bangalore spelling variant)
const CITY_ROUTE: Record<string, string> = {
  'Chennai': 'chennai',
  'Bengaluru': 'bangalore',
  'Bangalore': 'bangalore',
  'Coimbatore': 'coimbatore',
  'Kochi': 'kochi',
};
const getCityRoute = (city: string) => CITY_ROUTE[city] ?? city.toLowerCase();

export default function HomepageLocations({ data }: { data: any }) {
  const {
    headline = 'Our Locations',
    subheadline = 'We are available in multiple locations to serve you better.',
    cities = [],
    viewAllText = 'View all clinics',
    featuredCity = {},
  } = data || {};

  return (
    <section id="contact" className="py-20 bg-[#f6faff]">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-[#0B2560] mb-2">
          {headline}
        </h2>
        <p className="text-gray-500 mb-10 text-sm">{subheadline}</p>

        <div className="grid md:grid-cols-[200px_1fr_300px] gap-6 items-stretch">
          {/* CITY LIST */}
          <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4">
            {cities.map((city: string, i: number) => (
              <Link
                key={i}
                href={`/${getCityRoute(city)}`}
                className="flex items-center gap-2 text-[#0B2560] font-semibold text-sm hover:text-[#F5A623] transition group"
              >
                <MdLocationOn className="text-[#F5A623] shrink-0 group-hover:scale-110 transition-transform" size={16} />
                {city}
              </Link>
            ))}
            <Link href={`/${getCityRoute(cities[0] || 'chennai')}`} className="text-[#3B82C4] text-xs font-semibold mt-2 hover:text-[#0B2560] transition">
              {viewAllText} →
            </Link>
          </div>

          {/* MAP PLACEHOLDER */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden min-h-[240px] flex items-center justify-center relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[#e8eff7] to-[#c5d9ef]" />
            <div className="relative z-10 text-center">
              <p className="text-4xl mb-2">🗺️</p>
              <p className="text-[#0B2560] font-semibold text-sm">Interactive Map</p>
              <p className="text-gray-500 text-xs mt-1">Chennai • Bengaluru • Coimbatore • Kochi</p>
            </div>
            {/* Location pins overlay */}
            {cities.map((city: string, i: number) => (
              <div key={i}
                className="absolute z-20 flex flex-col items-center"
                style={{ left: `${20 + i * 22}%`, top: `${30 + (i % 2) * 30}%` }}>
                <div className="w-6 h-6 rounded-full bg-[#0B2560] flex items-center justify-center shadow-md">
                  <MdLocationOn className="text-white" size={14} />
                </div>
                <span className="text-[10px] font-bold text-[#0B2560] mt-0.5 bg-white px-1 rounded shadow-sm">
                  {city}
                </span>
              </div>
            ))}
          </div>

          {/* FEATURED CITY */}
          {featuredCity?.name && (
            <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-4">
              <h3 className="text-[#0B2560] font-bold text-lg">{featuredCity.name}</h3>

              {featuredCity.address && (
                <div className="flex gap-2 text-sm text-gray-600">
                  <MdLocationOn className="text-[#F5A623] shrink-0 mt-0.5" size={16} />
                  <span>{featuredCity.address}</span>
                </div>
              )}
              {featuredCity.hours && (
                <div className="flex gap-2 text-sm text-gray-600">
                  <MdAccessTime className="text-[#F5A623] shrink-0 mt-0.5" size={16} />
                  <span>{featuredCity.hours}</span>
                </div>
              )}

              <div className="flex flex-col gap-2 mt-2">
                <a
                  href={featuredCity.directionsHref || '#'}
                  className="bg-[#0B2560] text-white text-sm font-semibold py-2.5 px-4 rounded-xl text-center hover:bg-[#0d2d73] transition flex items-center justify-center gap-2"
                >
                  Get Directions →
                </a>
                {featuredCity.phone && (
                  <a
                    href={`tel:${featuredCity.phone.replace(/\s/g, '')}`}
                    className="border border-[#0B2560] text-[#0B2560] text-sm font-semibold py-2.5 px-4 rounded-xl text-center hover:bg-[#f6faff] transition flex items-center justify-center gap-2"
                  >
                    <MdPhone size={14} /> Call Now
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
