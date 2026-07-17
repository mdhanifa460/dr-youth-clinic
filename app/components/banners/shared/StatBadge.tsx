import type { StatBadgeData } from "@/app/lib/banners/types";

// Small inline stat tile — used in a row under the CTA row (Premium Hero),
// distinct from HeroSection.tsx's single floating "10k+" corner card, which
// stays specific to the homepage's default hero and isn't reused here.
export function StatBadgeRow({ stats }: { stats: StatBadgeData[] }) {
  if (!stats?.length) return null;
  return (
    <div className="flex flex-wrap gap-6 sm:gap-8">
      {stats.map((s, i) => (
        <div key={i}>
          <p className="text-xl sm:text-2xl font-extrabold text-[#0B2560] leading-none">{s.value}</p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">{s.label}</p>
        </div>
      ))}
    </div>
  );
}
