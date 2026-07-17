import type { TrustBadgeData } from "@/app/lib/banners/types";

// Matches HeroSection.tsx's trustBadges block styling.
export default function TrustBadges({ badges }: { badges: TrustBadgeData[] }) {
  if (!badges?.length) return null;
  return (
    <div className="flex flex-wrap gap-3 sm:gap-4 md:gap-6 pt-1">
      {badges.map((b, i) => (
        <div
          key={i}
          className="flex min-h-9 items-center gap-2 rounded-full bg-white/60 px-3 py-1.5 text-xs sm:text-sm text-gray-600 shadow-sm ring-1 ring-white/70"
        >
          <span className="text-lg sm:text-xl">{b.icon}</span>
          <span className="font-medium leading-snug">{b.text}</span>
        </div>
      ))}
    </div>
  );
}
