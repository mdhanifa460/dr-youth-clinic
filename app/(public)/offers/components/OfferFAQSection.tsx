'use client';

import { useState } from 'react';
import { ChevronDown, CheckCircle } from 'lucide-react';

// Reframes the site's real Terms & Conditions (unchanged content, just
// presented as Q&A) rather than inventing new, unverified claims.
const FAQ_ITEMS = [
  {
    q: 'How long are these offers valid?',
    a: 'All offers are valid for a limited period and subject to availability.',
  },
  {
    q: 'Can I combine an offer with another discount?',
    a: 'Packages cannot be combined with other ongoing discounts or promotions.',
  },
  {
    q: 'Do I need to book in advance to get the offer price?',
    a: 'Bookings must be made in advance to avail the offer price.',
  },
  {
    q: 'Can I share or transfer an offer to someone else?',
    a: 'Offers are non-transferable and valid for one patient per transaction.',
  },
  {
    q: 'Can an offer change or be withdrawn after I see it?',
    a: 'DR Youth Clinic reserves the right to modify or withdraw any offer without prior notice.',
  },
  {
    q: 'Is every offer guaranteed to be right for me?',
    a: 'All treatments are subject to doctor consultation and suitability assessment.',
  },
];

export default function OfferFAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="bg-white py-12">
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="text-lg font-headline font-bold text-[#0B2560] mb-1 flex items-center gap-2">
          <CheckCircle size={18} className="text-[#3B82C4]" /> Terms & Frequently Asked Questions
        </h2>
        <p className="text-sm text-gray-400 mb-6">Everything you should know before booking an offer.</p>

        <div className="space-y-2.5">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={i} className="offer-gradient-border rounded-2xl overflow-hidden bg-white">
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="font-semibold text-[#0B2560] text-sm leading-snug">{item.q}</span>
                  <ChevronDown size={16} className={`text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4">
                    <p className="text-gray-500 text-sm leading-relaxed border-t border-gray-100 pt-3">{item.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
