import { AiFillStar } from 'react-icons/ai';

export default function StatsBar({ data }: { data: any }) {
  const { stats = [] } = data || {};

  return (
    <section className="bg-white border-y border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-5 sm:py-6 md:py-8 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {stats.map((s: any, i: number) => (
          <div key={i} className="text-center rounded-2xl bg-[#f6faff]/70 px-3 py-4 md:bg-transparent md:px-0 md:py-0">
            <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0B2560] font-headline leading-none">
              {s.value}
            </p>
            {s.showStars && (
              <div className="flex justify-center gap-0.5 my-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <AiFillStar key={n} className="text-[#F5A623] text-sm" />
                ))}
              </div>
            )}
            <p className="text-gray-500 text-xs sm:text-sm font-medium mt-1 leading-snug">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
