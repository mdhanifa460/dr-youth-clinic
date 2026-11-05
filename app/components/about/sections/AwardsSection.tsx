interface Award { year?: string; icon?: string; title?: string; desc?: string }
interface AwardsData { headline?: string; awards?: Award[] }

export default function AwardsSection({ data }: { data: AwardsData }) {
  const { headline, awards = [] } = data;
  if (!awards.length) return null;

  return (
    <section className="bg-white py-12 border-t border-gray-100">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-bronze mb-2">Recognised For Excellence</p>
          {headline && <h2 className="text-xl md:text-2xl font-headline font-medium text-primary">{headline}</h2>}
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          {awards.map((a, i) => (
            <div key={i} className="flex-1 bg-canvas rounded-2xl p-6 ring-1 ring-line flex flex-col items-center text-center">
              <span className="text-4xl mb-3">{a.icon}</span>
              {a.year && <p className="text-bronze font-headline font-medium text-sm mb-1">{a.year}</p>}
              <p className="font-headline font-medium text-primary text-sm">{a.title}</p>
              {a.desc && <p className="text-gray-500 text-xs mt-1">{a.desc}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
