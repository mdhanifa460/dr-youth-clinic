'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FaLinkedinIn } from 'react-icons/fa';
import { MapPin, LocateFixed, Users } from 'lucide-react';

// ── Geolocation helpers (same as HomepageLocations) ─────────────────────────
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  chennai:    { lat: 13.0827, lng: 80.2707 },
  bangalore:  { lat: 12.9716, lng: 77.5946 },
  coimbatore: { lat: 11.0168, lng: 76.9558 },
  kochi:      { lat:  9.9312, lng: 76.2673 },
};

const CITY_LABEL: Record<string, string> = {
  chennai: 'Chennai', bangalore: 'Bangalore',
  coimbatore: 'Coimbatore', kochi: 'Kochi',
};

const CITY_KEY: Record<string, string> = {
  Chennai: 'chennai', Bengaluru: 'bangalore', Bangalore: 'bangalore',
  Coimbatore: 'coimbatore', Kochi: 'kochi',
};
const toCityKey = (city: string) => CITY_KEY[city] ?? city.toLowerCase();

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestCityKey(lat: number, lng: number, available: string[]): string {
  let best = available[0];
  let bestDist = Infinity;
  for (const key of available) {
    const c = CITY_COORDS[key];
    if (!c) continue;
    const d = haversineKm(lat, lng, c.lat, c.lng);
    if (d < bestDist) { bestDist = d; best = key; }
  }
  return best;
}

