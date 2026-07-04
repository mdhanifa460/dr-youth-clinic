const PROBLEM_ICONS = ['😔', '😞', '😟', '😣', '😩', '😰', '🤕', '💔', '😢', '😱'];

interface ProblemData {
  headline?: string;
  problems?: string[];
}

export default function ProblemSection({ data }: { data: ProblemData }) {
  const { headline = 'Are You Experiencing Any of These?', problems = [] } = data;

  if (!problems.length) return null;

  return (
    <section className="py-14 md:py-20 bg-gradient-to-br from-[#0B2560] to-[#1a3a7a] relative overflow-hidden">
      {/* Dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }}
      />

      <div className="relative max-w-4xl mx-auto px-5">
        <div className="text-center mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-3">Recognise These?</p>
          <h2 className="text-2xl md:text-4xl font-extrabold text-white">{headline}</h2>
          <p className="text-white/55 mt-3 text-sm">
            You&rsquo;re not alone — thousands of our patients felt the same way
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {problems.map((problem, i) => (
            <div
              key={i}
              className="flex items-center gap-3 bg-white/10 border border-white/20 backdrop-blur-sm rounded-2xl px-4 py-3.5 hover:bg-white/15 transition-colors"
            >
              <span className="text-xl shrink-0">{PROBLEM_ICONS[i % PROBLEM_ICONS.length]}</span>
              <span className="text-sm font-semibold text-white leading-snug">{problem}</span>
            </div>
          ))}
        </div>

        <div className="mt-10 bg-white/10 border border-white/20 backdrop-blur-sm rounded-3xl p-6 md:p-8 text-center">
          <p className="text-xl md:text-2xl font-bold text-white mb-2">
            You&rsquo;re not alone.
          </p>
          <p className="text-white/65 text-sm max-w-lg mx-auto leading-relaxed">
            Over 25,000 patients have trusted DR Youth Clinic to solve these exact problems.
            Our expert team will find the right solution for you.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="text-[#F5A623] text-lg">★★★★★</span>
            <span className="text-white text-sm font-semibold">4.9/5 · 25,000+ patients helped</span>
          </div>
        </div>
      </div>
    </section>
  );
}
