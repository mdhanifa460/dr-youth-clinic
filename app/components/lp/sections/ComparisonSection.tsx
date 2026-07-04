import { CheckCircle, XCircle } from 'lucide-react';

interface ComparisonRow {
  label?: string;
  us?: boolean;
  others?: boolean;
}

interface ComparisonData {
  headline?: string;
  badge?: string;
  usLabel?: string;
  othersLabel?: string;
  rows?: ComparisonRow[];
  ctaText?: string;
}

const DEFAULT_ROWS: ComparisonRow[] = [
  { label: 'Certified Dermatologist',        us: true,  others: false },
  { label: 'FDA-Approved Equipment',          us: true,  others: false },
  { label: 'Personalised Treatment Protocol', us: true,  others: false },
  { label: 'Free Initial Consultation',       us: true,  others: false },
  { label: 'Post-Treatment Support',          us: true,  others: false },
  { label: 'Zero-Cost EMI Available',         us: true,  others: false },
  { label: 'Results Within 4–8 Sessions',     us: true,  others: false },
];

export default function ComparisonSection({ data }: { data: ComparisonData }) {
  const {
    headline    = 'Why DR Youth Clinic?',
    badge       = 'The Smart Choice',
    usLabel     = 'DR Youth Clinic',
    othersLabel = 'Other Clinics',
    rows        = [],
    ctaText     = 'Book Free Consultation',
  } = data;

  const rowsToShow = rows.length ? rows : DEFAULT_ROWS;

  return (
    <section className="bg-[#f6faff] py-14 md:py-20">
      <div className="max-w-3xl mx-auto px-5">
        <div className="text-center mb-10">
          <span className="inline-block text-[10px] font-extrabold uppercase tracking-[0.25em] text-[#F5A623] bg-[#F5A623]/10 px-3 py-1.5 rounded-full mb-4">
            {badge}
          </span>
          <h2 className="text-2xl md:text-4xl font-extrabold text-[#0B2560]">{headline}</h2>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_auto_auto] bg-[#0B2560] text-white text-xs font-extrabold uppercase tracking-wider px-5 py-3.5 gap-4">
            <span>Feature</span>
            <span className="w-28 text-center text-[#F5A623]">{usLabel}</span>
            <span className="w-24 text-center text-white/50">{othersLabel}</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-50">
            {rowsToShow.map((row, i) => (
              <div
                key={i}
                className={`grid grid-cols-[1fr_auto_auto] px-5 py-4 gap-4 items-center transition-colors ${
                  i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                }`}
              >
                <span className="text-sm font-semibold text-gray-700">{row.label}</span>
                <div className="w-28 flex justify-center">
                  {row.us !== false ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                      <CheckCircle size={13} /> Yes
                    </span>
                  ) : (
                    <XCircle size={18} className="text-gray-300" />
                  )}
                </div>
                <div className="w-24 flex justify-center">
                  {row.others ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                      <CheckCircle size={13} /> Yes
                    </span>
                  ) : (
                    <XCircle size={18} className="text-red-300" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer CTA */}
          <div className="px-5 py-6 bg-gradient-to-r from-[#0B2560]/5 to-[#3B82C4]/5 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500 mb-4">
              Experience the DR Youth difference — <span className="font-semibold text-[#0B2560]">first consultation is always free.</span>
            </p>
            <button
              onClick={() => document.getElementById('lp-form')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-2 bg-[#0B2560] hover:bg-[#1a3a7a] text-white font-extrabold px-8 py-3.5 rounded-2xl text-sm shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              {ctaText} →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
