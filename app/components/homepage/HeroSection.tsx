'use client';
import { useState } from 'react';
import { MapPin, Stethoscope, CalendarCheck } from 'lucide-react';
import FocalImage from '@/app/components/media/FocalImage';
import { ButtonLink } from '@/app/components/ui/Button';

type Slide = {
  badge: string;
  headline: string;
  highlightText: string;
  description: string;
  ctaPrimary: { text: string; href: string };
  ctaSecondary: { text: string; href: string };
  image: { url: string };
};

const HERO_DESCRIPTION = 'Skin, hair and aesthetic treatment plans, made with our doctors after a consultation.';
const DEFAULT_BADGE = 'Skin, hair & aesthetic care';

function toSlide(s: any): Slide {
  return {
    badge: s?.badge || DEFAULT_BADGE,
    headline: s?.headline || 'Advanced Skin &\nAesthetic Care',
    highlightText: s?.highlightText || '',
    description: s?.description?.trim() || HERO_DESCRIPTION,
    ctaPrimary: s?.ctaPrimary || { text: 'Book Consultation', href: '/book' },
    ctaSecondary: s?.ctaSecondary || { text: 'Our Services', href: '#services' },
    image: s?.image?.url ? s.image : { url: '/images/hero-clinical.jpeg' },
  };
}

// Admin can still save several slides, and visitors can move between them, but
// nothing rotates by itself: auto-rotation moved content with no pause control,
// and delayed the largest paint on phones.
export default function HeroSection({ data }: { data: any }) {
  const slides: Slide[] = data?.slides?.length > 0 ? data.slides.map(toSlide) : [toSlide(data)];
  const [current, setCurrent] = useState(0);
  const s = slides[current] ?? slides[0];

  const facts = [
    { icon: MapPin, text: data?._cityLine },
    { icon: Stethoscope, text: data?._doctorCount > 0 ? `${data._doctorCount} doctors across our clinics` : '' },
    { icon: CalendarCheck, text: 'Consultation before any treatment' },
  ].filter((f) => f.text);

  return (
    <section id="home" className="bg-canvas">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-8 md:grid-cols-2 md:gap-12 md:px-6 md:py-14 lg:gap-16 lg:px-8 lg:py-20">
        <div className="max-w-xl">
          <p className="eyebrow mb-4">{s.badge}</p>
          <h1 className="heading-display whitespace-pre-line">
            {s.headline.trim()}
            {s.highlightText && <><br /><span className="italic text-bronze">{s.highlightText}</span></>}
          </h1>
          <p className="mt-5 text-base leading-relaxed text-text-secondary md:text-lg">{s.description}</p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={s.ctaPrimary.href}>{s.ctaPrimary.text}</ButtonLink>
            <ButtonLink href={s.ctaSecondary.href} variant="secondary">{s.ctaSecondary.text}</ButtonLink>
          </div>

          {facts.length > 0 && (
            <ul className="mt-7 space-y-2.5 border-t border-line pt-6">
              {facts.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-2.5 text-sm text-text-secondary">
                  <Icon size={16} className="mt-0.5 shrink-0 text-bronze" aria-hidden="true" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <FocalImage
            image={s.image}
            aspectRatio="4/3"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 600px"
            alt="Inside a DR Youth Clinic"
            className="rounded-2xl"
            priority
          />
          {slides.length > 1 && (
            <div className="mt-2 flex justify-center gap-1" role="group" aria-label="Choose a slide">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrent(i)}
                  aria-label={`Show slide ${i + 1} of ${slides.length}`}
                  aria-current={i === current}
                  className="flex h-11 w-11 items-center justify-center"
                >
                  <span className={`h-2 rounded-full transition-all ${i === current ? 'w-6 bg-primary' : 'w-2 bg-line-strong'}`} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
