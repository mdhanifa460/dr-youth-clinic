interface CommunityItem { icon?: string; title?: string; desc?: string }
interface CommunityData { headline?: string; items?: CommunityItem[] }

export default function CommunitySection({ data }: { data: CommunityData }) {
  const { headline, items = [] } = data;
  if (!items.length) return null;

  return (
    <section className="bg-white py-14 md:py-20">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-2">Giving Back</p>
          {headline && <h2 className="text-2xl md:text-4xl font-headline font-extrabold text-[#0B2560]">{headline}</h2>}
        </div>
        <div className="grid sm:grid-cols-2 gap-6">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-4 bg-[#f6faff] rounded-2xl p-6 ring-1 ring-[#e8eff7]">
              <span className="text-3xl shrink-0">{item.icon}</span>
              <div>
                <h3 className="font-headline font-bold text-[#0B2560] text-base mb-1.5">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
