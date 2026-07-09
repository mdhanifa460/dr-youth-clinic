'use client';

import { useState } from 'react';
import { Star, Shield, Users, BadgeCheck } from 'lucide-react';
import Sidebar from './Sidebar';
import ConsultationForm from './Form';
import { useSiteConfig } from '@/app/components/SiteConfigContext';

export default function BookingPage() {
  const { consultationCta, consultationBadge, consultationSub, ratingValue, patientsCount, yearsExperience } = useSiteConfig();
  const [step, setStep] = useState(1);

  const TRUST = [
    { icon: Star, label: `${ratingValue}★ Rating`, sub: `${patientsCount} happy patients` },
    { icon: Shield, label: 'FDA Approved', sub: 'Technology & protocols' },
    { icon: Users, label: 'Expert Doctors', sub: `${yearsExperience} years experience` },
    { icon: BadgeCheck, label: consultationBadge, sub: 'No commitment needed' },
  ];

  return (
    <main className="min-h-screen bg-[#f6faff]">

      {/* ── HERO ── */}
      <section className="bg-gradient-to-br from-[#0B2560] via-[#102d6e] to-[#1a4a8a] text-white py-10 px-6 md:px-10 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-white/[0.03]" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-[#F5A623]/[0.05] -translate-x-1/3" />
        </div>
        <div className="max-w-7xl mx-auto relative">
          <p className="text-[#F5A623] text-xs font-bold uppercase tracking-widest mb-2">{consultationSub}</p>
          <h1 className="text-3xl md:text-4xl font-headline font-extrabold mb-2 leading-tight">
            {consultationCta}
          </h1>
          <p className="text-white/60 text-sm max-w-md">
            Speak with an expert dermatologist and get a personalised treatment plan — at no cost.
          </p>
          {/* Trust bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-7">
            {TRUST.map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Icon size={14} className="text-[#F5A623]" />
                </div>
                <div>
                  <p className="font-bold text-xs">{label}</p>
                  <p className="text-white/40 text-[10px]">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FORM AREA ── */}
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Sidebar */}
          <aside className="lg:col-span-4 order-2 lg:order-1">
            <Sidebar step={step} />
          </aside>

          {/* Form */}
          <section className="lg:col-span-8 order-1 lg:order-2 bg-white rounded-3xl shadow-xl overflow-hidden">
            <ConsultationForm step={step} setStep={setStep} />
          </section>

        </div>
      </div>

    </main>
  );
}
