'use client';

import { useState } from 'react';

export default function FAQAccordion({ data }: { data: any }) {
  const {
    headline = 'Frequently Asked Questions',
    viewAllText = 'View all FAQs',
    viewAllHref = '#',
    faqs = [],
  } = data || {};

  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-10 grid md:grid-cols-[1fr_2fr] gap-12 items-start">
        {/* LEFT */}
        <div>
          <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-[#0B2560]">
            {headline}
          </h2>
          <a href={viewAllHref} className="mt-4 inline-flex items-center gap-1 text-[#3B82C4] font-semibold text-sm hover:text-[#0B2560] transition">
            {viewAllText} →
          </a>
        </div>

        {/* RIGHT */}
        <div className="space-y-3">
          {faqs.map((faq: any, i: number) => (
            <div
              key={i}
              className="border border-gray-200 rounded-xl overflow-hidden"
            >
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="font-semibold text-[#0B2560] text-sm pr-4">{faq.question}</span>
                <span className={`text-[#0B2560] text-xl font-light transition-transform shrink-0 ${open === i ? 'rotate-45' : ''}`}>
                  +
                </span>
              </button>
              {open === i && (
                <div className="px-5 pb-5">
                  <p className="text-gray-600 text-sm leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
