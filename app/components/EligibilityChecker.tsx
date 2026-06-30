'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, ChevronRight, RotateCcw } from 'lucide-react';

interface Props {
  serviceName: string;
  idealFor: string[];
}

const BASE_QUESTIONS = [
  { id: 'age', text: 'Are you 18 years or older?', required: true },
  { id: 'infection', text: 'Are you free from active skin infections in the treatment area?', required: true },
  { id: 'pregnant', text: 'Are you not pregnant or breastfeeding?', required: true },
  { id: 'medications', text: 'Are you not on blood thinners or immunosuppressants?', required: false },
  { id: 'realistic', text: 'Do you have realistic expectations and understand results may take multiple sessions?', required: false },
];

type Answer = 'yes' | 'no' | null;

export default function EligibilityChecker({ serviceName, idealFor }: Props) {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  const questions = BASE_QUESTIONS;
  const current = questions[step];

  function answer(val: Answer) {
    const updated = { ...answers, [current.id]: val };
    setAnswers(updated);
    if (step + 1 < questions.length) {
      setStep(step + 1);
    } else {
      setDone(true);
    }
  }

  const eligible = done
    ? BASE_QUESTIONS.filter((q) => q.required).every((q) => answers[q.id] === 'yes')
    : false;

  function reset() {
    setAnswers({});
    setStep(0);
    setDone(false);
  }

  return (
    <div className="rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="bg-gradient-to-r from-[#0B2560] to-[#1e3a8a] px-6 py-4 text-white">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-0.5">Quick Check</p>
        <h3 className="font-headline font-bold text-base">Am I a Candidate for {serviceName}?</h3>
      </div>

      <div className="p-6">
        {!done ? (
          <div>
            {/* Progress */}
            <div className="flex gap-1 mb-5">
              {questions.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all ${i <= step ? 'bg-[#0B2560]' : 'bg-gray-100'}`}
                />
              ))}
            </div>

            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
              Question {step + 1} of {questions.length}
            </p>
            <p className="font-semibold text-[#0B2560] text-[15px] leading-snug mb-5">{current.text}</p>

            <div className="flex gap-3">
              <button
                onClick={() => answer('yes')}
                className="flex-1 flex items-center justify-center gap-2 bg-[#0B2560] text-white py-3 rounded-2xl font-bold text-sm hover:bg-[#0a1f50] transition"
              >
                <CheckCircle size={14} /> Yes
              </button>
              <button
                onClick={() => answer('no')}
                className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-100 text-gray-600 py-3 rounded-2xl font-semibold text-sm hover:bg-gray-50 transition"
              >
                <XCircle size={14} /> No
              </button>
            </div>
          </div>
        ) : eligible ? (
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto">
              <CheckCircle size={28} className="text-green-500" />
            </div>
            <h4 className="font-bold text-[#0B2560] text-lg">You Look Like a Great Candidate!</h4>
            <p className="text-gray-500 text-sm leading-relaxed">
              Based on your answers, {serviceName} may be suitable for you. Book a free consultation for a professional assessment.
            </p>
            {idealFor.length > 0 && (
              <div className="text-left bg-[#f6faff] rounded-2xl p-4 mt-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">This treatment is ideal for</p>
                <div className="flex flex-wrap gap-1.5">
                  {idealFor.map((tag, i) => (
                    <span key={i} className="text-xs bg-white border border-blue-50 text-[#0B2560] px-2.5 py-1 rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <a href="/book" className="flex-1 flex items-center justify-center gap-1.5 bg-[#0B2560] text-white py-3 rounded-2xl font-bold text-sm hover:-translate-y-0.5 transition">
                Book Now <ChevronRight size={13} />
              </a>
              <button onClick={reset} className="flex items-center justify-center w-11 h-11 rounded-2xl border border-gray-100 text-gray-400 hover:bg-gray-50 transition">
                <RotateCcw size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
              <XCircle size={28} className="text-amber-500" />
            </div>
            <h4 className="font-bold text-[#0B2560] text-lg">Consult First</h4>
            <p className="text-gray-500 text-sm leading-relaxed">
              Some of your answers suggest you should speak with a specialist before booking {serviceName}. We'll guide you to the best option.
            </p>
            <div className="flex gap-2 pt-2">
              <a href="/book" className="flex-1 flex items-center justify-center gap-1.5 bg-[#F5A623] text-[#0B2560] py-3 rounded-2xl font-bold text-sm hover:-translate-y-0.5 transition">
                Free Consultation <ChevronRight size={13} />
              </a>
              <button onClick={reset} className="flex items-center justify-center w-11 h-11 rounded-2xl border border-gray-100 text-gray-400 hover:bg-gray-50 transition">
                <RotateCcw size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
