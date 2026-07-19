import Link from 'next/link';
import { ArrowRight, Stethoscope } from 'lucide-react';
import { CATEGORY_MAP, CATEGORY_META } from '@/app/lib/serviceCategories';

export interface ServicesCardsProps {
  data: any;
  location?: string;
  categoryCounts?: Record<string, number>;
}

// Category-wise cards, each linking to its real category listing page —
// replaces the previous free-text admin-authored decorative cards (which
// had no click behavior at all). Always shows all 4 real categories,
// regardless of how many services exist in each, with an honest count.
export default function ServicesCards({ data, location = 'chennai', categoryCounts = {} }: ServicesCardsProps) {
  const {
    headline = 'Clinical-Level Beauty Services',
    subheadline = 'Experience medical precision meets aesthetic artistry across our core specializations.',
    diagnosisPanel = {},
  } = data || {};

  const categorySlugs = Object.keys(CATEGORY_MAP);

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

        {/* CATEGORY CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          {categorySlugs.map((slug) => {
            const meta = CATEGORY_META[slug];
            const count = categoryCounts[slug] ?? 0;
            return (
              <Link
                key={slug}
                href={`/${location}/services/${slug}`}
                className="group relative overflow-hidden rounded-3xl min-h-[240px] md:min-h-[300px] shadow-[0_12px_35px_rgba(11,37,96,0.1)] ring-1 ring-white/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(11,37,96,0.16)] flex flex-col justify-end"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${meta.heroGrad}`} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                <span className="absolute top-4 left-4 text-3xl md:text-4xl opacity-90">{meta.icon}</span>
                <div className="relative p-4 md:p-6">
                  <span className={`inline-block ${meta.pillBg} ${meta.pillText} backdrop-blur text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-2`}>
                    {meta.tagline}
                  </span>
                  <h3 className="text-lg md:text-xl font-headline font-extrabold text-white mb-1 leading-tight">
                    {meta.label}
                  </h3>
                  <p className="text-white/70 text-xs md:text-sm mb-3">
                    {count > 0 ? `${count} treatment${count !== 1 ? 's' : ''}` : 'Ask about pricing'}
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-white text-xs md:text-sm font-bold group-hover:gap-2.5 transition-all">
                    Explore <ArrowRight size={13} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* CONSULT CARD */}
        <div className="bg-white rounded-3xl p-6 md:p-10 lg:p-12 text-center shadow-[0_12px_35px_rgba(11,37,96,0.08)] ring-1 ring-[#e8eff7] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(11,37,96,0.12)]">
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
    </section>
  );
}
