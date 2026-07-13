// Extracted from the service detail page's inline FAQ JSX so the exact same
// markup/styling can be reused by the Content Block Builder's "FAQ" reference
// block (app/components/contentblocks/BlockRenderer.tsx) without duplicating it.
export default function FaqAccordion({ faq }: { faq?: Array<{ question: string; answer: string }> }) {
  if (!faq?.length) return null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-2xl font-headline font-bold text-[#0B2560]">Frequently Asked Questions</h2>
        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 uppercase tracking-wide hidden sm:block">Rich Result</span>
      </div>
      <div className="space-y-3">
        {faq.map((item, i) => (
          <details key={i} className="group border border-gray-100 rounded-2xl overflow-hidden hover:border-[#3B82C4]/30 transition-colors">
            <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-semibold text-[#0B2560] text-sm leading-snug [list-style:none] [&::-webkit-details-marker]:hidden select-none hover:bg-[#f6faff] transition-colors">
              <span className="pr-4">{item.question}</span>
              <span className="text-[#3B82C4] text-xl font-light shrink-0 group-open:rotate-45 transition-transform duration-200 inline-block">+</span>
            </summary>
            <div className="px-5 pb-4 pt-1 text-gray-600 text-sm leading-relaxed border-t border-gray-50">
              {item.answer}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
