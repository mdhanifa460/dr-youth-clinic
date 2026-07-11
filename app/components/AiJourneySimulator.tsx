'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Loader2, Calendar } from 'lucide-react';
import { useSiteConfig } from '@/app/components/SiteConfigContext';

interface Phase {
  sessionRange: string;
  title: string;
  description: string;
}

interface Journey {
  summary: string;
  phases: Phase[];
  disclaimer: string;
}

export default function AiJourneySimulator({ serviceId, serviceName }: { serviceId: string; serviceName: string }) {
  const siteConfig = useSiteConfig();
  const [concern, setConcern] = useState('');
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [journey, setJourney] = useState<Journey | null>(null);

  async function simulate() {
    if (concern.trim().length < 3) {
      setError('Tell us a bit more about your concern first.');
      return;
    }
    setLoading(true);
    setError('');
    setJourney(null);
    try {
      const res = await fetch('/api/journey-simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId, concern, goal }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setError(`You've reached the simulation limit for now — please try again later, or book a ${siteConfig.consultationFree ? 'free ' : ''}consultation for a real treatment plan.`);
        return;
      }
      if (!data.success) {
        setError(data.message || 'Could not generate your journey right now.');
        return;
      }
      setJourney(data.data);
    } catch {
      setError('Something went wrong — please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-blue-50 bg-gradient-to-br from-[#f6faff] to-white p-6 md:p-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-[#0B2560] flex items-center justify-center shrink-0">
          <Sparkles size={18} className="text-[#F5A623]" />
        </div>
        <h2 className="text-xl font-headline font-bold text-[#0B2560]">Simulate Your {serviceName} Journey</h2>
      </div>
      <p className="text-gray-500 text-sm mb-5">
        Describe your specific concern and our AI will sketch out a personalised journey — a starting point before your real consultation.
      </p>

      {!journey && (
        <div className="space-y-3">
          <textarea
            value={concern}
            onChange={(e) => setConcern(e.target.value)}
            placeholder="e.g. Acne scars on both cheeks that have gotten darker over the last year…"
            rows={3}
            maxLength={300}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Your goal, optional — e.g. 'clearer skin before my wedding in 3 months'"
            maxLength={300}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            onClick={simulate}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-[#0B2560] text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:-translate-y-0.5 transition disabled:opacity-50 disabled:translate-y-0"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {loading ? 'Simulating…' : 'Simulate My Journey'}
          </button>
        </div>
      )}

      {journey && (
        <div className="space-y-5">
          <p className="text-gray-600 text-sm leading-relaxed italic">{journey.summary}</p>

          <div className="grid sm:grid-cols-2 gap-3">
            {journey.phases.map((p, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 border border-blue-50">
                <span className="text-[10px] font-bold text-[#F5A623] uppercase tracking-wider">{p.sessionRange}</span>
                <h3 className="font-bold text-[#0B2560] text-sm mt-1 mb-1.5">{p.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{p.description}</p>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <p className="text-amber-800 text-xs leading-relaxed">✨ {journey.disclaimer}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/book">
              <button className="inline-flex items-center gap-2 bg-[#F5A623] text-[#0B2560] px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:-translate-y-0.5 transition">
                <Calendar size={14} /> {siteConfig.consultationCta}
              </button>
            </Link>
            <button
              onClick={() => { setJourney(null); setConcern(''); setGoal(''); }}
              className="inline-flex items-center gap-2 border border-gray-200 text-gray-500 px-5 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition"
            >
              Try Another Concern
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
