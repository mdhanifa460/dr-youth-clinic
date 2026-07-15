import Link from 'next/link';
import { Sparkles, Calendar, MessageCircle } from 'lucide-react';

export default function ArticleCtaBand({
  consultationFree,
  consultationCta,
  publicWhatsApp,
}: {
  consultationFree: boolean;
  consultationCta: string;
  publicWhatsApp?: string;
}) {
  const waHref = publicWhatsApp ? `https://wa.me/${publicWhatsApp.replace(/\D/g, '')}` : null;

  return (
    <section className="bg-[#0B2560] py-14">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-3">Take the Next Step</p>
        <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-white mb-3">Still Not Sure?</h2>
        <p className="text-white/60 text-sm mb-8 max-w-md mx-auto">
          Get a personalised recommendation, book a {consultationFree ? 'free ' : ''}consultation, or talk to a doctor directly — whichever helps you decide.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/skin-quiz" className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/20 px-6 py-3.5 rounded-2xl font-semibold text-sm hover:bg-white/20 transition">
            <Sparkles size={15} /> Take AI Assessment
          </Link>
          <Link href="/book" className="inline-flex items-center gap-2 bg-[#F5A623] text-[#0B2560] px-6 py-3.5 rounded-2xl font-extrabold text-sm hover:-translate-y-0.5 transition shadow-lg">
            <Calendar size={15} /> {consultationCta}
          </Link>
          {waHref && (
            <a href={waHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white/10 text-white border border-white/20 px-6 py-3.5 rounded-2xl font-semibold text-sm hover:bg-white/20 transition">
              <MessageCircle size={15} /> Talk to Doctor
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
