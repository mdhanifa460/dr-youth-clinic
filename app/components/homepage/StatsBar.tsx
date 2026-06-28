import { AiFillStar } from 'react-icons/ai';

export default function StatsBar({ data }: { data: any }) {
  const { stats = [] } = data || {};

  return (
    <section className="bg-white border-y border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((s: any, i: number) => (
          <div key={i} className="text-center">
            <p className="text-3xl md:text-4xl font-extrabold text-[#0B2560] font-headline">
              {s.value}
            </p>
            {s.showStars && (
              <div className="flex justify-center gap-0.5 my-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <AiFillStar key={n} className="text-[#F5A623] text-sm" />
                ))}
              </div>
            )}
            <p className="text-gray-500 text-sm font-medium mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
