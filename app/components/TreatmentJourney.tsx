interface JourneyPhase { title: string; description: string }

interface Props {
  sessions: number;
  treatmentName: string;
  /** Admin-editable phase titles/descriptions (Service.journeyPhases). Any phase left
   *  unset (or the array left short of 4) falls back to that slot's generic default
   *  individually — session ranges are always computed automatically from `sessions`. */
  phases?: JourneyPhase[];
}

const DEFAULT_PHASES: JourneyPhase[] = [
  { title: 'Initial Assessment', description: 'Doctor evaluates your skin, personalised protocol designed for your unique concern.' },
  { title: 'Active Treatment', description: 'Core sessions targeting your concern with calibrated intensity and precision.' },
  { title: 'Visible Results', description: 'Significant improvement becomes visible. Progress is documented and tracked.' },
  { title: 'Maintenance Plan', description: 'Monthly sessions to sustain your results and prevent regression long-term.' },
];

function buildPhases(sessions: number, custom?: JourneyPhase[]) {
  const s = Math.max(4, sessions);
  const p1 = Math.max(1, Math.round(s * 0.25));
  const p2 = Math.max(p1 + 1, Math.round(s * 0.5));
  const p3 = s;
  const src = DEFAULT_PHASES.map((def, i) => custom?.[i]?.title || custom?.[i]?.description ? custom[i] : def);

  return [
    { number: 1, sessions: `Session 1–${p1}`, label: src[0].title, desc: src[0].description },
    { number: 2, sessions: `Session ${p1 + 1}–${p2}`, label: src[1].title, desc: src[1].description },
    { number: 3, sessions: `Session ${p2 + 1}–${p3}`, label: src[2].title, desc: src[2].description },
    { number: 4, sessions: 'Post-treatment', label: src[3].title, desc: src[3].description },
  ];
}

export default function TreatmentJourney({ sessions, treatmentName, phases: customPhases }: Props) {
  const phases = buildPhases(sessions, customPhases);

  return (
    <div>
      <h2 className="text-2xl font-headline font-bold text-[#0B2560] mb-2">
        Your Multi-Session Plan
      </h2>
      <p className="text-gray-500 text-sm mb-8">
        A structured {sessions}-session pathway designed to deliver lasting results for{' '}
        {treatmentName}.
      </p>

      {/* ── Desktop: horizontal timeline ── */}
      <div className="hidden sm:block relative">
        <div className="absolute top-7 left-[12.5%] right-[12.5%] h-0 border-t-2 border-dashed border-[#F5A623]/50 pointer-events-none" />
        <div className="grid grid-cols-4 gap-6 relative">
          {phases.map((phase) => (
            <div key={phase.number} className="flex flex-col items-center text-center">
              <div className="relative z-10 w-14 h-14 rounded-full bg-[#0B2560] text-white flex flex-col items-center justify-center shadow-lg ring-4 ring-white mb-4 shrink-0">
                <span className="text-[9px] font-bold text-[#F5A623] uppercase tracking-wide leading-none">
                  Phase
                </span>
                <span className="text-xl font-extrabold leading-none">{phase.number}</span>
              </div>
              <span className="text-[10px] font-bold text-[#F5A623] uppercase tracking-wider mb-1">
                {phase.sessions}
              </span>
              <h3 className="font-bold text-[#0B2560] text-sm mb-2">{phase.label}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{phase.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Mobile: vertical stack ── */}
      <div className="sm:hidden relative">
        <div className="absolute left-7 top-7 bottom-7 w-0 border-l-2 border-dashed border-[#F5A623]/50 pointer-events-none" />
        <div className="space-y-5">
          {phases.map((phase) => (
            <div key={phase.number} className="flex gap-4 relative">
              <div className="shrink-0 z-10 w-14 h-14 rounded-full bg-[#0B2560] text-white flex flex-col items-center justify-center shadow-lg ring-4 ring-white">
                <span className="text-[9px] font-bold text-[#F5A623] uppercase leading-none">
                  Phase
                </span>
                <span className="text-lg font-extrabold leading-none">{phase.number}</span>
              </div>
              <div className="flex-1 bg-[#f6faff] rounded-2xl p-4 border border-blue-50 self-center">
                <span className="text-[10px] font-bold text-[#F5A623] uppercase tracking-wider">
                  {phase.sessions}
                </span>
                <h3 className="font-bold text-[#0B2560] text-sm mt-0.5 mb-1">{phase.label}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{phase.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
