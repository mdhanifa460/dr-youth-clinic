interface SolutionData {
  headline?: string;
  description?: string;
  image?: string;
  highlights?: string[];
}

export default function SolutionSection({ data }: { data: SolutionData }) {
  const {
    headline = 'Why Our Treatment Works',
    description = 'Our clinically proven protocols deliver real results.',
    image,
    highlights = [],
  } = data;

  return (
    <section className="bg-[#f6faff] py-14 md:py-20">
      <div className="max-w-5xl mx-auto px-5">
        <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          {/* Image */}
          <div className="relative">
            {image ? (
              <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
                <img src={image} alt={headline} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="aspect-[4/3] rounded-3xl bg-gradient-to-br from-[#0B2560] to-[#3B82C4] flex items-center justify-center shadow-2xl">
                <span className="text-7xl opacity-30">🔬</span>
              </div>
            )}
            {/* Badge overlay */}
            <div className="absolute -bottom-4 -right-4 bg-[#F5A623] text-[#0B2560] font-extrabold text-sm px-5 py-3 rounded-2xl shadow-xl">
              Clinically Proven
            </div>
          </div>

          {/* Content */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#3B82C4] mb-3">
              The DR Youth Difference
            </p>
            <h2 className="text-2xl md:text-4xl font-extrabold text-[#0B2560] leading-tight">
              {headline}
            </h2>
            <p className="mt-4 text-gray-600 leading-relaxed">{description}</p>

            {highlights.length > 0 && (
              <ul className="mt-6 space-y-3">
                {highlights.map((h, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#0B2560] text-white flex items-center justify-center text-xs font-bold shrink-0">
                      ✓
                    </span>
                    <span className="text-gray-700 font-medium">{h}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
