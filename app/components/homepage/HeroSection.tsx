import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck } from 'lucide-react';

export default function HeroSection({ data }: { data: any }) {
  const {
    badge = 'ADVANCED AESTHETIC CLINIC',
    headline = 'Advanced Skin &\nAesthetic Care',
    highlightText = 'You Can Trust',
    description = 'Personalised treatments, advanced technology & real results.',
    ctaPrimary = { text: 'Book Consultation', href: '/book' },
    ctaSecondary = { text: 'Our Services', href: '#services' },
    image = { url: '/images/hero-clinical.jpeg' },
    trustBadges = [],
  } = data || {};

  return (
    <section id="home" className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-br from-[#f6faff] to-[#e8eff7]">
      <div className="max-w-7xl mx-auto px-6 md:px-10 w-full grid md:grid-cols-2 gap-12 items-center py-20">
        {/* LEFT */}
        <div className="max-w-xl space-y-7">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#60A5D8]/20 text-[#0B2560] text-sm font-semibold tracking-wide">
            <BadgeCheck size={16} className="text-[#0B2560]" />
            {badge}
          </span>

          <h1 className="text-5xl md:text-6xl font-headline font-extrabold text-[#0B2560] leading-tight whitespace-pre-line">
            {headline}
            {'\n'}
            <span className="text-[#F5A623]">{highlightText}</span>
          </h1>

          <p className="text-gray-700 text-lg leading-relaxed font-semibold">{description}</p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link href={ctaPrimary.href}>
              <button className="bg-[#0B2560] text-white px-8 py-4 rounded-xl font-semibold shadow-[0_10px_25px_rgba(11,37,96,0.25)] hover:-translate-y-0.5 hover:shadow-lg transition flex items-center gap-2">
                {ctaPrimary.text}
                <span>→</span>
              </button>
            </Link>
            <Link href={ctaSecondary.href}>
              <button className="bg-white border border-gray-300 text-[#0B2560] px-8 py-4 rounded-xl font-semibold hover:bg-gray-50 transition">
                {ctaSecondary.text}
              </button>
            </Link>
          </div>

          {trustBadges.length > 0 && (
            <div className="flex flex-wrap gap-6 pt-2">
              {trustBadges.map((b: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-xl">{b.icon}</span>
                  <span className="font-medium">{b.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="relative mt-10 md:mt-0">
          <div className="absolute -inset-4 bg-[#0B2560]/10 blur-3xl rounded-full" />
          <div className="relative bg-white p-4 rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.1)]">
            {image?.url ? (
              <Image
                src={image.url}
                alt="DR Youth Clinic"
                width={500}
                height={500}
                className="rounded-[28px] w-full h-[420px] object-cover"
                priority
              />
            ) : (
              <div className="rounded-[28px] w-full h-[420px] bg-gradient-to-br from-[#0B2560]/20 to-[#60A5D8]/20 flex items-center justify-center">
                <span className="text-5xl">🏥</span>
              </div>
            )}
            <div className="absolute -bottom-4 -left-4 bg-[#3B82C4] p-6 rounded-2xl shadow-xl max-w-[200px]">
              <p className="text-4xl text-white font-extrabold block mb-1">10k+</p>
              <p className="text-white/90 font-semibold text-sm">Successful Procedures Completed</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
