import { CheckCircle, Clock, MapPin, Phone } from 'lucide-react';

const STEPS = [
  { n: 1, label: 'Your Details', desc: 'Name, phone & concern' },
  { n: 2, label: 'Service', desc: 'Choose a treatment category' },
  { n: 3, label: 'Location', desc: 'Pick your clinic' },
  { n: 4, label: 'Schedule', desc: 'Date & time slot' },
];

const CLINICS = [
  { city: 'Chennai', phone: '+91 98765 43210' },
  { city: 'Bangalore', phone: '+91 98765 43210' },
  { city: 'Kochi', phone: '+91 98765 43210' },
  { city: 'Coimbatore', phone: '+91 98765 43210' },
];

export default function Sidebar({ step }: { step: number }) {
  return (
    <div className="space-y-5">

      {/* Step tracker — desktop only; mobile already shows progress at the top of the form card */}
      <div className="hidden lg:block bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-5">Your Progress</p>
        <div className="space-y-1">
          {STEPS.map((s, i) => {
            const done = step > s.n;
            const active = step === s.n;
            return (
              <div key={s.n} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                    done ? 'bg-green-500 text-white' : active ? 'bg-[#0B2560] text-white ring-4 ring-[#0B2560]/10' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {done ? <CheckCircle size={14} /> : s.n}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`w-0.5 h-8 mt-1 ${done ? 'bg-green-200' : 'bg-gray-100'}`} />
                  )}
                </div>
                <div className="pb-6">
                  <p className={`font-semibold text-sm leading-tight ${active ? 'text-[#0B2560]' : done ? 'text-green-600' : 'text-gray-400'}`}>{s.label}</p>
                  <p className={`text-xs mt-0.5 ${active ? 'text-gray-500' : 'text-gray-300'}`}>{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Why choose us */}
      <div className="bg-gradient-to-br from-[#0B2560] to-[#1e3a8a] rounded-3xl p-6 text-white">
        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-4">Why DR Youth?</p>
        <ul className="space-y-3">
          {[
            'Free initial consultation — zero commitment',
            'Expert dermatologists with 10+ years experience',
            'FDA-approved treatments & technology',
            'Personalised plan before any procedure',
            'WhatsApp confirmation within minutes',
          ].map((point) => (
            <li key={point} className="flex items-start gap-2.5 text-xs text-white/70">
              <CheckCircle size={13} className="text-[#F5A623] mt-0.5 shrink-0" />
              {point}
            </li>
          ))}
        </ul>
      </div>

      {/* Clinic hours */}
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Clinic Hours</p>
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <Clock size={13} className="text-[#3B82C4]" />
          <span>Mon – Sat: 9:00 AM – 7:00 PM</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Clock size={13} className="text-gray-300" />
          <span>Sunday: By Appointment</span>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-50 space-y-2">
          {CLINICS.map((c) => (
            <div key={c.city} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-gray-500">
                <MapPin size={10} className="text-[#3B82C4]" /> {c.city}
              </div>
              <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-[#0B2560] font-semibold hover:text-[#3B82C4] transition">
                <Phone size={10} /> {c.phone}
              </a>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
