import type { Metadata } from 'next';
import Link from 'next/link';
import { getSiteConfig } from '@/app/lib/siteConfig';

export const metadata: Metadata = {
  title: 'About Us | DR Youth Clinic',
  description:
    'Learn about DR Youth Clinic — South India\'s most trusted aesthetic medicine practice with 15+ years of experience, 50,000+ patients treated across Chennai, Bangalore, Kochi and Coimbatore.',
};

const STATS = [
  { value: '15+', label: 'Years Experience' },
  { value: '50,000+', label: 'Patients Treated' },
  { value: '4.9★', label: 'Average Rating' },
  { value: '4', label: 'Cities' },
];

const DIFFERENTIATORS = [
  { icon: '🩺', title: 'Board-Certified Doctors', desc: 'Every procedure is performed or supervised by a certified dermatologist or aesthetic surgeon — never a technician.' },
  { icon: '⚙️', title: 'Advanced Equipment', desc: 'We invest in the latest FDA-cleared technology so you receive the most effective, safest treatments available today.' },
  { icon: '📍', title: 'Multi-Location Convenience', desc: 'Four flagship clinics across Chennai, Bangalore, Kochi and Coimbatore — all delivering the same premium standard.' },
  { icon: '🚫', title: 'No Commission-Based Sales', desc: 'Our doctors are salaried, not incentivised by treatment sales. You get what you need — nothing more, nothing less.' },
  { icon: '💬', title: '100% Pricing Transparency', desc: 'Complete pricing is shared before any treatment begins. No hidden costs, no post-consultation surprises.' },
  { icon: '🤝', title: 'Dedicated Post-Treatment Care', desc: 'Recovery plans, follow-up reviews and 24/7 WhatsApp support — because great results need great aftercare.' },
];

const DOCTORS = [
  {
    name: 'Dr. Anitha Krishnan',
    title: 'Senior Dermatologist',
    experience: '12 Years Experience',
    speciality: 'Skin Disorders · Acne · Pigmentation',
    initials: 'AK',
  },
  {
    name: 'Dr. Rahul Mehta',
    title: 'Aesthetic Surgeon',
    experience: '10 Years Experience',
    speciality: 'Thread Lifts · Fillers · Body Contouring',
    initials: 'RM',
  },
  {
    name: 'Dr. Priya Sundaram',
    title: 'Trichologist',
    experience: '8 Years Experience',
    speciality: 'Hair Loss · PRP · GFC Therapy',
    initials: 'PS',
  },
];

const AWARDS = [
  { icon: '🏅', label: 'ISO Certified', sub: 'Quality Management System' },
  { icon: '🏥', label: 'NABH Compliant', sub: 'National Accreditation Board' },
  { icon: '👨‍⚕️', label: 'IADVL Member', sub: 'Indian Assoc. of Dermatologists' },
];

