import Image from 'next/image';

interface HeroData {
  badge?: string;
  headline?: string;
  headlineAccent?: string;
  subheading?: string;
  body?: string;
  backgroundImage?: string;
  stats?: { value: string; label: string }[];
}

// Literal class strings (not a template-string `grid-cols-${n}`) — Tailwind's
// build-time class scanner only picks up classes it can find as whole
// strings in source, so a dynamically-interpolated class name would
// silently never be generated. Keyed by stat count so any admin-configured
// number of stats gets a sensible, non-wrapping column count on each
// breakpoint instead of the previous fixed grid-cols-4 (which wrapped a
// 5th stat onto its own row).
const DESKTOP_COLS: Record<number, string> = {
  1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3',
  4: 'md:grid-cols-4', 5: 'md:grid-cols-5', 6: 'md:grid-cols-6',
};
const MOBILE_COLS: Record<number, string> = {
  1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3',
  4: 'grid-cols-2', 5: 'grid-cols-3', 6: 'grid-cols-3',
};

export default function HeroSection({ data }: { data: HeroData }) {
  const { badge, headline = '', headlineAccent, subheading, body, backgroundImage, stats = [] } = data;
  const [before, after] = headlineAccent && headline.includes(headlineAccent)
    ? headline.split(headlineAccent)
    : [headline, ''];

  return (
    <>
      <section className="relative bg-[#0B2560] overflow-hidden">
        {/* Was a plain CSS background-image — unoptimized, no responsive
            sizing, no load priority, unlike every other hero image in the
            app (see GlassHeroBanner.tsx's <Image fill priority sizes>).
            Same fix as the LP HeroSection's identical issue. */}
        {backgroundImage && (
          <Image src={backgroundImage} alt="" fill priority sizes="100vw" className="object-cover" aria-hidden="true" />
        )}
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
          {/* Fixed grid-cols-4 wrapped a 5th+ stat onto its own row (a lone
              centered item looks broken, not intentional) — column count
              now tracks the real stat count instead, on both breakpoints,
              so any number of stats stays a single row on desktop and a
              tidy, evenly-filled grid on mobile. Smaller type/spacing than
              before so 5-6 stats still read comfortably in one row rather
              than feeling cramped. */}
          <div
            className={`max-w-7xl mx-auto px-6 py-6 md:py-8 grid gap-3 md:gap-6 ${MOBILE_COLS[stats.length] || 'grid-cols-3'} ${DESKTOP_COLS[stats.length] || 'md:grid-cols-6'}`}
          >
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-xl sm:text-2xl md:text-3xl font-headline font-extrabold text-[#0B2560]">{s.value}</p>
                <p className="text-[10px] md:text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
