interface BenefitItem {
  icon?: string;
  title?: string;
  desc?: string;
}

interface BenefitsData {
  headline?: string;
  items?: BenefitItem[];
  showComparison?: boolean;
}

export default function BenefitsSection({ data }: { data: BenefitsData }) {
  const { headline = 'Why Choose DR Youth Clinic', items = [] } = data;

  if (!items.length) return null;

  return (
    <section className="bg-white py-14 md:py-20">
      <div className="max-w-5xl mx-auto px-5">
        <div className="text-center mb-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#3B82C4] mb-3">Our Advantages</p>
          <h2 className="text-2xl md:text-4xl font-extrabold text-[#0B2560]">{headline}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {items.map((item, i) => (
            <div
              key={i}
              className="group bg-white border-l-4 border-[#3B82C4] rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-l-[#F5A623] transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#0B2560]/10 to-[#3B82C4]/10 group-hover:from-[#F5A623]/20 group-hover:to-[#F5A623]/5 flex items-center justify-center text-2xl mb-4 transition-all duration-300">
                {item.icon || '✓'}
              </div>
              <h3 className="font-bold text-[#0B2560] text-base mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