// ── Doctor card ───────────────────────────────────────────────────────────────
function DoctorCard({ doc }: { doc: any }) {
  const role = doc.title || doc.role;
  const experience = typeof doc.experience === 'number'
    ? (doc.experience > 0 ? `${doc.experience}+ Years Exp.` : '')
    : (doc.experience || '');

  const inner = (
    <>
      <div className="relative aspect-[4/3] sm:aspect-[5/4] md:aspect-[4/5] bg-gradient-to-br from-[#e8eff7] to-[#c5d9ef] overflow-hidden">
        {doc.photo?.url ? (
          <Image
            src={doc.photo.url}
            alt={doc.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover object-top transition duration-500 md:hover:scale-105"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-6xl">👨‍⚕️</div>
        )}
      </div>
      <div className="p-4 md:p-5">
        <h3 className="font-bold text-[#0B2560] text-base md:text-sm leading-snug">{doc.name}</h3>
        <p className="text-gray-500 text-sm md:text-xs mt-1">{role}</p>
      </div>
    </>
  );

  return (
    <div className="bg-[#f6faff] rounded-3xl overflow-hidden shadow-sm ring-1 ring-[#e8eff7] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(11,37,96,0.1)]">
      {doc._id ? (
        <Link href={`/doctors/${doc._id}`} className="block">{inner}</Link>
      ) : inner}
      <div className="px-4 pb-4 md:px-5 md:pb-5 flex items-center justify-between -mt-1">
        <span className="text-xs text-[#3B82C4] font-semibold">{experience}</span>
        {doc.linkedIn && doc.linkedIn !== '#' && (
          <a
            href={doc.linkedIn}
            target="_blank"
            rel="noopener noreferrer"
            className="w-11 h-11 md:w-9 md:h-9 rounded-full bg-[#0B2560] flex items-center justify-center text-white hover:bg-[#0d2d73] hover:-translate-y-0.5 transition-all duration-300"
          >
            <FaLinkedinIn size={12} />
          </a>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DoctorsSection({ data }: { data: any }) {
  const {
    headline      = 'Meet Our Expert Doctors',
    subheadline   = 'Experienced professionals dedicated to delivering natural, safe & long-lasting results.',
    viewAllText   = 'View all',
    viewAllHref   = '#',
    doctors       = [],
    _detectedCity = '',
  } = data || {};

  if (doctors.length === 0) return null;

  // Derive available city tabs from actual doctor data, then order them to a
  // fixed city order — not doctor-scan order. Without this, Set insertion
  // order tracked whichever doctor happened to be sorted first by the admin's
  // `order` field, so Chennai could land last if a Bangalore/Coimbatore/Kochi
  // doctor's `order` was lower than every Chennai doctor's.
  const CANONICAL_CITY_ORDER = Object.keys(CITY_COORDS);
  const cityKeys = Array.from(
    new Set(
      doctors.flatMap((d: any) =>
        (d.locations as string[] || []).filter((l) => l !== 'all')
      )
    )
  ).sort(
    (a, b) => CANONICAL_CITY_ORDER.indexOf(a as string) - CANONICAL_CITY_ORDER.indexOf(b as string)
  ) as string[];

  // Server-detected city → initial tab
  const detectedKey = toCityKey(_detectedCity);
  const validKeys = cityKeys.length > 0 ? cityKeys : [];
  const initialTab = validKeys.includes(detectedKey) ? detectedKey : 'all';

  const [activeTab, setActiveTab]       = useState<string>(initialTab);
  const [autoDetected, setAutoDetected] = useState(validKeys.includes(detectedKey));

  // Browser geolocation — picks nearest city
  useEffect(() => {
    if (!navigator?.geolocation || validKeys.length === 0) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const nearest = nearestCityKey(coords.latitude, coords.longitude, validKeys);
        setActiveTab(nearest);
        setAutoDetected(true);
      },
      () => { /* denied — keep server default */ },
      { timeout: 6000, maximumAge: 300_000 },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter doctors for active tab
  const filtered = activeTab === 'all'
    ? doctors
    : doctors.filter((d: any) =>
        (d.locations as string[] || []).some((l) => l === activeTab || l === 'all')
      );

  // Count per tab for badges
  const countFor = (key: string) =>
    key === 'all'
      ? doctors.length
      : doctors.filter((d: any) =>
          (d.locations as string[] || []).some((l) => l === key || l === 'all')
        ).length;

  const tabs = ['all', ...validKeys];

  return (
    <section id="expertise" className="py-12 md:py-16 lg:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-[#0B2560] leading-tight">
              {headline}
            </h2>
            <p className="text-gray-500 mt-2 text-sm leading-relaxed max-w-lg">{subheadline}</p>
          </div>
          {viewAllHref && viewAllHref !== '#' && (
            <Link
              href={viewAllHref}
              className="hidden md:inline-flex items-center gap-1.5 border border-[#0B2560] text-[#0B2560] hover:bg-[#0B2560] hover:text-white px-5 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap"
            >
              {viewAllText} →
            </Link>
          )}
        </div>

        {/* Location tabs — only shown when we have multiple cities */}
        {validKeys.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-6">
            {tabs.map((tab) => {
              const isActive = activeTab === tab;
              const isDetected = autoDetected && tab === activeTab && tab !== 'all';
              const count = countFor(tab);
              return (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setAutoDetected(false); }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                    isActive
                      ? 'bg-[#0B2560] text-white border-[#0B2560] shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-[#0B2560] hover:text-[#0B2560]'
                  }`}
                >
                  {tab === 'all' ? (
                    <><Users size={13} /> All Locations</>
                  ) : (
                    <><MapPin size={13} /> {CITY_LABEL[tab] ?? tab}</>
                  )}
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {count}
                  </span>
                  {isDetected && (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full">
                      <LocateFixed size={9} /> Near you
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Doctor grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 lg:gap-6">
            {filtered.map((doc: any, i: number) => (
              <DoctorCard key={doc._id ?? i} doc={doc} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#f0f5ff] flex items-center justify-center mb-4">
              <Users size={24} className="text-[#0B2560]/30" />
            </div>
            <p className="text-gray-500 font-semibold">No doctors listed for this location yet.</p>
            <button
              onClick={() => setActiveTab('all')}
              className="mt-3 text-sm text-[#0B2560] font-bold underline underline-offset-2"
            >
              View all doctors →
            </button>
          </div>
        )}

        {/* Mobile view-all button */}
        {viewAllHref && viewAllHref !== '#' && (
          <div className="mt-8 flex justify-center md:hidden">
            <Link
              href={viewAllHref}
              className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-8 py-3 rounded-full text-sm font-bold hover:bg-[#0d2d73] transition-all shadow-lg shadow-[#0B2560]/20"
            >
              {viewAllText} →
            </Link>
          </div>
        )}

      </div>
    </section>
  );
}
