interface Milestone { year?: string; title?: string; desc?: string }
interface TimelineData { headline?: string; milestones?: Milestone[] }

export default function TimelineSection({ data }: { data: TimelineData }) {
  const { headline, milestones = [] } = data;
  if (!milestones.length) return null;

  return (
    <section className="bg-[#f6faff] py-14 md:py-20">
      <div className="max-w-4xl mx-auto px-6">
        {headline && (
          <div className="text-center mb-12">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-2">Milestones</p>
            <h2 className="text-2xl md:text-4xl font-headline font-extrabold text-[#0B2560]">{headline}</h2>
          </div>
        )}
        <div className="relative">
          <div className="absolute left-[15px] md:left-1/2 top-2 bottom-2 w-px bg-[#0B2560]/15 md:-translate-x-1/2" />
          <div className="space-y-8">
            {milestones.map((m, i) => (
              <div key={i} className={`relative flex items-start md:items-center gap-5 md:gap-10 ${i % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
                <div className="relative shrink-0 z-10">
                  <div className="w-8 h-8 rounded-full bg-[#0B2560] border-4 border-[#f6faff] shadow flex items-center justify-center" />
                </div>
                <div className={`flex-1 bg-white rounded-2xl p-5 md:p-6 shadow-sm ring-1 ring-[#e8eff7] ${i % 2 === 1 ? 'md:text-right' : ''}`}>
                  <p className="text-[#F5A623] font-headline font-extrabold text-lg">{m.year}</p>
                  <h3 className="font-bold text-[#0B2560] text-base mt-0.5">{m.title}</h3>
                  {m.desc && <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">{m.desc}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
