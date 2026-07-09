interface ComparisonData { headline?: string; items?: string[] }

export default function ComparisonSection({ data }: { data: ComparisonData }) {
  const { headline, items = [] } = data;
  if (!items.length) return null;

  return (
    <section className="bg-[#f6faff] py-14 md:py-20">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-2">The Difference</p>
          {headline && <h2 className="text-2xl md:text-4xl font-headline font-extrabold text-[#0B2560]">{headline}</h2>}
        </div>
        <div className="bg-white rounded-3xl ring-1 ring-[#e8eff7] shadow-sm divide-y divide-gray-100">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 px-6 py-4">
              <span className="w-6 h-6 rounded-full bg-green-50 text-green-600 flex items-center justify-center text-xs font-bold shrink-0">✓</span>
              <p className="text-sm font-medium text-gray-700">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
