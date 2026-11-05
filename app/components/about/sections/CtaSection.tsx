import Link from 'next/link';

interface CtaData { headline?: string; subtext?: string; ctaText?: string; ctaHref?: string }

export default function CtaSection({ data, consultationCta }: { data: CtaData; consultationCta: string }) {
  const { headline, subtext, ctaText, ctaHref = '/book' } = data;

  return (
    <section className="bg-primary py-16">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-champagne mb-3">Ready to Begin?</p>
        <h2 className="text-2xl md:text-3xl font-headline font-medium text-white mb-3">
          {headline || consultationCta}
        </h2>
        {subtext && <p className="text-white/60 text-sm mb-8 max-w-md mx-auto">{subtext}</p>}
        <Link
          href={ctaHref}
          className="inline-flex items-center gap-2 bg-champagne text-primary px-8 py-3.5 rounded-2xl font-extrabold text-sm hover:-translate-y-0.5 transition shadow-lg"
        >
          {ctaText || consultationCta} →
        </Link>
      </div>
    </section>
  );
}
