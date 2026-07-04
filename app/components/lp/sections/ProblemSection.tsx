interface ProblemData {
  headline?: string;
  problems?: string[];
}

export default function ProblemSection({ data }: { data: ProblemData }) {
  const {
    headline = 'Are You Experiencing...',
    problems = [],
  } = data;

  if (!problems.length) return null;

  return (
    <section className="bg-white py-14 md:py-20">
      <div className="max-w-4xl mx-auto px-5">
        <div className="text-center mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#3B82C4] mb-3">
            Recognise These?
          </p>
          <h2 className="text-2xl md:text-4xl font-extrabold text-[#0B2560]">{headline}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {problems.map((problem, i) => (
            <div
              key={i}
              className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3.5"
            >
              <span className="text-red-400 text-lg shrink-0">⚠</span>
              <span className="text-sm font-semibold text-gray-700">{problem}</span>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <p className="text-base md:text-lg font-semibold text-[#0B2560]">
            You&apos;re not alone — and there&apos;s a solution.
          </p>
          <div className="w-16 h-1 bg-[#F5A623] rounded-full mx-auto mt-3" />
        </div>
      </div>
    </section>
  );
}
