import Image from 'next/image';
import Link from 'next/link';

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
    stats = [],
    ctaText = 'Book a Consultation',
    ctaHref = '/book',
  } = data || {};

  // Nothing meaningful configured yet — don't show a placeholder card on a live site.
  if (!name && !photo?.url) return null;

  return (
    <section id="founder" className="relative py-16 md:py-24 bg-gradient-to-b from-white via-[#f9fbff] to-white overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[#0B2560]/[0.03] -translate-y-1/3 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-[#F5A623]/[0.05] translate-y-1/3 -translate-x-1/3 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 relative grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">

        {/* Photo column */}
        <div className="relative order-2 lg:order-1 mx-auto lg:mx-0 max-w-sm w-full">
          <div className="absolute -inset-3 bg-gradient-to-br from-[#0B2560]/10 to-[#F5A623]/15 rounded-[2.5rem] -z-10 rotate-2" />
          <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl ring-1 ring-black/5">
            {photo?.url ? (
              <Image src={photo.url} alt={name} fill sizes="(max-width: 1024px) 90vw, 420px" className="object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#0B2560] to-[#1a4a8a] flex items-center justify-center text-6xl">
                👨‍⚕️
              </div>
            )}
          </div>

          {credentials.length > 0 && (
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 lg:left-auto lg:-right-6 lg:translate-x-0 bg-white rounded-2xl shadow-xl px-5 py-3.5 border border-gray-100 max-w-[240px]">
              <div className="flex flex-wrap gap-1.5">
                {credentials.map((c, i) => (
                  <span key={i} className="text-[10px] font-bold text-[#0B2560] bg-[#f6faff] border border-blue-50 px-2 py-1 rounded-full whitespace-nowrap">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Text column */}
        <div className="order-1 lg:order-2">
          <span className="inline-flex items-center gap-2 bg-[#0B2560]/5 text-[#0B2560] text-xs font-bold px-4 py-1.5 rounded-full tracking-wider uppercase mb-5">
            {eyebrow}
          </span>
          <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-[#0B2560] leading-tight mb-6">
            {headline}
          </h2>

          {quote && (
            <blockquote className="relative pl-6 border-l-4 border-[#F5A623] mb-7">
              <span className="absolute -left-1 -top-3 text-6xl font-serif text-[#F5A623]/20 select-none">"</span>
              <p className="text-gray-600 text-lg md:text-xl leading-relaxed italic font-medium">{quote}</p>
            </blockquote>
          )}

          <div className="flex items-center gap-4 mb-8">
            {signature?.url && (
              <div className="relative h-12 w-32 shrink-0">
                <Image src={signature.url} alt={`${name} signature`} fill sizes="128px" className="object-contain object-left" />
              </div>
            )}
            <div>
              <p className="font-bold text-[#0B2560] text-lg">{name}</p>
              <p className="text-[#3B82C4] text-sm font-semibold">{title}</p>
            </div>
          </div>

          {stats.length > 0 && (
            <div className="flex flex-wrap gap-6 mb-8 pb-8 border-b border-gray-100">
              {stats.map((s, i) => (
                <div key={i}>
                  <p className="text-2xl font-extrabold text-[#0B2560]">{s.value}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          <Link href={ctaHref}>
            <button className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-7 py-3.5 rounded-xl font-bold shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition text-sm">
              {ctaText}
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}
