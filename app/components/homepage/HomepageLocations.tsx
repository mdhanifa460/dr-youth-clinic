'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  MapPin, Clock, Phone, Star, ChevronRight,
  Users, Stethoscope, Navigation, CalendarCheck, LayoutGrid,
} from 'lucide-react';
import { locations } from '@/app/data/locations';

const CITY_KEY: Record<string, string> = {
  Chennai: 'chennai',
  Bengaluru: 'bangalore',
  Bangalore: 'bangalore',
  Coimbatore: 'coimbatore',
  Kochi: 'kochi',
};
const toCityKey = (city: string) => CITY_KEY[city] ?? city.toLowerCase();

// ── Open/closed calculator (IST) ─────────────────────────────────────────────
function getOpenStatus(hours: { day: string; hours: string }[]): { isOpen: boolean; text: string } {
  try {
    const ist  = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const day  = ist.getDay();
    const mins = ist.getHours() * 60 + ist.getMinutes();
    const dayLabel = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][day];

    for (const slot of hours) {
      const s = slot.day.toLowerCase();
      const covers =
        s.includes(dayLabel) ||
        (day >= 1 && day <= 6 && (s.includes('monday - saturday') || s.includes('monday–saturday') || s.includes('mon - sat'))) ||
        (day >= 1 && day <= 5 && (s.includes('monday - friday') || s.includes('mon - fri')));
      if (!covers) continue;

      if (/closed/i.test(slot.hours))      return { isOpen: false, text: 'Closed Today' };
      if (/appointment/i.test(slot.hours)) return { isOpen: true,  text: 'By Appointment' };

      const m = slot.hours.match(/(\d+):(\d+)\s*(AM|PM)\s*[-–]\s*(\d+):(\d+)\s*(AM|PM)/i);
      if (!m) continue;
      const toM = (h: number, mn: number, p: string) => {
        let hr = h;
        if (p.toUpperCase() === 'PM' && hr !== 12) hr += 12;
        if (p.toUpperCase() === 'AM' && hr === 12) hr = 0;
        return hr * 60 + mn;
      };
      const open  = toM(+m[1], +m[2], m[3]);
      const close = toM(+m[4], +m[5], m[6]);
      if (mins >= open && mins < close) return { isOpen: true,  text: 'Open Now' };
      if (mins < open)                  return { isOpen: false, text: 'Opens Soon' };
      return { isOpen: false, text: 'Closed' };
    }
  } catch {}
  return { isOpen: false, text: 'Closed' };
}

// ── Location thumbnail ────────────────────────────────────────────────────────
const CITY_GRADIENTS: Record<string, string> = {
  chennai:    'from-blue-600 to-indigo-700',
  bangalore:  'from-purple-600 to-violet-700',
  coimbatore: 'from-emerald-500 to-teal-600',
  kochi:      'from-orange-500 to-amber-600',
};

