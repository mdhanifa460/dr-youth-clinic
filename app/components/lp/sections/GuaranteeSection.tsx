interface GuaranteeCard {
  icon?: string;
  title?: string;
  desc?: string;
}

interface GuaranteeData {
  headline?: string;
  subtext?: string;
  cards?: GuaranteeCard[];
  seals?: string[];
}

const DEFAULT_CARDS: GuaranteeCard[] = [
  { icon: '🏆', title: 'Results Guarantee',  desc: 'Visible improvement in your first 3 sessions or we reassess and re-treat at no extra cost.' },
  { icon: '🔬', title: '100% Safe & Sterile', desc: 'FDA-cleared equipment, sterile protocols, and internationally trained dermatologists every session.' },
  { icon: '⭐', title: 'Expert Care Only',    desc: 'Your skin is treated only by certified MD Dermatologists — never trainees or technicians.' },
];

const DEFAULT_SEALS = ['NABH Certified', 'ISO 9001:2015', 'FDA Cleared', 'IADVL Member'];

export default function GuaranteeSection({ data }: { data: GuaranteeData }) {
  const {
    headline = 'Our Promise to You',
    subtext  = "We stand behind every treatment. Your satisfaction and safety are non-negotiable.",
    cards    = [],
    seals    = [],
  } = data;

  const cardsToShow = cards.length ? cards : DEFAULT_CARDS;
  const sealsToShow = seals.length ? seals : DEFAULT_SEALS;

  return (
    <section className="bg-white py-14 md:py-20">
      <div className="max-w-5xl mx-auto px-5">
        <div className="text-center mb-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#3B82C4] mb-3">
            Our Commitment
          </p>
          <h2 className="text-2xl md:text-4xl font-extrabold text-[#0B2560]">{headline}</h2>
          <p className="text-gray-500 mt-3 text-sm md:text-base max-w-xl mx-auto">{subtext}</p>
        </div>

        {/* Guarantee cards */}
        <div className="grid md:grid-cols-3 gap-5 mb-12">
          {cardsToShow.map((card, i) => (
            <div
              key={i}
              className="relative bg-gradient-to-br from-[#f6faff] to-white border border-[#e0ecf8] rounded-3xl p-7 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
            >
              {/* Gold top bar */}
              <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-[#F5A623] to-[#3B82C4] rounded-b-full" />

              <div className="text-4xl mb-4 leading-none">{card.icon}</div>
              <h3 className="font-extrabold text-[#0B2560] text-base mb-2">{card.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>

        {/* Trust seals */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {sealsToShow.map((seal, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-[#0B2560]/5 border border-[#0B2560]/10 text-[#0B2560] text-xs font-bold px-4 py-2 rounded-full"
            >
              <span className="text-[#F5A623]">✦</span>
              {seal}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
