'use client';

import { motion } from 'framer-motion';
import { MapPin, Building2 } from 'lucide-react';

interface LocationData {
  headline?: string;
  subtitle?: string;
  city?: string;
  branches?: string[];
  image?: string;
}

const DEFAULT_BRANCHES = ['Anna Nagar', 'T. Nagar', 'OMR', 'Velachery'];

export default function LocationSection({ data }: { data: LocationData }) {
  const {
    city = 'Chennai',
    headline = `Trusted by Patients Across ${data.city || 'Chennai'}`,
    subtitle = 'Visit our state-of-the-art clinics near you.',
    branches = [],
    image,
  } = data;

  const list = branches.length ? branches : DEFAULT_BRANCHES;

  return (
    <section className="bg-white py-14 md:py-20">
      <div className="max-w-6xl mx-auto px-5">
        <div className="grid md:grid-cols-2 gap-10 md:gap-12 items-center">
          {/* Left: text + branches */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#3B82C4] mb-3">Our Locations</p>
            <h2 className="text-2xl md:text-4xl font-extrabold text-[#0B2560]">{headline}</h2>
            <p className="text-gray-500 mt-3 text-sm md:text-base">{subtitle}</p>

            <div className="grid grid-cols-2 gap-3 mt-7">
              {list.map((branch, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-[#f6faff] border border-gray-100 rounded-2xl px-4 py-3.5 hover:border-[#F5A623] transition-colors"
                >
                  <span className="w-9 h-9 rounded-full bg-[#0B2560] flex items-center justify-center shrink-0">
                    <MapPin size={16} className="text-[#F5A623]" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-[#0B2560] text-sm truncate">{branch}</p>
                    <p className="text-[11px] text-gray-400">{city}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: clinic image */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            {image ? (
              <div className="rounded-3xl overflow-hidden shadow-2xl aspect-[4/3]">
                <img src={image} alt={`${city} clinic`} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="rounded-3xl aspect-[4/3] bg-gradient-to-br from-[#0B2560] via-[#1a3a7a] to-[#3B82C4] flex flex-col items-center justify-center shadow-2xl">
                <Building2 size={56} className="text-[#F5A623] mb-3" />
                <p className="text-white font-bold text-lg">{city} Clinics</p>
                <p className="text-white/60 text-sm mt-1">{list.length} branches near you</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
