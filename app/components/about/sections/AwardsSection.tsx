interface Award { year?: string; icon?: string; title?: string; desc?: string }
interface AwardsData { headline?: string; awards?: Award[] }

export default function AwardsSection({ data }: { data: AwardsData }) {
  const { headline, awards = [] } = data;
  if (!awards.length) return null;

  return (
    <section className="bg-white py-12 border-t border-gray-100">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-2">Recognised For Excellence</p>
          {headline && <h2 className="text-xl md:text-2xl font-headline font-extrabold text-[#0B2560]">{headline}</h2>}
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          {awards.map((a, i) => (
            <div key={i} className="flex-1 bg-[#f6faff] rounded-2xl p-6 ring-1 ring-[#e8eff7] flex flex-col items-center text-center">
              <span className="text-4xl mb-3">{a.icon}</span>
              {a.year && <p className="text-[#F5A623] font-headline font-extrabold text-sm mb-1">{a.year}</p>}
              <p className="font-headline font-bold text-[#0B2560] text-sm">{a.title}</p>
              {a.desc && <p className="text-gray-400 text-xs mt-1">{a.desc}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
