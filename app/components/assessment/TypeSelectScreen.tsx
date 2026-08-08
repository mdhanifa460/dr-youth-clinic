'use client';

// Body-area selector — the new first real step in the Pre-Consultation
// Assessment flow (architecture review §09B). Deliberately reuses Plan My
// Journey's existing goal-picker visual language (rounded-3xl gradient
// cards, icon + label + "Choose →") rather than inventing a new look —
// only the color mechanism changes, from Tailwind gradient class strings to
// admin-configured hex (colorFrom/colorTo), so an admin can set colors from
// a picker instead of hand-typing Tailwind class names.
import { ArrowRight } from 'lucide-react';

export interface AssessmentTypeOption {
  key: string;
  label: string;
  icon: string;
  colorFrom: string;
  colorTo: string;
}

export default function TypeSelectScreen({
  types,
  onPick,
}: {
  types: AssessmentTypeOption[];
  onPick: (key: string) => void;
}) {
  return (
    <div className="py-6 md:py-10">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#0B2560] mb-2 tracking-tight">
          What would you like assessed?
        </h2>
        <p className="text-gray-500 text-sm md:text-base">
          We'll ask a few questions to prepare your consultation.
        </p>
      </div>
      <div className={`grid grid-cols-1 ${types.length > 1 ? 'sm:grid-cols-2' : ''} gap-4 max-w-lg mx-auto`}>
        {types.map((t) => (
          <button
            key={t.key}
            onClick={() => onPick(t.key)}
            style={{ background: `linear-gradient(135deg, ${t.colorFrom}, ${t.colorTo})` }}
            className="relative overflow-hidden rounded-3xl p-6 text-left text-white shadow-lg transition-transform hover:-translate-y-1"
          >
            <span className="text-3xl">{t.icon}</span>
            <p className="font-extrabold text-lg mt-3">{t.label}</p>
            <p className="text-white/70 text-xs mt-1">Predefined clinical questions</p>
            <span className="inline-flex items-center gap-1 text-xs font-bold mt-4">
              Choose <ArrowRight size={12} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
