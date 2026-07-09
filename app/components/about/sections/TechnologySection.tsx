interface TechItem { icon?: string; title?: string; desc?: string }
interface TechnologyData { headline?: string; subheading?: string; items?: TechItem[] }

export default function TechnologySection({ data }: { data: TechnologyData }) {
  const { headline, subheading, items = [] } = data;
  if (!items.length) return null;

  return (
    <section className="bg-white py-14 md:py-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-2">Innovation</p>
          {headline && <h2 className="text-2xl md:text-4xl font-headline font-extrabold text-[#0B2560]">{headline}</h2>}
          {subheading && <p className="text-gray-500 mt-3 text-sm max-w-xl mx-auto">{subheading}</p>}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item, i) => (
            <div key={i} className="bg-[#f6faff] rounded-3xl p-7 ring-1 ring-[#e8eff7] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
              <span className="text-3xl mb-4 block">{item.icon}</span>
              <h3 className="font-headline font-bold text-[#0B2560] text-base mb-2">{item.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
