'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MdLocationOn, MdAccessTime, MdPhone } from 'react-icons/md';
import { locations } from '@/app/data/locations';

const CITY_ROUTE: Record<string, string> = {
  Chennai: 'chennai',
  Bengaluru: 'bangalore',
  Bangalore: 'bangalore',
  Coimbatore: 'coimbatore',
  Kochi: 'kochi',
};
const getCityKey = (city: string) => CITY_ROUTE[city] ?? city.toLowerCase();

export default function HomepageLocations({ data }: { data: any }) {
  const {
    headline = 'Our Locations',
    subheadline = 'We are available in multiple locations to serve you better.',
    cities = [],
    viewAllText = 'View all clinics',
    _embeds = {},
  } = data || {};

  const [activeKey, setActiveKey] = useState<string>(getCityKey(cities[0] || 'Chennai'));

  const activeLoc = locations[activeKey];

  // Prefer the DB-saved embed URL, fall back to static locations.ts map URL
  const embedUrl = _embeds[activeKey]?.mapEmbedUrl || activeLoc?.map || '';
  const directionsUrl =
    _embeds[activeKey]?.googleMapsUrl ||
    (activeLoc ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeLoc.address)}` : '#');

  return (
    <section id="contact" className="py-12 md:py-16 lg:py-20 bg-[#f6faff]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-[#0B2560] mb-2 leading-tight">
          {headline}
        </h2>
        <p className="text-gray-500 mb-8 md:mb-10 text-sm leading-relaxed">{subheadline}</p>

        <div className="grid md:grid-cols-[200px_1fr_300px] gap-4 md:gap-5 lg:gap-6 items-stretch">

          {/* ── CITY LIST ── */}
          <div className="bg-white rounded-3xl shadow-sm ring-1 ring-[#e8eff7] p-4 md:p-5 lg:p-6 transition-all duration-300 hover:shadow-[0_14px_34px_rgba(11,37,96,0.08)]">
            {/* Mobile: 2-col pill grid */}
            <div className="grid grid-cols-2 gap-2 md:hidden">
              {cities.map((city: string, i: number) => {
                const key = getCityKey(city);
                const active = activeKey === key;
                return (
                  <button
                    key={i}
                    onClick={() => setActiveKey(key)}
                    className={`min-h-12 flex items-center gap-1.5 rounded-xl px-3 py-3 font-semibold text-sm transition ${
                      active ? 'bg-[#0B2560] text-white' : 'bg-[#f6faff] text-[#0B2560] hover:bg-[#e8eff7]'
                    }`}
                  >
                    <MdLocationOn className="text-[#F5A623] shrink-0" size={14} />
                    {city}
                  </button>
                );
              })}
              <Link
                href={`/${activeKey}`}
                className="col-span-2 min-h-11 text-center text-[#3B82C4] text-xs font-semibold mt-1 hover:text-[#0B2560] transition flex items-center justify-center"
              >
                {viewAllText} →
              </Link>
            </div>

            {/* Desktop: vertical list */}
            <div className="hidden md:flex flex-col gap-4">
              {cities.map((city: string, i: number) => {
                const key = getCityKey(city);
                const active = activeKey === key;
                return (
                  <button
                    key={i}
                    onClick={() => setActiveKey(key)}
                    className={`min-h-10 flex items-center gap-2 font-semibold text-sm transition text-left ${
                      active ? 'text-[#F5A623]' : 'text-[#0B2560] hover:text-[#F5A623]'
                    }`}
                  >
                    <MdLocationOn
                      className={`text-[#F5A623] shrink-0 transition-transform ${active ? 'scale-125' : ''}`}
                      size={16}
                    />
                    {city}
                  </button>
                );
              })}
              <Link
                href={`/${activeKey}`}
                className="min-h-10 text-[#3B82C4] text-xs font-semibold mt-2 hover:text-[#0B2560] transition flex items-center"
              >
                {viewAllText} →
              </Link>
            </div>
          </div>

          {/* ── MAP — switches with city selection ── */}
          <div className="hidden md:block bg-white rounded-3xl shadow-sm ring-1 ring-[#e8eff7] overflow-hidden min-h-[260px]">
            {embedUrl ? (
              <iframe
                key={activeKey}
                src={embedUrl}
                width="100%"
                height="100%"
                style={{ border: 0, display: 'block', minHeight: '260px' }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
                title={`DR Youth Clinic ${activeLoc?.name ?? activeKey} map`}
              />
            ) : (
              <div className="h-full min-h-[260px] flex items-center justify-center bg-gradient-to-br from-[#e8eff7] to-[#c5d9ef]">
                <div className="text-center">
                  <p className="text-4xl mb-2">🗺️</p>
                  <p className="text-[#0B2560] font-semibold text-sm">Map coming soon</p>
                </div>
              </div>
            )}
          </div>

          {/* ── CITY INFO CARD — updates with selection ── */}
          {activeLoc && (
            <div className="bg-white rounded-3xl shadow-sm ring-1 ring-[#e8eff7] p-5 md:p-6 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(11,37,96,0.1)]">
              <h3 className="text-[#0B2560] font-bold text-lg">{activeLoc.name}</h3>

              {activeLoc.address && (
                <div className="flex gap-2 text-sm text-gray-600">
                  <MdLocationOn className="text-[#F5A623] shrink-0 mt-0.5" size={16} />
                  <span>{activeLoc.address}</span>
                </div>
              )}

              {activeLoc.hours?.[0] && (
                <div className="flex gap-2 text-sm text-gray-600">
                  <MdAccessTime className="text-[#F5A623] shrink-0 mt-0.5" size={16} />
                  <span>{activeLoc.hours[0].day}: {activeLoc.hours[0].hours}</span>
                </div>
              )}

              <div className="flex flex-col gap-2 mt-auto">
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-12 bg-[#0B2560] text-white text-sm font-semibold py-3 px-4 rounded-xl text-center hover:bg-[#0d2d73] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  Get Directions →
                </a>
                {activeLoc.phone && (
                  <a
                    href={`tel:${activeLoc.phone.replace(/\s/g, '')}`}
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
