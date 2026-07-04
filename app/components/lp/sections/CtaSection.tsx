import { Phone, MessageCircle, CalendarCheck } from 'lucide-react';

interface CtaData {
  headline?: string;
  subtext?: string;
  ctaPrimary?: string;
  phone?: string;
  whatsapp?: string;
}

export default function CtaSection({ data }: { data: CtaData }) {
  const {
    headline = 'Ready to Transform?',
    subtext = 'Book your free consultation today.',
    ctaPrimary = 'Book Free Consultation',
    phone,
    whatsapp,
  } = data;

  const waLink = whatsapp
    ? `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=Hi, I'd like to book a free consultation`
    : null;

  return (
    <section className="bg-gradient-to-br from-[#0B2560] to-[#1e407a] py-16 md:py-24 relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[#3B82C4]/10 translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-[#F5A623]/10 -translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="relative max-w-3xl mx-auto px-5 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-4">
          Take the First Step
        </p>
        <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight">{headline}</h2>
        <p className="mt-4 text-white/70 text-base md:text-lg">{subtext}</p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-9">
          <button
            onClick={() => {
              const formEl = document.getElementById('lp-form');
              formEl?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex items-center justify-center gap-2 bg-[#F5A623] hover:bg-[#e09516] text-[#0B2560] font-extrabold px-8 py-4 rounded-2xl text-base shadow-2xl shadow-[#F5A623]/30 hover:-translate-y-0.5 transition-all duration-200"
          >
            <CalendarCheck size={18} />
            {ctaPrimary}
          </button>

          {phone && (
            <a href={`tel:${phone.replace(/\s/g, '')}`}>
              <button className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold px-7 py-4 rounded-2xl text-base hover:-translate-y-0.5 transition-all duration-200 w-full sm:w-auto">
                <Phone size={17} />
                {phone}
              </button>
            </a>
          )}

          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer">
              <button className="flex items-center justify-center gap-2 bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/50 text-white font-bold px-7 py-4 rounded-2xl text-base hover:-translate-y-0.5 transition-all duration-200 w-full sm:w-auto">
                <MessageCircle size={17} />
                WhatsApp
              </button>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
