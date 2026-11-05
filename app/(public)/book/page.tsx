'use client';

import { useState } from 'react';
import { Star, Shield, Users, BadgeCheck } from 'lucide-react';
import Sidebar from './Sidebar';
import ConsultationForm from './Form';
import { useSiteConfig } from '@/app/components/SiteConfigContext';

export default function BookingPage() {
  const { consultationCta, consultationBadge, consultationSub, consultationFree, yearsExperience } = useSiteConfig();
  const [step, setStep] = useState(1);

  const TRUST = [
    { icon: Shield, label: 'Doctor-led', sub: 'Consultation first' },
    { icon: Users, label: 'Our Clinics', sub: `${yearsExperience} years of skin and hair care` },
    { icon: BadgeCheck, label: consultationBadge, sub: 'No commitment needed' },
  ];

  return (
    <div className="min-h-screen bg-canvas">

      {/* ── HERO ── */}
      <section className="bg-gradient-to-br from-primary via-[#102d6e] to-[#1a4a8a] text-white py-6 md:py-10 px-4 md:px-10 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative">
          <p className="eyebrow !text-champagne mb-2">{consultationSub}</p>
          <h1 className="text-3xl md:text-4xl font-headline font-extrabold mb-2 leading-tight">
            {consultationCta}
          </h1>
          <p className="text-white/80 text-sm max-w-md">
            Speak with one of our doctors about a personalised treatment plan{consultationFree ? ' — at no cost' : ''}.
          </p>
          {/* Trust bar */}
          <div className="hidden md:grid md:grid-cols-3 gap-3 mt-7">
            {TRUST.map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Icon size={14} className="text-champagne" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-white">{label}</p>
                  <p className="text-white/70 text-xs">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FORM AREA ── */}
      <div className="max-w-7xl mx-auto px-4 md:px-10 py-5 md:py-10">
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

    </div>
  );
}
