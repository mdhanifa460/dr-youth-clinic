interface HeroData {
  badge?: string;
  headline?: string;
  headlineAccent?: string;
  subheading?: string;
  body?: string;
  backgroundImage?: string;
  stats?: { value: string; label: string }[];
}

export default function HeroSection({ data }: { data: HeroData }) {
  const { badge, headline = '', headlineAccent, subheading, body, backgroundImage, stats = [] } = data;
  const [before, after] = headlineAccent && headline.includes(headlineAccent)
    ? headline.split(headlineAccent)
    : [headline, ''];

  return (
    <>
      <section
        className="relative bg-[#0B2560] overflow-hidden"
        style={backgroundImage ? { backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B2560] via-[#0B2560]/95 to-[#0B2560]/80" />
        <div className="absolute -top-40 -right-40 w-[36rem] h-[36rem] rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 rounded-full bg-[#F5A623]/10 pointer-events-none" />
        <div className="absolute top-1/2 left-0 w-56 h-56 rounded-full bg-white/[0.03] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28">
          {badge && (
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-0.5 bg-[#F5A623]" />
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623]">{badge}</p>
            </div>
          )}
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-headline font-extrabold text-white leading-tight mb-4">
            {before}{headlineAccent && <span className="text-[#F5A623]">{headlineAccent}</span>}{after}
          </h1>
          {subheading && (
            <p className="text-white/70 text-base md:text-xl font-medium mb-6">{subheading}</p>
          )}
          {body && (
            <p className="text-white/55 max-w-2xl text-sm md:text-base leading-relaxed">{body}</p>
          )}
        </div>
      </section>

      {stats.length > 0 && (
        <section className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl md:text-4xl font-headline font-extrabold text-[#0B2560]">{s.value}</p>
                <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
