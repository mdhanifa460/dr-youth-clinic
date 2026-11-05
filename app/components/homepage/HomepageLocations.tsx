'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ImageWithFallback from '@/app/components/media/ImageWithFallback';
import {
  MapPin, Clock, Phone, ChevronRight,
  Users, Stethoscope, Navigation, CalendarCheck, LayoutGrid, LocateFixed,
} from 'lucide-react';
import { locations } from '@/app/data/locations';
import { toTelHref } from '@/app/lib/phone';

const CITY_KEY: Record<string, string> = {
  Chennai: 'chennai',
  Bengaluru: 'bangalore',
  Bangalore: 'bangalore',
  Coimbatore: 'coimbatore',
  Kochi: 'kochi',
};
const toCityKey = (city: string) => CITY_KEY[city] ?? city.toLowerCase();

// Approximate city-centre coordinates for each clinic key
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  chennai:    { lat: 13.0827, lng: 80.2707 },
  bangalore:  { lat: 12.9716, lng: 77.5946 },
  coimbatore: { lat: 11.0168, lng: 76.9558 },
  kochi:      { lat:  9.9312, lng: 76.2673 },
};

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

export default function HomepageLocations({ data }: { data: any }) {
  const {
    headline      = 'Our Locations',
    subheadline   = 'Advanced skin & hair care treatments. Expert doctors. Multiple locations to serve you better.',
    cities        = [],
    _doctorCount = 0,
    _doctorCountByCity = {},
    _treatmentCount = 0,
    _embeds       = {},
    _detectedCity = '',
  } = data || {};

  const availableKeys = (cities as string[]).map(toCityKey);
  const detectedKey = toCityKey(_detectedCity);
  const initialKey = availableKeys.includes(detectedKey)
    ? detectedKey
    : toCityKey(cities[0] || 'Chennai');

  const [activeKey, setActiveKey] = useState<string>(initialKey);
  const [autoDetected, setAutoDetected] = useState(availableKeys.includes(detectedKey));

  // This page is cached and shared, so the server can't pick the visitor's city.
  // Their chosen location is read here instead, and geolocation below can still
  // override it if granted.
  useEffect(() => {
    const match = document.cookie.match(/(?:^|; )preferred_location=([^;]+)/);
    const chosen = match ? toCityKey(decodeURIComponent(match[1])) : '';
    if (availableKeys.includes(chosen)) {
      setActiveKey(chosen);
      setAutoDetected(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open/closed depends on the visitor's current time, and this page is cached,
  // so it's only worked out in the browser.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Only on request. Asking on page load showed a permission prompt to every new
  // visitor before they had done anything.
  const [locating, setLocating] = useState(false);
  const useMyLocation = () => {
    if (!navigator?.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setActiveKey(nearestCityKey(coords.latitude, coords.longitude, availableKeys));
        setAutoDetected(true);
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 6000, maximumAge: 300_000 },
    );
  };

  const loc          = locations[activeKey];
  const embed        = _embeds[activeKey] ?? {};
  const ci           = embed.clinicInfo;

  const address      = ci?.address      || loc?.address      || '';
  const phone        = ci?.phone        || loc?.phone        || '';
  const hours        = ci?.hours?.length ? ci.hours : (loc?.hours ?? []);
  const doctorCount  = _doctorCountByCity[activeKey] ?? 0;

  const embedUrl     = embed.mapEmbedUrl || loc?.map || '';
  const directionsUrl = embed.googleMapsUrl ||
    (address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}` : '#');
  const heroImg      = embed.heroImageUrl || '';
  const openStatus   = getOpenStatus(hours);

  // Only location-specific figures here — clinic-wide patient count and
  // Google rating are already stated once in StatsBar right after the hero;
  // this used to restate both with different numbers than StatsBar, which
  // read as inconsistent rather than reassuring.
  const STATS = [
    { value: String(cities.length || 4), label: 'Clinics', icon: MapPin },
    ...(_doctorCount > 0 ? [{ value: String(_doctorCount), label: 'Doctors', icon: Users }] : []),
    ...(_treatmentCount > 0 ? [{ value: String(_treatmentCount), label: 'Treatments', icon: Stethoscope }] : []),
  ];

  return (
    <section id="contact" className="py-14 md:py-20 bg-canvas">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">

        {/* ── Section header ── */}
        <div className="text-center mb-10">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-bronze flex items-center justify-center gap-2 mb-3">
            <MapPin size={13} /> OUR LOCATIONS
          </p>
          <h2 className="text-3xl md:text-4xl font-headline font-medium text-primary leading-tight mb-3">
            {headline}
          </h2>
          <p className="text-gray-500 text-sm max-w-xl mx-auto leading-relaxed">{subheadline}</p>
        </div>

        {/* ── 3-column grid ── */}
        <div className="grid md:grid-cols-[280px_1fr_300px] gap-4 lg:gap-5 items-stretch min-h-[420px]">

          {/* ── LEFT: city list ── */}
          <div className="bg-white rounded-2xl border border-line overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select a location</p>
              {!autoDetected && (
                <button type="button" onClick={useMyLocation} disabled={locating} className="min-h-11 flex items-center gap-1 text-xs font-semibold text-primary underline underline-offset-2 disabled:opacity-60">
                  <LocateFixed size={12} /> {locating ? 'Locating…' : 'Near me'}
                </button>
              )}
              {autoDetected && (
                <span className="flex items-center gap-1 text-xs font-bold text-primary bg-[#e8f0fe] px-2 py-0.5 rounded-full shrink-0">
                  <LocateFixed size={9} /> Near you
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {cities.map((city: string, i: number) => {
                const key    = toCityKey(city);
                const cloc   = locations[key];
                const cembed = _embeds[key] ?? {};
                const cci    = cembed.clinicInfo;
                const chours = cci?.hours?.length ? cci.hours : (cloc?.hours ?? []);
                const status = getOpenStatus(chours);
                const cdoc    = _doctorCountByCity[key] ?? 0;
                const active = activeKey === key;

                return (
                  <button
                    key={i}
                    onClick={() => setActiveKey(key)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all group ${
                      active ? 'bg-sand border-l-[3px] border-primary' : 'hover:bg-gray-50 border-l-[3px] border-transparent'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                      <ImageWithFallback
                        src={cembed.heroImageUrl}
                        alt={city}
                        width={56}
                        height={56}
                        className="object-cover w-full h-full"
                        fallback={
                          <div className="w-full h-full bg-sand flex items-center justify-center">
                            <MapPin size={18} className="text-bronze" aria-hidden="true" />
                          </div>
                        }
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <MapPin size={11} className="text-bronze shrink-0" />
                        <span className={`font-bold text-sm truncate ${active ? 'text-primary' : 'text-gray-800'}`}>{city}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mb-1">
                        {mounted && (
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                            status.isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {status.text}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary">
                        {cdoc > 0 ? `${cdoc} ${cdoc === 1 ? 'doctor' : 'doctors'}` : 'View clinic'}
                      </p>
                    </div>

                    <ChevronRight size={14} className={`shrink-0 transition-colors ${active ? 'text-primary' : 'text-gray-300 group-hover:text-gray-500'}`} />
                  </button>
                );
              })}
            </div>
            <div className="p-4 border-t border-gray-50">
              <Link
                href={`/${activeKey}`}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-primary/20 text-primary text-xs font-bold hover:bg-primary hover:text-white transition-all"
              >
                <LayoutGrid size={13} /> View all clinics
              </Link>
            </div>
          </div>

          {/* ── MIDDLE: map iframe ── */}
          <div className="hidden md:block bg-white rounded-2xl border border-line overflow-hidden">
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
              <div className="h-full min-h-[420px] flex flex-col items-center justify-center bg-gradient-to-br from-line to-[#c5d9ef] gap-3">
                <MapPin size={32} className="text-primary/30" />
                <p className="text-primary/50 text-sm font-semibold">Map not configured</p>
                <p className="text-gray-500 text-xs">Add embed URL in Admin → Locations</p>
              </div>
            )}
          </div>

          {/* ── RIGHT: detail card ── */}
          {(loc || address) && (
            <div className="bg-white rounded-2xl border border-line overflow-hidden flex flex-col">
              {/* Hero image */}
              <div className="relative h-44 w-full shrink-0">
                <ImageWithFallback
                  src={heroImg}
                  alt={`DR Youth Clinic ${loc?.name ?? activeKey}`}
                  fill
                  className="object-cover"
                  fallback={
                    <div className={`w-full h-full bg-primary flex items-center justify-center`}>
                      <p className="text-white font-bold text-xl tracking-wide">DR Youth Clinic</p>
                    </div>
                  }
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <span className="absolute bottom-3 left-4 text-white text-xs font-bold bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full">
                  {loc?.name ?? activeKey}
                </span>
              </div>

              <div className="flex-1 flex flex-col p-5 gap-4">
                {/* Title + rating */}
                <div>
                  <h3 className="font-bold text-primary text-base leading-tight mb-1">
                    DR Youth Clinic — {loc?.name ?? activeKey}
                  </h3>
                  {embed.googleMapsUrl && (
                    <a href={embed.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-secondary hover:underline">
                      Read our reviews on Google
                    </a>
                  )}
                </div>

                {/* Info rows */}
                <div className="space-y-2.5 text-sm">
                  {address && (
                    <div className="flex gap-2.5 text-gray-600">
                      <MapPin size={14} className="text-bronze shrink-0 mt-0.5" />
                      <span className="leading-snug">{address}</span>
                    </div>
                  )}
                  {hours[0] && (
                    <div className="flex gap-2.5 text-gray-600 items-center">
                      <Clock size={14} className="text-bronze shrink-0" />
                      <span>{hours[0].hours}</span>
                      {mounted && (
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                          openStatus.isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {openStatus.text}
                        </span>
                      )}
                    </div>
                  )}
                  {doctorCount > 0 && (
                    <div className="flex gap-2.5 text-gray-600 items-center">
                      <Users size={14} className="text-bronze shrink-0" />
                      <span>{doctorCount} {doctorCount === 1 ? 'doctor' : 'doctors'} at this clinic</span>
                    </div>
                  )}
                </div>

                {/* CTAs */}
                <div className="flex flex-col gap-2 mt-auto">
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 bg-primary text-white text-xs font-bold py-2.5 rounded-xl hover:bg-primary-hover transition"
                    >
                      <Navigation size={12} /> Get Directions
                    </a>
                    <a
                      href={toTelHref(phone) || '/book'}
                      className="flex items-center justify-center gap-1.5 border border-primary text-primary text-xs font-bold py-2.5 rounded-xl hover:bg-canvas transition"
                    >
                      <Phone size={12} /> Call Now
                    </a>
                  </div>
                  <Link
                    href="/book"
                    className="flex items-center justify-center gap-2 bg-champagne text-primary text-sm font-bold py-3 rounded-xl hover:bg-[#e69910] transition"
                  >
                    <CalendarCheck size={14} /> Book Consultation
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Stats bar ── */}
        <div className="mt-5 bg-white rounded-2xl border border-line px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
            {STATS.map(({ value, label, icon: Icon }, i) => (
              <div key={i} className="flex items-center gap-3 py-2 sm:py-0 sm:px-4 first:pl-0 last:pr-0">
                <div className="w-9 h-9 rounded-xl bg-sand flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-primary" />
                </div>
                <div>
                  <p className="font-extrabold text-primary text-base leading-none">{value}</p>
                  <p className="text-xs text-text-secondary mt-0.5 leading-tight">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
