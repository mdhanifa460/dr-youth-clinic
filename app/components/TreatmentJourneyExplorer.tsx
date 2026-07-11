'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Stethoscope, ChevronDown } from 'lucide-react';

interface Stage {
  stage: string;
  progressPercent: number;
  summary: string;
  doctorTip?: string;
  dos?: string[];
  donts?: string[];
  faqs?: { question: string; answer: string }[];
}

export default function TreatmentJourneyExplorer({ stages, serviceName }: { stages: Stage[]; serviceName: string }) {
  const [active, setActive] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  if (!stages?.length) return null;
  const current = stages[active];

  return (
    <div>
      <h2 className="text-2xl font-headline font-bold text-[#0B2560] mb-2">Explore Your {serviceName} Journey</h2>
      <p className="text-gray-500 text-sm mb-6">Click through each stage to see what to expect, day by day.</p>

      {/* Stage selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-hide">
        {stages.map((s, i) => (
          <button
            key={i}
            onClick={() => { setActive(i); setOpenFaq(null); }}
            className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition border ${
              i === active
                ? 'bg-[#0B2560] text-white border-[#0B2560]'
                : 'bg-white text-gray-500 border-gray-200 hover:border-[#0B2560] hover:text-[#0B2560]'
            }`}
          >
            {s.stage}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-blue-50 bg-[#f6faff] p-6 md:p-8 space-y-5">
        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs font-semibold text-gray-500 mb-1.5">
            <span>Recovery / Results Progress</span>
            <span className="text-[#0B2560] font-bold">{current.progressPercent}%</span>
          </div>
          <div className="h-2 bg-white rounded-full overflow-hidden border border-blue-50">
            <div
              className="h-full bg-gradient-to-r from-[#3B82C4] to-[#0B2560] rounded-full transition-all"
              style={{ width: `${current.progressPercent}%` }}
            />
          </div>
        </div>

        <p className="text-gray-700 text-sm leading-relaxed">{current.summary}</p>

        {current.doctorTip && (
          <div className="flex items-start gap-3 bg-white rounded-2xl p-4 border border-blue-50">
            <div className="w-8 h-8 rounded-lg bg-[#0B2560]/10 flex items-center justify-center shrink-0">
              <Stethoscope size={15} className="text-[#0B2560]" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-[#0B2560] uppercase tracking-wider mb-1">Doctor's Tip</p>
              <p className="text-gray-600 text-sm leading-relaxed">{current.doctorTip}</p>
            </div>
          </div>
        )}

        {(current.dos?.length || current.donts?.length) && (
          <div className="grid sm:grid-cols-2 gap-3">
            {!!current.dos?.length && (
              <div className="bg-white rounded-2xl p-4 border border-green-100">
                <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-2">Do's</p>
                <ul className="space-y-1.5">
                  {current.dos.map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                      <CheckCircle size={13} className="text-green-500 mt-0.5 shrink-0" /> {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!!current.donts?.length && (
              <div className="bg-white rounded-2xl p-4 border border-red-100">
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-2">Don'ts</p>
                <ul className="space-y-1.5">
                  {current.donts.map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                      <XCircle size={13} className="text-red-400 mt-0.5 shrink-0" /> {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {!!current.faqs?.length && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Common Questions at This Stage</p>
            {current.faqs.map((f, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left text-xs font-semibold text-[#0B2560]"
                >
                  {f.question}
                  <ChevronDown size={14} className={`text-gray-400 transition-transform shrink-0 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <p className="px-4 pb-3 text-xs text-gray-500 leading-relaxed">{f.answer}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
