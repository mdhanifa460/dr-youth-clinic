'use client';
import { CheckCircle, MapPin, Phone } from 'lucide-react';
import { locations } from '@/app/data/locations';
import { toTelHref } from '@/app/lib/phone';
import { useSiteConfig } from '@/app/components/SiteConfigContext';

const STEPS = [
  { n: 1, label: 'Treatment & Clinic', desc: 'What you need, and where' },
  { n: 2, label: 'Date & Time', desc: 'Your preferred slot' },
  { n: 3, label: 'Your Details', desc: 'So we can confirm with you' },
];


export default function Sidebar({ step }: { step: number }) {
  const { publicPhone, yearsExperience } = useSiteConfig();
  return (
    <div className="space-y-5">

      {/* Step tracker — desktop only; mobile already shows progress at the top of the form card */}
      <div className="hidden lg:block bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-5">Your Progress</p>
        <div className="space-y-1">
          {STEPS.map((s, i) => {
            const done = step > s.n;
            const active = step === s.n;
            return (
              <div key={s.n} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                    done ? 'bg-green-500 text-white' : active ? 'bg-primary text-white ring-4 ring-primary/10' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {done ? <CheckCircle size={14} /> : s.n}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`w-0.5 h-8 mt-1 ${done ? 'bg-green-200' : 'bg-gray-100'}`} />
                  )}
                </div>
                <div className="pb-6">
                  <p className={`font-semibold text-sm leading-tight ${active ? 'text-primary' : done ? 'text-green-600' : 'text-gray-500'}`}>{s.label}</p>
                  <p className={`text-xs mt-0.5 ${active ? 'text-gray-500' : 'text-gray-600'}`}>{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Why choose us */}
      <div className="bg-gradient-to-br from-primary to-[#1e3a8a] rounded-3xl p-6 text-white">
        <p className="text-xs font-semibold text-white/70 uppercase tracking-widest mb-4">Why DR Youth?</p>
        <ul className="space-y-3">
          {[
            'Free initial consultation — zero commitment',
            `Clinic experience of ${yearsExperience} years in skin and hair care`,
            'Doctor consultation before any procedure',
            'A personalised plan, with no obligation',
            'Our team contacts you to confirm the time',
          ].map((point) => (
            <li key={point} className="flex items-start gap-2.5 text-sm text-white/85">
              <CheckCircle size={13} className="text-champagne mt-0.5 shrink-0" />
              {point}
            </li>
          ))}
        </ul>
      </div>

      {/* Clinic hours */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">Clinic Hours</p>
        <ul className="space-y-2">
          {Object.values(locations).map((l) => (
            <li key={l.name} className="flex items-start justify-between gap-3 text-sm">
              <span className="flex items-center gap-1.5 text-primary"><MapPin size={12} className="text-bronze" aria-hidden="true" /> {l.name}</span>
              <span className="text-right text-text-secondary">{l.hours[0]?.hours}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-text-secondary">Monday to Saturday. Please check with the clinic for Sundays.</p>
        {publicPhone && (
          <a href={toTelHref(publicPhone)} className="mt-4 flex min-h-11 items-center gap-2 border-t border-line pt-4 text-sm font-semibold text-primary">
            <Phone size={14} aria-hidden="true" /> {publicPhone}
          </a>
        )}
      </div>

    </div>
  );
}
