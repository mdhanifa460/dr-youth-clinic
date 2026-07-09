'use client';

import { useState } from 'react';
import { IndianRupee, ChevronRight } from 'lucide-react';
import { useSiteConfig } from '@/app/components/SiteConfigContext';

interface Props {
  basePrice: number;
  sessionsRequired?: string;
  serviceName: string;
}

function parseSessionCount(sessionsRequired?: string): number {
  if (!sessionsRequired) return 1;
  const match = sessionsRequired.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

export default function CostEstimator({ basePrice, sessionsRequired, serviceName }: Props) {
  const siteConfig = useSiteConfig();
  const defaultSessions = parseSessionCount(sessionsRequired);
  const [sessions, setSessions] = useState(defaultSessions);
  const [includeConsult, setIncludeConsult] = useState(false);

  const consultFee = siteConfig.consultationFee;
  const subtotal = basePrice * sessions;
  const total = subtotal + (includeConsult ? consultFee : 0);

  const savings = sessions >= 3 ? Math.round(total * 0.1) : sessions >= 5 ? Math.round(total * 0.15) : 0;
  const finalTotal = total - savings;

  return (
    <div className="rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
      <div className="bg-gradient-to-r from-[#7c3aed] to-[#5b21b6] px-6 py-4 text-white">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-0.5">Estimate</p>
        <h3 className="font-headline font-bold text-base">Personalised Cost Calculator</h3>
      </div>

      <div className="p-6 space-y-5">
        {/* Session slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-[#0B2560] uppercase tracking-wider">Number of Sessions</label>
            <span className="text-lg font-extrabold text-[#0B2560]">{sessions}</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={sessions}
            onChange={(e) => setSessions(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#0B2560] bg-gray-100"
          />
          <div className="flex justify-between text-[10px] text-gray-300 mt-1">
            <span>1</span><span>5</span><span>10</span>
          </div>
          {sessionsRequired && (
            <p className="text-[10px] text-gray-400 mt-1.5">Recommended: {sessionsRequired}</p>
          )}
        </div>

        {/* Consultation toggle */}
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm text-gray-600">Include initial consultation (₹{consultFee})</span>
          <div
            onClick={() => setIncludeConsult(!includeConsult)}
            className={`relative w-10 h-5 rounded-full transition-colors ${includeConsult ? 'bg-[#0B2560]' : 'bg-gray-200'}`}
          >
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${includeConsult ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
        </label>

        {/* Cost breakdown */}
        <div className="bg-[#f6faff] rounded-2xl p-4 space-y-2 border border-blue-50">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{sessions} × ₹{basePrice.toLocaleString('en-IN')}</span>
            <span className="font-semibold text-gray-700">₹{subtotal.toLocaleString('en-IN')}</span>
          </div>
          {includeConsult && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Consultation</span>
              <span className="font-semibold text-gray-700">₹{consultFee.toLocaleString('en-IN')}</span>
            </div>
          )}
          {savings > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-green-600">Package discount</span>
              <span className="font-semibold text-green-600">-₹{savings.toLocaleString('en-IN')}</span>
            </div>
          )}
          <div className="border-t border-blue-100 pt-2 flex justify-between">
            <span className="font-bold text-[#0B2560] text-sm">Estimated Total</span>
            <div className="flex items-center gap-1 text-[#0B2560]">
              <IndianRupee size={14} />
              <span className="text-xl font-extrabold">{finalTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {savings > 0 && (
          <p className="text-center text-xs text-green-600 font-semibold bg-green-50 py-2 rounded-xl">
            🎉 Multi-session package saves you ₹{savings.toLocaleString('en-IN')}
          </p>
        )}

        <a
          href="/book"
          className="flex items-center justify-center gap-2 w-full bg-[#0B2560] text-white py-3.5 rounded-2xl font-bold text-sm hover:-translate-y-0.5 transition shadow-lg"
        >
          Book & Confirm Cost <ChevronRight size={14} />
        </a>
        <p className="text-center text-[10px] text-gray-400">Final cost confirmed at your free consultation</p>
      </div>
    </div>
  );
}
