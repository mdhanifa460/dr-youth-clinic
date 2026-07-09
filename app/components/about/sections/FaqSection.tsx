import Link from 'next/link';

interface FaqItem { question: string; answer: string }
interface FaqData { headline?: string; subheading?: string }

export default function FaqSection({ data, faqs }: { data: FaqData; faqs: FaqItem[] }) {
  const { headline = 'Common Questions', subheading } = data;
  if (!faqs.length) return null;

  return (
    <section className="bg-white py-14 md:py-20">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#F5A623] mb-2">Questions?</p>
          <h2 className="text-2xl md:text-4xl font-headline font-extrabold text-[#0B2560]">{headline}</h2>
          {subheading && <p className="text-gray-500 mt-3 text-sm">{subheading}</p>}
        </div>
        <div className="space-y-3">
          {faqs.slice(0, 5).map((f, i) => (
            <details key={i} className="group bg-[#f6faff] rounded-2xl px-5 py-4 ring-1 ring-[#e8eff7]">
              <summary className="flex items-center justify-between cursor-pointer font-semibold text-[#0B2560] text-sm">
                {f.question}
                <span className="text-gray-400 group-open:rotate-45 transition-transform ml-3 shrink-0">+</span>
              </summary>
              <p className="text-gray-500 text-sm mt-3 leading-relaxed">{f.answer}</p>
            </details>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link href="/faqs" className="inline-flex items-center gap-2 text-sm font-bold text-[#0B2560] hover:text-[#3B82C4] transition">
            View All FAQs →
          </Link>
        </div>
      </div>
    </section>
  );
}
