import Link from 'next/link';
import { MapPin, Phone, Clock, Navigation } from 'lucide-react';

export interface CityClinicData {
  address?: string;
  phone?: string;
  hours?: { day: string; hours: string }[];
  googleMapsUrl?: string;
}

// City-specific block on a service page. The four city versions of one
// treatment share ~90% of their text, so Google folds them together as
// near-duplicates ("Discovered – currently not indexed"). This section only
// uses real, branch-specific data (address, phone, hours, that branch's
// doctors) and renders nothing for fields an admin hasn't filled in — it
// never invents claims.
export default function CityClinicSection({
  serviceName,
  cityName,
  clinic,
  doctorNames,
  bookHref,
  localIntro = '',
  localFaq = [],
}: {
  serviceName: string;
  cityName: string;
  clinic: CityClinicData | null;
  doctorNames: string[];
  bookHref: string;
  localIntro?: string;
  localFaq?: { question: string; answer: string }[];
}) {
  const address = clinic?.address?.trim();
  const phone = clinic?.phone?.trim();
  const hours = (clinic?.hours ?? []).filter((h) => h.day && h.hours);
  if (!localIntro && !address && !phone && hours.length === 0 && doctorNames.length === 0) return null;

  const mapsHref =
    clinic?.googleMapsUrl?.trim() ||
    (address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`DR Youth Clinic ${address}`)}` : '');

  return (
    <section className="bg-white py-14 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-6 md:px-10 grid lg:grid-cols-[1.2fr_1fr] gap-10 items-start">
        <div>
          <h2 className="text-2xl font-headline font-bold text-[#0B2560]">
            {serviceName} at our {cityName} clinic
          </h2>
          {localIntro && <p className="text-gray-700 mt-3 leading-relaxed whitespace-pre-line">{localIntro}</p>}
          <p className="text-gray-600 mt-3 leading-relaxed">
            {doctorNames.length > 0
              ? `${serviceName} in ${cityName} is offered at our ${cityName} clinic, where you can consult ${doctorNames.slice(0, 3).join(', ')}${doctorNames.length > 3 ? ' and team' : ''} in person.`
              : `${serviceName} in ${cityName} is offered at our ${cityName} clinic.`}
            {address ? ` You'll find us at ${address}.` : ''} Book a consultation to check whether this treatment suits your skin or hair before you decide.
          </p>
          {localFaq.length > 0 && (
            <div className="mt-6 space-y-3">
              {localFaq.map((f, i) => (
                <details key={i} className="rounded-xl border border-gray-100 bg-white p-4">
                  <summary className="cursor-pointer font-semibold text-[#0B2560] text-sm">{f.question}</summary>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">{f.answer}</p>
                </details>
              ))}
            </div>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={bookHref} className="inline-flex items-center rounded-xl bg-[#0B2560] px-5 py-3 text-sm font-bold text-white">
              Book at {cityName}
            </Link>
            {mapsHref && (
              <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-[#0B2560]/20 px-5 py-3 text-sm font-bold text-[#0B2560]">
                <Navigation size={14} /> Get directions
              </a>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-[#f6faff] p-6 space-y-4 text-sm text-gray-700">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">{cityName} clinic</p>
          {address && (
            <p className="flex gap-2.5"><MapPin size={16} className="text-[#A25607] shrink-0 mt-0.5" />{address}</p>
          )}
          {phone && (
            <p className="flex gap-2.5">
              <Phone size={16} className="text-[#A25607] shrink-0 mt-0.5" />
              <a href={`tel:${phone.replace(/\s/g, '')}`} className="hover:underline">{phone}</a>
            </p>
          )}
          {hours.length > 0 && (
            <div className="flex gap-2.5">
              <Clock size={16} className="text-[#A25607] shrink-0 mt-0.5" />
              <ul className="space-y-1">
                {hours.map((h) => (<li key={h.day}><span className="font-semibold">{h.day}:</span> {h.hours}</li>))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