export default async function AboutPage() {
  const { consultationCta } = await getSiteConfig();
  return (
    <main>
      {/* ── HERO ── */}
      <section className="relative bg-[#0B2560] overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[36rem] h-[36rem] rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 rounded-full bg-[#F5A623]/10 pointer-events-none" />
        <div className="absolute top-1/2 left-0 w-56 h-56 rounded-full bg-white/[0.03] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-0.5 bg-[#F5A623]" />
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623]">Our Story</p>
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-headline font-extrabold text-white leading-tight mb-4">
            About <span className="text-[#F5A623]">DR Youth</span> Clinic
          </h1>
          <p className="text-white/70 text-base md:text-xl font-medium mb-6">
            South India&apos;s Most Trusted Aesthetic Medicine Practice
          </p>
          <p className="text-white/55 max-w-2xl text-sm md:text-base leading-relaxed">
            Founded over 15 years ago with a single clinic in Chennai, DR Youth Clinic was built on one principle: that every patient deserves honest, evidence-based care — free from the pressure of upselling. Today, our team of board-certified dermatologists and aesthetic surgeons serves 50,000+ patients across four cities, combining clinical precision with a deeply personal approach to skin, hair and body wellness.
          </p>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl md:text-4xl font-headline font-extrabold text-[#0B2560]">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── MISSION ── */}
      <section className="bg-[#f6faff] py-14 md:py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-[#0B2560] rounded-3xl p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#F5A623]/10 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-4 relative">Our Mission</p>
            <blockquote className="text-white text-xl md:text-2xl font-headline font-bold leading-snug relative">
              &ldquo;Our commitment: evidence-based treatments, no unnecessary procedures, real results.&rdquo;
            </blockquote>
            <p className="text-white/50 mt-4 text-sm leading-relaxed relative max-w-xl">
              We measure success not by the number of treatments we sell, but by how confident and satisfied our patients feel — at every visit and long after.
            </p>
          </div>
        </div>
      </section>

      {/* ── WHY DR YOUTH ── */}
      <section className="bg-white py-14 md:py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-2">The Difference</p>
            <h2 className="text-2xl md:text-4xl font-headline font-extrabold text-[#0B2560]">Why Choose DR Youth?</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {DIFFERENTIATORS.map((d) => (
              <div
                key={d.title}
                className="bg-[#f6faff] rounded-3xl p-7 ring-1 ring-[#e8eff7] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
              >
                <span className="text-3xl mb-4 block">{d.icon}</span>
                <h3 className="font-headline font-bold text-[#0B2560] text-base mb-2">{d.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LEADERSHIP ── */}
      <section className="bg-[#f6faff] py-14 md:py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-2">Our Team</p>
            <h2 className="text-2xl md:text-4xl font-headline font-extrabold text-[#0B2560]">Meet the Doctors</h2>
            <p className="text-gray-500 mt-3 text-sm max-w-lg mx-auto">
              Every treatment at DR Youth Clinic is led by an experienced, board-certified specialist.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {DOCTORS.map((doc) => (
              <div
                key={doc.name}
                className="bg-white rounded-3xl p-8 ring-1 ring-[#e8eff7] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center"
              >
                {/* Avatar placeholder */}
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#0B2560] to-[#3B82C4] flex items-center justify-center mb-4 shadow-lg">
                  <span className="text-white font-headline font-extrabold text-xl tracking-wider">{doc.initials}</span>
                </div>
                <h3 className="font-headline font-bold text-[#0B2560] text-base">{doc.name}</h3>
                <p className="text-[#F5A623] text-xs font-bold uppercase tracking-wider mt-1">{doc.title}</p>
                <p className="text-gray-400 text-xs mt-1">{doc.experience}</p>
                <div className="mt-4 pt-4 border-t border-gray-100 w-full">
                  <p className="text-gray-500 text-xs leading-relaxed">{doc.speciality}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              href="/doctors"
              className="inline-flex items-center gap-2 text-sm font-bold text-[#0B2560] hover:text-[#3B82C4] transition"
            >
              View All Doctors →
            </Link>
          </div>
        </div>
      </section>

      {/* ── AWARDS ── */}
      <section className="bg-white py-12 border-t border-gray-100">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-2">Recognised For Excellence</p>
            <h2 className="text-xl md:text-2xl font-headline font-extrabold text-[#0B2560]">Awards &amp; Accreditations</h2>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {AWARDS.map((a) => (
              <div
                key={a.label}
                className="flex-1 bg-[#f6faff] rounded-2xl p-6 ring-1 ring-[#e8eff7] flex flex-col items-center text-center"
              >
                <span className="text-4xl mb-3">{a.icon}</span>
                <p className="font-headline font-bold text-[#0B2560] text-sm">{a.label}</p>
                <p className="text-gray-400 text-xs mt-1">{a.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-[#0B2560] py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-3">Ready to Begin?</p>
          <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-white mb-3">
            {consultationCta}
          </h2>
          <p className="text-white/60 text-sm mb-8 max-w-md mx-auto">
            Speak with one of our specialists — no commitment, no pressure. Just honest advice tailored to you.
          </p>
          <Link
            href="/book"
            className="inline-flex items-center gap-2 bg-[#F5A623] text-[#0B2560] px-8 py-3.5 rounded-2xl font-extrabold text-sm hover:-translate-y-0.5 transition shadow-lg"
          >
            {consultationCta} →
          </Link>
        </div>
      </section>
    </main>
  );
}
