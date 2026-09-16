interface LeadershipData {
  eyebrow?: string;
  name?: string;
  title?: string;
  photo?: string;
  quote?: string;
  bio?: string;
}

export default function LeadershipSection({ data }: { data: LeadershipData }) {
  const { eyebrow, name, title, photo, quote, bio } = data;
  if (!name && !photo) return null;

  return (
    <section className="bg-[#0B2560] relative overflow-hidden">
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#F5A623]/10 pointer-events-none" />
      <div className="max-w-7xl mx-auto px-6 py-16 md:py-24">
        <div className="grid md:grid-cols-[minmax(0,1fr)_1.2fr] gap-10 md:gap-16 items-center">
          {/* Full, premium photo */}
          <div className="relative order-2 md:order-1">
            <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl ring-4 ring-white/10">
              {photo ? (
                <img src={photo} alt={name} className="w-full h-full object-cover object-top" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#3B82C4] to-[#0B2560] flex items-center justify-center">
                  <span className="text-8xl opacity-50">👤</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B2560]/40 via-transparent to-transparent" />
            </div>
            <div className="absolute -bottom-5 -right-5 w-24 h-24 rounded-full bg-[#F5A623]/15 -z-10" />
          </div>

          {/* Content */}
          <div className="order-1 md:order-2">
            {eyebrow && (
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-4">{eyebrow}</p>
            )}
            {quote && (
              <blockquote className="text-white text-xl md:text-3xl font-headline font-bold leading-snug mb-6">
                &ldquo;{quote}&rdquo;
              </blockquote>
            )}
            {bio && <p className="text-white/60 text-sm md:text-base leading-relaxed mb-6">{bio}</p>}
            {name && (
              <div>
                <p className="text-white font-headline font-extrabold text-lg">{name}</p>
                {title && <p className="text-[#F5A623] text-sm font-semibold mt-0.5">{title}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
