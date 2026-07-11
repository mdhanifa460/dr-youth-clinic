interface TrustTimelineData {
  headline?: string;
  todayLabel?: string;
  weekLabel?: string;
  monthLabel?: string;
  todayCount?: number;
  weekCount?: number;
  monthCount?: number;
}

export default function TrustTimeline({ data }: { data: TrustTimelineData }) {
  const {
    headline = 'Real Activity, Real Trust',
    todayLabel = 'Consultations Today',
    weekLabel = 'Treatments This Week',
    monthLabel = 'Happy Patients This Month',
    todayCount,
    weekCount,
    monthCount,
  } = data || {};

  // Live counts failed to load — don't show a section with blank/zero numbers
  // that could read as "nothing happening at this clinic."
  if (todayCount == null || weekCount == null || monthCount == null) return null;

  const stats = [
    { value: todayCount, label: todayLabel },
    { value: weekCount, label: weekLabel },
    { value: monthCount, label: monthLabel },
  ];

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full uppercase tracking-wider mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Live Activity
          </span>
          <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-[#0B2560]">{headline}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {stats.map((s, i) => (
            <div key={i} className="bg-[#f6faff] rounded-3xl p-6 text-center border border-blue-50">
              <p className="text-4xl font-extrabold text-[#0B2560] mb-1">{s.value.toLocaleString('en-IN')}</p>
              <p className="text-gray-500 text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
