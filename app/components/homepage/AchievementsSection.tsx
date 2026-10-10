import Image from 'next/image';

interface AchievementItem {
  _id: string;
  title: string;
  image?: { url: string; publicId: string };
}

interface AchievementsData {
  headline?: string;
  subheadline?: string;
  // Populated live from the Achievement collection (see
  // app/(public)/page.tsx's enriched.achievements merge) — same pattern
  // before_after.pairs uses for its live Result docs, not stored directly
  // in this section's own HomepageSection.data.
  achievements?: AchievementItem[];
}

// Real uploaded badge graphics (medallion/seal-style award art), not emoji
// + text — distinct from the About page's AwardsSection, which is the
// lighter emoji-based version. Self-hides with no live, active badges
// (same guard TrustTimeline uses for its own live data) so an
// unconfigured section never shows an empty strip.
export default function AchievementsSection({ data }: { data: AchievementsData }) {
  const { headline = 'Recognised For Excellence', subheadline, achievements = [] } = data || {};
  if (!achievements.length) return null;

  return (
    <section className="py-12 md:py-16 bg-white border-y border-gray-50">
      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#A25607] bg-[#A25607]/10 px-3 py-1 rounded-full uppercase tracking-wider mb-3">
            🏆 Achievements &amp; Awards
          </span>
          <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-[#0B2560]">{headline}</h2>
          {subheadline && <p className="text-gray-500 text-sm md:text-base mt-2 max-w-xl mx-auto">{subheadline}</p>}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 md:gap-14">
          {achievements.map((a) => (
            <div key={a._id} className="flex flex-col items-center text-center w-32 sm:w-36 group">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 mb-3 transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-105">
                {a.image?.url ? (
                  <Image
                    src={a.image.url}
                    alt={a.title}
                    fill
                    sizes="112px"
                    className="object-contain drop-shadow-[0_6px_14px_rgba(11,37,96,0.12)]"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-[#f6faff] border border-blue-50 flex items-center justify-center text-3xl">
                    🏆
                  </div>
                )}
              </div>
              <p className="text-xs sm:text-[13px] font-semibold text-[#0B2560] leading-snug">{a.title}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
