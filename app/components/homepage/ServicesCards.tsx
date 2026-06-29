import Image from 'next/image';
import Link from 'next/link';
import { Stethoscope } from 'lucide-react';
import { normalizeLegacyImageUrl } from '@/app/lib/legacyImageUrls';

const SMALL_DEFAULTS = [
  { tag: 'TRICHOLOGY', title: 'Hair Restoration', description: 'PRP therapy and advanced treatments to restore hair density and scalp health.' },
  { tag: 'PRECISION', title: 'Laser Technology', description: 'Safe and effective laser solutions for hair removal and pigmentation correction.' },
];

const FALLBACK_IMAGES = [
  '/images/hero-clinical.jpeg',
  '/images/hero-bg.png',
  '/images/hero-clinical.jpeg',
];

function getImageSrc(src: unknown, fallback: string) {
  if (typeof src !== 'string') return fallback;

  const normalized = normalizeLegacyImageUrl(src.trim());
  if (!normalized) return fallback;

  return normalized.startsWith('/') || normalized.startsWith('http://') || normalized.startsWith('https://')
    ? normalized
    : fallback;
}

export default function ServicesCards({ data, location = 'chennai' }: { data: any; location?: string }) {
  const {
    headline = 'Clinical-Level Beauty Services',
    subheadline = 'Experience medical precision meets aesthetic artistry across our core specializations.',
    cards = [],
    diagnosisPanel = {},
  } = data || {};

  const card1 = cards[0] || {};
  const smallCards = SMALL_DEFAULTS.map((def, i) => ({ ...def, ...(cards[i + 1] || {}) }));

  return (
    <section id="services" className="py-12 md:py-16 lg:py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between md:items-end mb-8 md:mb-12 gap-5 md:gap-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-headline font-extrabold text-primary mb-4 md:mb-5 leading-tight">
              {headline}
            </h2>
            <p className="text-gray-700 text-base md:text-lg leading-relaxed font-semibold">
              {subheadline}
            </p>
          </div>
          <Link
            href={`/${location}/services`}
            className="min-h-11 text-secondary font-semibold flex items-center gap-2 hover:gap-3 transition-all shrink-0 whitespace-nowrap"
          >
            Explore All Services →
          </Link>
        </div>

        {/* GRID — Row 1: [big 2/3] [card2 1/3] | Row 2: [card3 1/3] [consult 2/3] */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8">

          {/* BIG CARD */}
          <div className="md:col-span-2 group relative overflow-hidden rounded-3xl min-h-[330px] md:min-h-[400px] shadow-[0_12px_35px_rgba(11,37,96,0.1)] ring-1 ring-white/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(11,37,96,0.16)]">
            <Image
              src={getImageSrc(card1.image?.url, FALLBACK_IMAGES[0])}
              alt={card1.title || 'Skin Care'}
              fill
              sizes="(max-width: 768px) 100vw, 66vw"
              className="object-cover md:group-hover:scale-105 transition duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/30 to-transparent p-6 md:p-8 lg:p-10 flex flex-col justify-end">
              <span className="bg-white/20 backdrop-blur text-white px-4 py-1 rounded-full text-xs font-semibold mb-3 w-fit">
                {(card1.tag || 'DERMATOLOGY').toUpperCase()}
              </span>
              <h3 className="text-2xl md:text-3xl font-headline font-extrabold text-white mb-2 leading-tight">
                {card1.title || 'Advanced Skin Care'}
              </h3>
              <p className="text-white/85 max-w-md text-sm md:text-base leading-relaxed">
                {card1.description || 'Targeted solutions for acne, anti-aging, and complex dermatological conditions.'}
              </p>
            </div>
          </div>

          {/* SMALL CARDS */}
          {smallCards.map((card, i) => (
            <div key={i} className="group relative overflow-hidden rounded-3xl min-h-[320px] md:min-h-[400px] shadow-[0_12px_35px_rgba(11,37,96,0.1)] ring-1 ring-white/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(11,37,96,0.16)]">
              <Image
                src={getImageSrc((card as any).image?.url, FALLBACK_IMAGES[i + 1] || FALLBACK_IMAGES[0])}
                alt={card.title}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover md:group-hover:scale-105 transition duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/30 to-transparent p-6 md:p-8 flex flex-col justify-end">
                <span className="bg-white/20 backdrop-blur text-white px-3 py-1 rounded-full text-xs font-semibold mb-3 w-fit">
                  {(card.tag || '').toUpperCase()}
                </span>
                <h3 className="text-xl md:text-2xl font-headline font-extrabold text-white mb-2 leading-tight">
                  {card.title}
                </h3>
                <p className="text-white/85 text-sm leading-relaxed">
                  {card.description}
                </p>
              </div>
            </div>
          ))}

          {/* CONSULT CARD */}
          <div className="md:col-span-2 bg-white rounded-3xl p-6 md:p-10 lg:p-12 text-center shadow-[0_12px_35px_rgba(11,37,96,0.08)] ring-1 ring-[#e8eff7] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(11,37,96,0.12)]">
            <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-5 md:mb-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <Stethoscope className="text-white" size={28} />
            </div>
            <h3 className="text-2xl md:text-3xl font-headline font-extrabold text-primary mb-3 md:mb-4 leading-tight">
              {diagnosisPanel?.title || 'Need a personalized diagnosis?'}
            </h3>
            <p className="text-gray-600 max-w-md mx-auto mb-5 md:mb-6 text-sm md:text-base leading-relaxed">
              {diagnosisPanel?.description || 'Our expert dermatologists are ready to analyze your unique needs and create a custom treatment path.'}
            </p>
            <Link
              href={diagnosisPanel?.ctaHref || '/book'}
              className="min-h-12 inline-flex items-center justify-center bg-primary text-white px-7 md:px-8 py-3 rounded-xl font-semibold hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(11,37,96,0.22)] transition-all duration-300"
            >
              {diagnosisPanel?.ctaText || 'Schedule Consultation'}
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}
