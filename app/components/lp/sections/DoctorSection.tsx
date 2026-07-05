'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Quote, CalendarCheck } from 'lucide-react';

interface DoctorData {
  photo?: string;
  name?: string;
  qualification?: string;
  experience?: string;
  bio?: string;
  specialties?: string[];
  achievements?: string[];
  quote?: string;
}

export default function DoctorSection({ data }: { data: DoctorData }) {
  const {
    photo,
    name = 'Dr. Expert',
    qualification = 'MBBS, MD Dermatology',
    experience = '20 Years',
    bio = 'Expert dermatologist specialising in advanced hair restoration.',
    achievements,
    quote,
  } = data;

  const bullets =
    achievements && achievements.length
      ? achievements
      : [`${experience} Experience`, 'Expert in Hair Restoration', '5000+ Successful Treatments'];

  const testimonial =
    quote || 'PRP therapy is a breakthrough in natural hair restoration — safe, effective, and completely non-surgical.';

  const shortName = name.split(' ').slice(0, 2).join(' ');

  const rightItem = {
    hidden: { opacity: 0, y: 16 },
    show: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, delay: i * 0.1, ease: 'easeOut' as const },
    }),
  };

  return (
    <section className="bg-[#0B2560] py-14 md:py-20 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 15% 50%, #F5A623 0, transparent 45%), radial-gradient(ellipse at 85% 50%, #3B82C4 0, transparent 45%)',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-5">
        <div className="grid md:grid-cols-[2fr_3fr] gap-10 md:gap-12 items-center">
          {/* Left: photo */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex flex-col items-center"
          >
            <div className="relative">
              {photo ? (
                <div className="w-56 h-64 md:w-72 md:h-80 rounded-3xl overflow-hidden border-4 border-[#F5A623]/60 shadow-2xl">
                  <img src={photo} alt={name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-56 h-64 md:w-72 md:h-80 rounded-3xl bg-gradient-to-br from-[#3B82C4] to-[#0B2560] flex items-center justify-center border-4 border-[#F5A623]/60 shadow-2xl">
                  <span className="text-8xl">👨‍⚕️</span>
                </div>
              )}
              {/* credential ribbon */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-[#F5A623] text-[#0B2560] text-xs font-extrabold px-5 py-2 rounded-full shadow-lg whitespace-nowrap">
                {experience} Experience
              </div>
            </div>
            {/* signature watermark */}
            <p className="mt-9 text-white/40 text-xl font-signature italic" style={{ fontFamily: 'cursive' }}>
              {name}
            </p>
          </motion.div>

          {/* Right: content */}
          <div>
            <motion.p
              custom={0}
              variants={rightItem}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
              className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-3"
            >
              Meet Our Expert
            </motion.p>

            <motion.h2
              custom={1}
              variants={rightItem}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
              className="text-3xl md:text-4xl font-extrabold text-white"
            >
              {name}
            </motion.h2>

            <motion.p
              custom={2}
              variants={rightItem}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
              className="text-[#F5A623] font-semibold mt-1.5 text-sm md:text-base"
            >
              {qualification}
            </motion.p>

            <motion.p
              custom={3}
              variants={rightItem}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
              className="text-white/70 mt-4 text-sm md:text-base leading-relaxed"
            >
              {bio}
            </motion.p>

            <motion.ul
              custom={4}
              variants={rightItem}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
              className="mt-5 space-y-2.5"
            >
              {bullets.map((b, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-white/90">
                  <CheckCircle size={16} className="text-[#F5A623] shrink-0" />
                  {b}
                </li>
              ))}
            </motion.ul>

            <motion.div
              custom={5}
              variants={rightItem}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
              className="mt-6 bg-[#F5A623]/15 border border-[#F5A623]/30 rounded-2xl p-5"
            >
              <Quote size={20} className="text-[#F5A623] mb-2" />
              <p className="text-white/90 italic text-sm md:text-base leading-relaxed">{testimonial}</p>
              <p className="text-[#F5A623] text-xs font-bold mt-2.5">— {name}</p>
            </motion.div>

            <motion.button
              custom={6}
              variants={rightItem}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
              onClick={() => document.getElementById('lp-form')?.scrollIntoView({ behavior: 'smooth' })}
              className="mt-6 flex items-center gap-2 bg-[#F5A623] hover:bg-[#e09516] text-[#0B2560] font-extrabold px-7 py-3.5 rounded-2xl text-sm shadow-xl shadow-[#F5A623]/20 hover:-translate-y-0.5 transition-all duration-200"
            >
              <CalendarCheck size={18} />
              Book Appointment with {shortName}
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  );
}
