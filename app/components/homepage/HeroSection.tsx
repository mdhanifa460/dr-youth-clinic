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
    <section id="home" className="relative flex min-h-[calc(100svh-96px)] md:min-h-[82vh] items-center overflow-hidden bg-gradient-to-br from-[#f6faff] to-[#e8eff7]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 w-full grid md:grid-cols-2 gap-7 md:gap-10 lg:gap-12 items-center py-10 sm:py-12 md:py-16 lg:py-20">
        {/* LEFT */}
        <div className="max-w-xl space-y-4 sm:space-y-5 md:space-y-7">
          <span className="inline-flex min-h-9 items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#60A5D8]/20 text-[#0B2560] text-xs sm:text-sm font-semibold tracking-wide">
            <BadgeCheck size={15} className="text-[#0B2560] shrink-0" />
            {badge}
          </span>

          <h1 className="text-[2.15rem] sm:text-[2.75rem] md:text-6xl font-headline font-extrabold text-[#0B2560] leading-[1.08] md:leading-tight whitespace-pre-line">
            {headline}
            {'\n'}
            <span className="text-[#F5A623]">{highlightText}</span>
          </h1>

          <p className="text-gray-700 text-base md:text-lg leading-relaxed font-semibold max-w-lg">{description}</p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-1">
            <Link
              href={ctaPrimary.href}
              className="min-h-12 w-full sm:w-auto bg-[#0B2560] text-white px-6 sm:px-8 py-3 rounded-xl font-semibold shadow-[0_10px_25px_rgba(11,37,96,0.25)] hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(11,37,96,0.28)] transition-all duration-300 flex items-center justify-center gap-2"
            >
              {ctaPrimary.text}
              <span>→</span>
            </Link>
            <Link
              href={ctaSecondary.href}
              className="min-h-12 w-full sm:w-auto bg-white border border-gray-300 text-[#0B2560] px-6 sm:px-8 py-3 rounded-xl font-semibold hover:bg-gray-50 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-300 flex items-center justify-center"
            >
              {ctaSecondary.text}
            </Link>
          </div>

          {trustBadges.length > 0 && (
            <div className="flex flex-wrap gap-3 sm:gap-4 md:gap-6 pt-1">
              {trustBadges.map((b: any, i: number) => (
                <div key={i} className="flex min-h-9 items-center gap-2 rounded-full bg-white/60 px-3 py-1.5 text-xs sm:text-sm text-gray-600 shadow-sm ring-1 ring-white/70 md:bg-transparent md:px-0 md:shadow-none md:ring-0">
                  <span className="text-lg sm:text-xl">{b.icon}</span>
                  <span className="font-medium leading-snug">{b.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="relative mt-2 md:mt-0">
          <div className="absolute -inset-4 bg-[#0B2560]/10 blur-3xl rounded-full" />
          <div className="relative bg-white p-3 sm:p-4 rounded-3xl shadow-[0_18px_50px_rgba(11,37,96,0.12)] ring-1 ring-white/80">
            {image?.url ? (
              <Image
                src={image.url}
                alt="DR Youth Clinic"
                width={500}
                height={500}
                className="rounded-2xl w-full h-[260px] sm:h-[320px] md:h-[420px] object-cover"
                priority
              />
            ) : (
              <div className="rounded-2xl w-full h-[260px] sm:h-[320px] md:h-[420px] bg-gradient-to-br from-[#0B2560]/20 to-[#60A5D8]/20 flex items-center justify-center">
                <span className="text-5xl">🏥</span>
              </div>
            )}
            <div className="absolute bottom-3 left-3 sm:-bottom-4 sm:-left-4 bg-[#3B82C4] p-4 sm:p-5 md:p-6 rounded-2xl shadow-xl max-w-[180px] sm:max-w-[200px]">
              <p className="text-2xl sm:text-3xl md:text-4xl text-white font-extrabold block mb-0.5 sm:mb-1">10k+</p>
              <p className="text-white/90 font-semibold text-xs sm:text-sm leading-snug">Successful Procedures Completed</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
