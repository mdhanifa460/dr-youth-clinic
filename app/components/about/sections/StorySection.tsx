interface StoryData {
  eyebrow?: string;
  headline?: string;
  body?: string;
  image?: string;
}

export default function StorySection({ data }: { data: StoryData }) {
  const { eyebrow, headline, body, image } = data;
  if (!headline && !body) return null;

  return (
    <section className="bg-white py-14 md:py-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className={`grid ${image ? 'md:grid-cols-2 gap-10 md:gap-14 items-center' : ''}`}>
          <div className={image ? '' : 'max-w-3xl mx-auto text-center'}>
            {eyebrow && (
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-3">{eyebrow}</p>
            )}
            {headline && (
              <h2 className="text-2xl md:text-4xl font-headline font-extrabold text-[#0B2560] leading-tight mb-4">
                {headline}
              </h2>
            )}
            {body && <p className="text-gray-600 text-sm md:text-base leading-relaxed">{body}</p>}
          </div>
          {image && (
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-xl">
              <img src={image} alt={headline || 'Our story'} className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
