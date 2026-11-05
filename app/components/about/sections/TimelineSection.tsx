import { mentionsPatientCount } from '@/app/lib/patientClaims';

interface Milestone { year?: string; title?: string; desc?: string }
interface TimelineData { headline?: string; milestones?: Milestone[] }

export default function TimelineSection({ data }: { data: TimelineData }) {
  const { headline } = data;
  const milestones = (data.milestones ?? []).filter((m) => !mentionsPatientCount(`${m.title} ${m.desc}`));
  if (!milestones.length) return null;

  return (
    <section className="bg-canvas py-14 md:py-20">
      <div className="max-w-4xl mx-auto px-6">
        {headline && (
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-bronze mb-2">Milestones</p>
            <h2 className="text-2xl md:text-4xl font-headline font-medium text-primary">{headline}</h2>
          </div>
        )}
        <div className="relative">
          <div className="absolute left-[15px] md:left-1/2 top-2 bottom-2 w-px bg-primary/15 md:-translate-x-1/2" />
          <div className="space-y-8">
            {milestones.map((m, i) => (
              <div key={i} className={`relative flex items-start md:items-center gap-5 md:gap-10 ${i % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
                <div className="relative shrink-0 z-10">
                  <div className="w-8 h-8 rounded-full bg-primary border-4 border-canvas shadow flex items-center justify-center" />
                </div>
                <div className={`flex-1 bg-white rounded-2xl p-5 md:p-6 shadow-sm ring-1 ring-line ${i % 2 === 1 ? 'md:text-right' : ''}`}>
                  <p className="text-bronze font-headline font-medium text-lg">{m.year}</p>
                  <h3 className="font-bold text-primary text-base mt-0.5">{m.title}</h3>
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
