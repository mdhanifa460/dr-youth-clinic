interface ProcessStep {
  number?: number;
  title?: string;
  description?: string;
}

interface ProcessData {
  headline?: string;
  steps?: ProcessStep[];
}

export default function ProcessSection({ data }: { data: ProcessData }) {
  const {
    headline = 'Your Treatment Journey',
    steps = [],
  } = data;

  if (!steps.length) return null;

  return (
    <section className="bg-white py-14 md:py-20">
      <div className="max-w-4xl mx-auto px-5">
        <div className="text-center mb-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#3B82C4] mb-3">
            How It Works
          </p>
          <h2 className="text-2xl md:text-4xl font-extrabold text-[#0B2560]">{headline}</h2>
        </div>

        <div className="relative">
          {/* Connector line */}
          <div className="hidden md:block absolute left-8 top-8 bottom-8 w-0.5 bg-gradient-to-b from-[#0B2560] via-[#3B82C4] to-[#0B2560] opacity-20" />

          <div className="space-y-6 md:space-y-8">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-5 md:gap-7 items-start group">
                {/* Number */}
                <div className="shrink-0 w-16 h-16 rounded-2xl bg-[#0B2560] text-white flex flex-col items-center justify-center shadow-lg shadow-[#0B2560]/20 group-hover:bg-[#3B82C4] transition-colors duration-300 z-10">
                  <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Step</span>
                  <span className="text-xl font-extrabold leading-none">{step.number ?? i + 1}</span>
                </div>

                {/* Content */}
                <div className="flex-1 bg-[#f6faff] border border-[#e0ecf8] rounded-2xl px-5 py-4 md:px-6 md:py-5 group-hover:shadow-md transition-shadow duration-300">
                  <h3 className="font-bold text-[#0B2560] text-base md:text-lg">{step.title}</h3>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
