interface BeforeAfterPair {
  label?: string;
  before?: { url?: string };
  after?: { url?: string };
}

interface BeforeAfterData {
  headline?: string;
  pairs?: BeforeAfterPair[];
}

export default function BeforeAfterSection({ data }: { data: BeforeAfterData }) {
  const {
    headline = 'Real Results',
    pairs = [],
  } = data;

  const activePairs = pairs.filter((p) => p.before?.url && p.after?.url);

  if (!activePairs.length) return null;

  return (
    <section className="bg-[#f6faff] py-14 md:py-20">
      <div className="max-w-5xl mx-auto px-5">
        <div className="text-center mb-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#3B82C4] mb-3">
            Transformations
          </p>
          <h2 className="text-2xl md:text-4xl font-extrabold text-[#0B2560]">{headline}</h2>
          <p className="text-sm text-gray-500 mt-3">Real patients, real results from our clinic</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {activePairs.map((pair, i) => (
            <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-shadow duration-300">
              <div className="grid grid-cols-2">
                <div className="relative">
                  <img
                    src={pair.before!.url}
                    alt={`Before - ${pair.label || ''}`}
                    className="w-full aspect-[3/4] object-cover"
                  />
                  <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-sm">
                    BEFORE
                  </span>
                </div>
                <div className="relative">
                  <img
                    src={pair.after!.url}
                    alt={`After - ${pair.label || ''}`}
                    className="w-full aspect-[3/4] object-cover"
                  />
                  <span className="absolute bottom-2 right-2 bg-[#0B2560]/80 text-white text-[10px] font-bold px-2 py-1 rounded-lg backdrop-blur-sm">
                    AFTER
                  </span>
                </div>
              </div>
              {pair.label && (
                <div className="px-4 py-3 text-center">
                  <p className="text-sm font-semibold text-[#0B2560]">{pair.label}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          *Individual results may vary. Photos are from actual DR Youth Clinic patients.
        </p>
      </div>
    </section>
  );
}
