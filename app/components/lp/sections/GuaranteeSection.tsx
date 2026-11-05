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
  { icon: '🏆', title: 'Progress Reviews',   desc: 'Your doctor reviews your progress during treatment and adjusts the plan where needed. Results vary from person to person.' },
  { icon: '🔬', title: 'Sterile Protocols', desc: 'Sterile protocols and doctor oversight for every session.' },
  { icon: '⭐', title: 'Doctor-Led Care', desc: 'A doctor assesses your concern and plans your treatment.' },
];


export default function GuaranteeSection({ data }: { data: GuaranteeData }) {
  const {
    headline = 'How We Care for You',
    subtext  = "We are committed to your safety and care.",
    cards    = [],
    seals    = [],
  } = data;

  const cardsToShow = cards.length ? cards : DEFAULT_CARDS;
  const sealsToShow = seals;

  return (
    <section className="bg-white py-14 md:py-20">
      <div className="max-w-5xl mx-auto px-5">
        <div className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-secondary mb-3">
            Our Commitment
          </p>
          <h2 className="text-2xl md:text-4xl font-extrabold text-primary">{headline}</h2>
          <p className="text-gray-500 mt-3 text-sm md:text-base max-w-xl mx-auto">{subtext}</p>
        </div>

        {/* Guarantee cards */}
        <div className="grid md:grid-cols-3 gap-5 mb-12">
          {cardsToShow.map((card, i) => (
            <div
              key={i}
              className="relative bg-gradient-to-br from-canvas to-white border border-line rounded-3xl p-7 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
            >
              {/* Gold top bar */}
              <div className="absolute top-0 left-8 right-8 h-1 bg-gradient-to-r from-champagne to-secondary rounded-b-full" />

              <div className="text-4xl mb-4 leading-none">{card.icon}</div>
              <h3 className="font-extrabold text-primary text-base mb-2">{card.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>

        {/* Trust seals */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {sealsToShow.map((seal, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-primary/5 border border-primary/10 text-primary text-xs font-bold px-4 py-2 rounded-full"
            >
              <span className="text-bronze">✦</span>
              {seal}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
