'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FaqItem {
  q?: string;
  a?: string;
}

interface FaqData {
  headline?: string;
  items?: FaqItem[];
}

export default function FaqSection({ data }: { data: FaqData }) {
  const {
    headline = 'Frequently Asked Questions',
    items = [],
  } = data;

  const [open, setOpen] = useState<number | null>(0);

  if (!items.length) return null;

  return (
    <section className="bg-white py-14 md:py-20">
      <div className="max-w-3xl mx-auto px-5">
        <div className="text-center mb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#3B82C4] mb-3">
            Got Questions?
          </p>
          <h2 className="text-2xl md:text-4xl font-extrabold text-[#0B2560]">{headline}</h2>
        </div>

        <div className="space-y-3">
          {items.map((item, i) => (
            <div
              key={i}
              className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
                open === i
                  ? 'border-[#3B82C4]/40 shadow-md shadow-[#3B82C4]/10'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left gap-3"
              >
                <span className={`font-semibold text-sm md:text-base transition-colors ${open === i ? 'text-[#0B2560]' : 'text-gray-700'}`}>
                  {item.q}
                </span>
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-[#3B82C4] transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`}
                />
              </button>

              {open === i && (
                <div className="px-5 pb-5">
                  <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
