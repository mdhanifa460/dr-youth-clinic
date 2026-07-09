interface ValueItem { icon?: string; title?: string; desc?: string }
interface ValuesData { missionQuote?: string; missionBody?: string; values?: ValueItem[] }

export default function ValuesSection({ data }: { data: ValuesData }) {
  const { missionQuote, missionBody, values = [] } = data;
  if (!missionQuote && !values.length) return null;

  return (
    <section className="bg-white py-14 md:py-20">
      <div className="max-w-4xl mx-auto px-6">
        {missionQuote && (
          <div className="bg-[#0B2560] rounded-3xl p-8 md:p-12 relative overflow-hidden mb-14">
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#F5A623]/10 -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-4 relative">Our Mission</p>
            <blockquote className="text-white text-xl md:text-2xl font-headline font-bold leading-snug relative">
              &ldquo;{missionQuote}&rdquo;
            </blockquote>
            {missionBody && (
              <p className="text-white/50 mt-4 text-sm leading-relaxed relative max-w-xl">{missionBody}</p>
            )}
          </div>
        )}

        {values.length > 0 && (
          <div className="grid sm:grid-cols-3 gap-5">
            {values.map((v, i) => (
              <div
                key={i}
                className="group bg-[#f6faff] rounded-3xl p-7 ring-1 ring-[#e8eff7] hover:bg-[#0B2560] hover:ring-[#0B2560] transition-all duration-300 cursor-default"
              >
                <span className="text-3xl mb-4 block">{v.icon}</span>
                <h3 className="font-headline font-bold text-[#0B2560] group-hover:text-white text-base mb-2 transition-colors duration-300">
                  {v.title}
                </h3>
                <p className="text-gray-500 group-hover:text-white/70 text-sm leading-relaxed transition-colors duration-300">
                  {v.desc}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
