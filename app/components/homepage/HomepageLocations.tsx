import Link from 'next/link';
import { MdLocationOn, MdAccessTime, MdPhone } from 'react-icons/md';

const CITY_ROUTE: Record<string, string> = {
  Chennai: 'chennai',
  Bengaluru: 'bangalore',
  Bangalore: 'bangalore',
  Coimbatore: 'coimbatore',
  Kochi: 'kochi',
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
    <section id="contact" className="py-12 md:py-16 lg:py-20 bg-[#f6faff]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-[#0B2560] mb-2 leading-tight">
          {headline}
        </h2>
        <p className="text-gray-500 mb-8 md:mb-10 text-sm leading-relaxed">{subheadline}</p>

        <div className="grid md:grid-cols-[200px_1fr_300px] gap-4 md:gap-5 lg:gap-6 items-stretch">

          {/* CITY LIST */}
          <div className="bg-white rounded-3xl shadow-sm ring-1 ring-[#e8eff7] p-4 md:p-5 lg:p-6 transition-all duration-300 hover:shadow-[0_14px_34px_rgba(11,37,96,0.08)]">
            {/* Mobile: 2-col pill grid */}
            <div className="grid grid-cols-2 gap-2 md:hidden">
              {cities.map((city: string, i: number) => (
                <Link
                  key={i}
                  href={`/${getCityRoute(city)}`}
                  className="min-h-12 flex items-center gap-1.5 bg-[#f6faff] rounded-xl px-3 py-3 text-[#0B2560] font-semibold text-sm hover:bg-[#e8eff7] transition"
                >
                  <MdLocationOn className="text-[#F5A623] shrink-0" size={14} />
                  {city}
                </Link>
              ))}
              <Link
                href={`/${getCityRoute(cities[0] || 'chennai')}`}
                className="col-span-2 min-h-11 text-center text-[#3B82C4] text-xs font-semibold mt-1 hover:text-[#0B2560] transition flex items-center justify-center"
              >
                {viewAllText} →
              </Link>
            </div>

            {/* Desktop: vertical list */}
            <div className="hidden md:flex flex-col gap-4">
              {cities.map((city: string, i: number) => (
                <Link
                  key={i}
                  href={`/${getCityRoute(city)}`}
                  className="min-h-10 flex items-center gap-2 text-[#0B2560] font-semibold text-sm hover:text-[#F5A623] transition group"
                >
                  <MdLocationOn className="text-[#F5A623] shrink-0 group-hover:scale-110 transition-transform" size={16} />
                  {city}
                </Link>
              ))}
              <Link
                href={`/${getCityRoute(cities[0] || 'chennai')}`}
                className="min-h-10 text-[#3B82C4] text-xs font-semibold mt-2 hover:text-[#0B2560] transition flex items-center"
              >
                {viewAllText} →
              </Link>
            </div>
          </div>

          {/* MAP PLACEHOLDER — desktop only */}
          <div className="hidden md:flex bg-white rounded-3xl shadow-sm ring-1 ring-[#e8eff7] overflow-hidden min-h-[260px] items-center justify-center relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[#e8eff7] to-[#c5d9ef]" />
            <div className="relative z-10 text-center">
              <p className="text-4xl mb-2">🗺️</p>
              <p className="text-[#0B2560] font-semibold text-sm">Interactive Map</p>
              <p className="text-gray-500 text-xs mt-1">Chennai • Bengaluru • Coimbatore • Kochi</p>
            </div>
            {cities.map((city: string, i: number) => (
              <div
                key={i}
                className="absolute z-20 flex flex-col items-center"
                style={{ left: `${20 + i * 22}%`, top: `${30 + (i % 2) * 30}%` }}
              >
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
            <div className="bg-white rounded-3xl shadow-sm ring-1 ring-[#e8eff7] p-5 md:p-6 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(11,37,96,0.1)]">
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
                  className="min-h-12 bg-[#0B2560] text-white text-sm font-semibold py-3 px-4 rounded-xl text-center hover:bg-[#0d2d73] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  Get Directions →
                </a>
                {featuredCity.phone && (
                  <a
                    href={`tel:${featuredCity.phone.replace(/\s/g, '')}`}
                    className="min-h-12 border border-[#0B2560] text-[#0B2560] text-sm font-semibold py-3 px-4 rounded-xl text-center hover:bg-[#f6faff] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
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