export default function HomepageLocations({ data }: { data: any }) {
  const {
    headline    = 'Our Locations',
    subheadline = 'Advanced skin & hair care treatments. Expert doctors. Multiple locations to serve you better.',
    cities      = [],
    _embeds     = {},
  } = data || {};

  const [activeKey, setActiveKey] = useState<string>(toCityKey(cities[0] || 'Chennai'));

  const loc         = locations[activeKey];
  const embed       = _embeds[activeKey] ?? {};
  const embedUrl    = embed.mapEmbedUrl    || loc?.map || '';
  const directionsUrl = embed.googleMapsUrl ||
    (loc ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(loc.address)}` : '#');
  const heroImg     = embed.heroImageUrl   || '';
  const openStatus  = loc ? getOpenStatus(loc.hours) : { isOpen: false, text: 'Closed' };

  const STATS = [
    { value: String(cities.length || 4),     label: 'Clinics Across India', icon: MapPin },
    { value: '20+',                           label: 'Expert Doctors',       icon: Users },
    { value: '50+',                           label: 'Advanced Treatments',  icon: Stethoscope },
    { value: '25,000+',                       label: 'Happy Patients',       icon: CalendarCheck },
    { value: '4.9 ★',                         label: 'Google Rating',        icon: Star },
  ];

  return (
    <section id="contact" className="py-14 md:py-20 bg-[#f6faff]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">

        {/* ── Section header ── */}
        <div className="text-center mb-10">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#F5A623] flex items-center justify-center gap-2 mb-3">
            <MapPin size={13} /> OUR LOCATIONS
          </p>
          <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-[#0B2560] leading-tight mb-3">
            {headline}
          </h2>
          <p className="text-gray-500 text-sm max-w-xl mx-auto leading-relaxed">{subheadline}</p>
        </div>

        {/* ── 3-column grid ── */}
        <div className="grid md:grid-cols-[280px_1fr_300px] gap-4 lg:gap-5 items-stretch min-h-[420px]">

          {/* ── LEFT: city list ── */}
          <div className="bg-white rounded-3xl shadow-sm ring-1 ring-[#e8eff7] overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-gray-50">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select a location</p>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {cities.map((city: string, i: number) => {
                const key    = toCityKey(city);
                const cloc   = locations[key];
                const cembed = _embeds[key] ?? {};
                const status = cloc ? getOpenStatus(cloc.hours) : { isOpen: false, text: 'Closed' };
                const active = activeKey === key;

                return (
                  <button
                    key={i}
                    onClick={() => setActiveKey(key)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all group ${
                      active ? 'bg-[#f0f5ff] border-l-[3px] border-[#0B2560]' : 'hover:bg-gray-50 border-l-[3px] border-transparent'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                      {cembed.heroImageUrl ? (
                        <Image
                          src={cembed.heroImageUrl}
                          alt={city}
                          width={56}
                          height={56}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${CITY_GRADIENTS[key] || 'from-blue-500 to-indigo-600'} flex items-center justify-center`}>
                          <span className="text-white font-bold text-lg">{city[0]}</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <MapPin size={11} className="text-[#F5A623] shrink-0" />
                        <span className={`font-bold text-sm truncate ${active ? 'text-[#0B2560]' : 'text-gray-800'}`}>{city}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Star size={10} className="text-[#F5A623] fill-[#F5A623]" />
                        <span className="text-xs text-gray-600 font-semibold">{cloc?.rating ?? '4.9'}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          status.isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {status.text}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400">
                        {cloc?.serviceCount ?? '—'}+ Services &nbsp;·&nbsp; {cloc?.doctorCount ?? '—'} Doctors
                      </p>
                    </div>

                    <ChevronRight size={14} className={`shrink-0 transition-colors ${active ? 'text-[#0B2560]' : 'text-gray-300 group-hover:text-gray-400'}`} />
                  </button>
                );
              })}
            </div>
            <div className="p-4 border-t border-gray-50">
              <Link
                href={`/${activeKey}`}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-[#0B2560]/20 text-[#0B2560] text-xs font-bold hover:bg-[#0B2560] hover:text-white transition-all"
              >
                <LayoutGrid size={13} /> View all clinics
              </Link>
            </div>
          </div>

          {/* ── MIDDLE: map iframe ── */}
          <div className="hidden md:block bg-white rounded-3xl shadow-sm ring-1 ring-[#e8eff7] overflow-hidden">
            {embedUrl ? (
              <iframe
                key={activeKey}
                src={embedUrl}
                width="100%"
                height="100%"
                style={{ border: 0, display: 'block', minHeight: '420px' }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
                title={`DR Youth Clinic ${loc?.name ?? activeKey} map`}
              />
            ) : (
              <div className="h-full min-h-[420px] flex flex-col items-center justify-center bg-gradient-to-br from-[#e8eff7] to-[#c5d9ef] gap-3">
                <MapPin size={32} className="text-[#0B2560]/30" />
                <p className="text-[#0B2560]/50 text-sm font-semibold">Map not configured</p>
                <p className="text-gray-400 text-xs">Add embed URL in Admin → Locations</p>
              </div>
            )}
          </div>

          {/* ── RIGHT: detail card ── */}
          {loc && (
            <div className="bg-white rounded-3xl shadow-sm ring-1 ring-[#e8eff7] overflow-hidden flex flex-col">
              {/* Hero image */}
              <div className="relative h-44 w-full shrink-0">
                {heroImg ? (
                  <Image src={heroImg} alt={`DR Youth Clinic ${loc.name}`} fill className="object-cover" />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${CITY_GRADIENTS[activeKey] || 'from-blue-500 to-indigo-700'} flex items-center justify-center`}>
                    <p className="text-white font-bold text-xl tracking-wide">DR Youth Clinic</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <span className="absolute bottom-3 left-4 text-white text-xs font-bold bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full">
                  {loc.name}
                </span>
              </div>

              <div className="flex-1 flex flex-col p-5 gap-4">
                {/* Title + rating */}
                <div>
                  <h3 className="font-bold text-[#0B2560] text-base leading-tight mb-1">
                    DR Youth Clinic — {loc.name}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <Star size={13} className="text-[#F5A623] fill-[#F5A623]" />
                    <span className="font-bold text-sm text-gray-800">{loc.rating}</span>
                    <span className="text-xs text-gray-400">({loc.reviewCount} Google reviews)</span>
                  </div>
                </div>

                {/* Info rows */}
                <div className="space-y-2.5 text-sm">
                  <div className="flex gap-2.5 text-gray-600">
                    <MapPin size={14} className="text-[#F5A623] shrink-0 mt-0.5" />
                    <span className="leading-snug">{loc.address}</span>
                  </div>
                  <div className="flex gap-2.5 text-gray-600 items-center">
                    <Clock size={14} className="text-[#F5A623] shrink-0" />
                    <span>{loc.hours[0].hours}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      openStatus.isOpen ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-500'
                    }`}>
                      {openStatus.text}
                    </span>
                  </div>
                  <div className="flex gap-2.5 text-gray-600 items-center">
                    <Users size={14} className="text-[#F5A623] shrink-0" />
                    <span>{loc.doctorCount} Doctors</span>
                  </div>
                  <div className="flex gap-2.5 text-gray-600 items-center">
                    <Stethoscope size={14} className="text-[#F5A623] shrink-0" />
                    <span>{loc.serviceCount}+ Treatments Available</span>
                  </div>
                </div>

                {/* CTAs */}
                <div className="flex flex-col gap-2 mt-auto">
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 bg-[#0B2560] text-white text-xs font-bold py-2.5 rounded-xl hover:bg-[#0d2d73] transition"
                    >
                      <Navigation size={12} /> Get Directions
                    </a>
                    <a
                      href={`tel:${loc.phone.replace(/\s/g, '')}`}
                      className="flex items-center justify-center gap-1.5 border border-[#0B2560] text-[#0B2560] text-xs font-bold py-2.5 rounded-xl hover:bg-[#f6faff] transition"
                    >
                      <Phone size={12} /> Call Now
                    </a>
                  </div>
                  <Link
                    href="/book"
                    className="flex items-center justify-center gap-2 bg-[#F5A623] text-white text-sm font-bold py-3 rounded-xl hover:bg-[#e69910] transition"
                  >
                    <CalendarCheck size={14} /> Book Consultation
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Stats bar ── */}
        <div className="mt-5 bg-white rounded-3xl shadow-sm ring-1 ring-[#e8eff7] px-6 py-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
            {STATS.map(({ value, label, icon: Icon }, i) => (
              <div key={i} className="flex items-center gap-3 py-2 sm:py-0 sm:px-4 first:pl-0 last:pr-0">
                <div className="w-9 h-9 rounded-xl bg-[#f0f5ff] flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-[#0B2560]" />
                </div>
                <div>
                  <p className="font-extrabold text-[#0B2560] text-base leading-none">{value}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{label}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-4 pt-4 border-t border-gray-50">
            Trusted by thousands of patients for safe, effective &amp; personalized care.
          </p>
        </div>

      </div>
    </section>
  );
}
