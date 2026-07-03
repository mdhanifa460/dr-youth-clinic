'use client';

import { useState } from 'react';
import { IndianRupee, ChevronDown } from 'lucide-react';

interface Props {
  price: number;
}

function fmt(n: number) {
  return Math.round(n).toLocaleString('en-IN');
}

const EMI_OPTIONS = [
  { months: 3, label: '3 Months' },
  { months: 6, label: '6 Months' },
  { months: 12, label: '12 Months' },
  { months: 24, label: '24 Months' },
];

export default function EMICalculator({ price }: Props) {
  const [open, setOpen] = useState(false);
  const safeMin = Math.min(3000, price);
  const [selected, setSelected] = useState(price);

  return (
    <div className="rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
      {/* Toggle header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#0B2560] to-[#1a3a7a] text-white"
        aria-expanded={open}
      >
        <div className="text-left">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-0.5">
            Flexible Payments
          </p>
          <h3 className="font-headline font-bold text-base leading-snug">
            Make It Affordable — EMI Options
          </h3>
        </div>
        <ChevronDown
          size={18}
          className={`text-[#F5A623] transition-transform duration-300 shrink-0 ml-3 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Expandable body */}
      {open && (
        <div className="p-6 space-y-5">
          {/* Budget slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-[#0B2560] uppercase tracking-wider">
                Adjust Price
              </label>
              <span className="flex items-center gap-0.5 text-xl font-extrabold text-[#0B2560]">
                <IndianRupee size={14} />
                {fmt(selected)}
              </span>
            </div>
            <input
              type="range"
              min={safeMin}
              max={price}
              step={500}
              value={selected}
              onChange={(e) => setSelected(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#0B2560] bg-gray-100"
            />
            <div className="flex justify-between text-[10px] text-gray-300 mt-1">
              <span>₹{fmt(safeMin)}</span>
              <span>₹{fmt(price)}</span>
            </div>
          </div>

          {/* EMI breakdown grid */}
          <div className="grid grid-cols-2 gap-3">
            {EMI_OPTIONS.map(({ months, label }) => (
              <div
                key={months}
                className="bg-[#f6faff] rounded-2xl p-4 border border-blue-50 text-center hover:border-[#3B82C4]/30 hover:shadow-sm transition-all"
              >
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  {label}
                </p>
                <p className="flex items-center justify-center gap-0.5 font-extrabold text-[#0B2560] text-lg leading-none">
                  <IndianRupee size={13} />
                  {fmt(selected / months)}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">/month</p>
              </div>
            ))}
          </div>

          {/* 0% interest highlight */}
          <div className="bg-[#F5A623]/10 rounded-2xl px-5 py-3.5 border border-[#F5A623]/20 flex items-start gap-2.5">
            <span className="text-base shrink-0">🏦</span>
            <p className="text-xs font-semibold text-[#0B2560] leading-relaxed">
              0% interest available with{' '}
              <span className="font-bold">HDFC, ICICI, Axis Bank</span> credit cards
            </p>
          </div>

          <p className="text-center text-[10px] text-gray-400 leading-relaxed">
            EMI availability subject to bank approval. Speak to our team for details.
          </p>
        </div>
      )}
    </div>
  );
}
