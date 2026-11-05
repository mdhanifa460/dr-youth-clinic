import ImageWithFallback from '@/app/components/media/ImageWithFallback';
import Link from 'next/link';
import { withoutPatientClaims } from '@/app/lib/patientClaims';

interface FounderData {
  eyebrow?: string;
  headline?: string;
  quote?: string;
  name?: string;
  title?: string;
  photo?: { url: string; publicId: string };
  signature?: { url: string; publicId: string };
  credentials?: string[];
  stats?: { value: string; label: string }[];
  ctaText?: string;
  ctaHref?: string;
}

export default function FounderSection({ data }: { data: FounderData }) {
  const {
    eyebrow = 'Meet Our Founder',
    headline = 'The Vision Behind DR Youth Clinic',
    quote = '',
    name = '',
    title = 'Founder & CEO',
    photo,
    signature,
    credentials = [],
    stats: rawStats = [],
    ctaText = 'Book a Consultation',
    ctaHref = '/book',
  } = data || {};

  // Nothing meaningful configured yet — don't show a placeholder card on a live site.
  if (!name && !photo?.url) return null;

  return (
    <section id="founder" className="relative py-16 md:py-24 bg-gradient-to-b from-white via-[#f9fbff] to-white overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary/[0.03] -translate-y-1/3 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-champagne/[0.05] translate-y-1/3 -translate-x-1/3 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 relative grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">

        {/* Photo column */}
        <div className="relative order-2 lg:order-1 mx-auto lg:mx-0 max-w-sm w-full">
          <div className="absolute -inset-3 bg-gradient-to-br from-primary/10 to-champagne/15 rounded-[2.5rem] -z-10 rotate-2" />
          <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl ring-1 ring-black/5">
            <ImageWithFallback
              src={photo?.url}
              alt={name}
              fill
              sizes="(max-width: 1024px) 90vw, 420px"
              className="object-cover"
              fallback={
                <div className="w-full h-full bg-gradient-to-br from-primary to-[#1a4a8a] flex items-center justify-center text-6xl">
                  👨‍⚕️
                </div>
              }
            />
          </div>

          {credentials.length > 0 && (
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 lg:left-auto lg:-right-6 lg:translate-x-0 bg-white rounded-2xl shadow-xl px-5 py-3.5 border border-gray-100 max-w-[240px]">
              <div className="flex flex-wrap gap-1.5">
                {credentials.map((c, i) => (
                  <span key={i} className="text-xs font-bold text-primary bg-canvas border border-blue-50 px-2 py-1 rounded-full whitespace-nowrap">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Text column */}
        <div className="order-1 lg:order-2">
          <span className="inline-flex items-center gap-2 bg-primary/5 text-primary text-xs font-bold px-4 py-1.5 rounded-full tracking-wider uppercase mb-5">
            {eyebrow}
          </span>
          <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-primary leading-tight mb-6">
            {headline}
          </h2>

          {quote && (
            <blockquote className="relative pl-6 border-l-4 border-champagne mb-7">
              <span className="absolute -left-1 -top-3 text-6xl font-serif text-bronze/20 select-none">"</span>
              <p className="text-gray-600 text-lg md:text-xl leading-relaxed italic font-medium">{quote}</p>
            </blockquote>
          )}

          <div className="flex items-center gap-4 mb-8">
            {signature?.url && (
              <div className="relative h-12 w-32 shrink-0">
                <ImageWithFallback src={signature.url} alt={`${name} signature`} fill sizes="128px" className="object-contain object-left" fallback={null} />
              </div>
            )}
            <div>
              <p className="font-bold text-primary text-lg">{name}</p>
              <p className="text-secondary text-sm font-semibold">{title}</p>
            </div>
          </div>

          {withoutPatientClaims(rawStats).length > 0 && (
            <div className="flex flex-wrap gap-6 mb-8 pb-8 border-b border-gray-100">
              {withoutPatientClaims(rawStats).map((s, i) => (
                <div key={i}>
                  <p className="text-2xl font-extrabold text-primary">{s.value}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          <Link href={ctaHref} className="inline-flex items-center justify-center inline-flex items-center gap-2 bg-primary text-white px-7 py-3.5 rounded-xl font-bold shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition text-sm">
              {ctaText}
            </Link>
        </div>
      </div>
    </section>
  );
}
