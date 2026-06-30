'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Award, Calendar, ChevronRight } from 'lucide-react';

const LOCATION_LABELS: Record<string, string> = {
  all: 'All Clinics', chennai: 'Chennai', bangalore: 'Bangalore',
  coimbatore: 'Coimbatore', kochi: 'Kochi',
};

const FILTER_TABS = [
  { value: '', label: 'All Specialists' },
  { value: 'chennai', label: 'Chennai' },
  { value: 'bangalore', label: 'Bangalore' },
  { value: 'coimbatore', label: 'Coimbatore' },
  { value: 'kochi', label: 'Kochi' },
];

function DoctorCard({ doc }: { doc: any }) {
  const expLabel = doc.experience > 0 ? `${doc.experience}+ yrs exp.` : null;
  const locationLabel = LOCATION_LABELS[doc.location] || doc.location;

  return (
    <div className="group bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300">

      {/* Photo */}
      <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-[#e8eff7] to-[#c5d9ef]">
        {doc.photo?.url ? (
          <Image
            src={doc.photo.url}
            alt={doc.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-7xl opacity-40">👨‍⚕️</div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0B2560]/80 to-transparent" />
        {/* Location badge pinned to photo */}
        <span className="absolute bottom-3 left-3 flex items-center gap-1 text-[10px] font-bold text-white uppercase tracking-wider bg-white/15 backdrop-blur-sm px-2.5 py-1 rounded-full">
          <MapPin size={8} /> {locationLabel}
        </span>
      </div>

      {/* Card body */}
      <div className="p-5 space-y-3">
        <div>
          <h3 className="text-base font-extrabold text-[#0B2560] leading-snug">{doc.name}</h3>
          <p className="text-sm text-[#3B82C4] font-medium mt-0.5 line-clamp-1">{doc.title}</p>
        </div>

        {/* Badges */}
        {expLabel && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Award size={11} className="text-[#F5A623] shrink-0" />
            {expLabel}
          </div>
        )}

        {/* Bio */}
        {doc.bio && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{doc.bio}</p>
        )}

        {/* Specializations */}
        {doc.specializations?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {doc.specializations.slice(0, 3).map((s: string, i: number) => (
              <span key={i} className="text-[10px] bg-[#f6faff] border border-blue-50 text-[#0B2560] px-2 py-0.5 rounded-full font-medium">
                {s}
              </span>
            ))}
          </div>
        )}

        {/* CTAs */}
        <div className="flex gap-2 pt-1">
          <Link
            href={`/doctors/${doc._id}`}
            className="flex-1 flex items-center justify-center gap-1.5 bg-[#0B2560] hover:bg-[#0d2d73] text-white text-xs font-bold py-2.5 rounded-xl transition"
          >
            View Profile <ChevronRight size={12} />
          </Link>
          <Link
            href="/book"
            className="flex items-center justify-center gap-1 border-2 border-gray-100 text-[#0B2560] hover:border-[#0B2560] px-3 rounded-xl transition text-xs font-semibold shrink-0"
          >
            <Calendar size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function DoctorsGrid({ doctors }: { doctors: any[] }) {
  const [activeFilter, setActiveFilter] = useState('');

  const filtered = activeFilter
    ? doctors.filter((d) => d.location === activeFilter || d.location === 'all')
    : doctors;

  const availableLocations = Array.from(new Set(
    doctors.flatMap((d) => d.location === 'all' ? [] as string[] : [d.location as string])
  ));

  const visibleTabs = FILTER_TABS.filter(
    (t) => t.value === '' || availableLocations.includes(t.value)
  );

  return (
    <div>
      {/* Filter bar */}
      {visibleTabs.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {visibleTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveFilter(tab.value)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                activeFilter === tab.value
                  ? 'bg-[#0B2560] text-white shadow-lg shadow-[#0B2560]/20'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-[#0B2560] hover:text-[#0B2560]'
              }`}
            >
              {tab.label}
              {tab.value === '' && (
                <span className="ml-1.5 text-[10px] opacity-60">({doctors.length})</span>
              )}
            </button>
          ))}
          <p className="ml-auto self-center text-xs text-gray-400 hidden sm:block">
            Showing <span className="font-bold text-[#0B2560]">{filtered.length}</span> specialist{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((doc) => (
          <DoctorCard key={String(doc._id)} doc={doc} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-gray-500 font-semibold">No specialists at this location yet.</p>
          <button onClick={() => setActiveFilter('')} className="mt-3 text-sm text-[#3B82C4] font-semibold hover:underline">
            View all locations
          </button>
        </div>
      )}
    </div>
  );
}
