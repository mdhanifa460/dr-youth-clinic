interface TrustBarData {
  rating?: number;
  patients?: string;
  years?: string;
  googleRating?: string;
}

export default function TrustBarSection({ data }: { data: TrustBarData }) {
  const {
    rating = 4.9,
    patients = '25,000+',
    years = '20+',
    googleRating = '4.9',
  } = data;

  const stars = Math.round(Number(rating));

  const stats = [
    {
      value: patients,
      label: 'Happy Patients',
      icon: '👥',
    },
    {
      value: years,
      label: 'Years Experience',
      icon: '🏆',
    },
    {
      value: (
        <span className="flex items-center gap-1 justify-center">
          <span className="text-[#F5A623] text-xl tracking-tighter">
            {'★'.repeat(Math.min(stars, 5))}{'☆'.repeat(Math.max(0, 5 - stars))}
          </span>
          <span>{googleRating}</span>
        </span>
      ),
      label: 'Google Rating',
      icon: null,
    },
    {
      value: 'FDA',
      label: 'Approved Treatments',
      icon: '✓',
    },
  ];

  return (
    <section className="bg-[#0B2560] py-6 md:py-8">
      <div className="max-w-5xl mx-auto px-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-xl md:text-3xl font-extrabold text-white">
                {typeof stat.value === 'string' ? (
                  <span>{stat.icon && <span className="mr-1">{stat.icon}</span>}{stat.value}</span>
                ) : stat.value}
              </div>
              <div className="text-[10px] md:text-xs text-white/60 font-semibold uppercase tracking-widest mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
