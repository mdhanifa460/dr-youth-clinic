interface JourneyStep { icon?: string; title?: string; desc?: string }
interface JourneyData { headline?: string; steps?: JourneyStep[] }

export default function JourneySection({ data }: { data: JourneyData }) {
  const { headline, steps = [] } = data;
  if (!steps.length) return null;

  return (
    <section className="bg-[#f6faff] py-14 md:py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-2">What to Expect</p>
          {headline && <h2 className="text-2xl md:text-4xl font-headline font-extrabold text-[#0B2560]">{headline}</h2>}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((s, i) => (
            <div key={i} className="relative bg-white rounded-2xl p-6 ring-1 ring-[#e8eff7] shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[#0B2560] text-white flex items-center justify-center text-lg mb-4">
                {s.icon}
              </div>
              <p className="text-[10px] font-bold text-gray-300 mb-1">STEP {i + 1}</p>
              <h3 className="font-headline font-bold text-[#0B2560] text-sm mb-1.5">{s.title}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{s.desc}</p>
              {i < steps.length - 1 && (
                <span className="hidden lg:block absolute top-1/2 -right-3 -translate-y-1/2 text-gray-300">→</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
