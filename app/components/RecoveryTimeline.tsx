import { CheckCircle } from 'lucide-react';

// Fallback recovery-timeline template used when a service hasn't set its own
// Service.recoveryStages (Admin → Services → Treatment Journey).
const DEFAULT_RECOVERY_STAGES = [
  { phase: 'Day 1', icon: '🛌', label: 'Immediate', description: 'Mild redness or swelling is normal. Avoid sun exposure.' },
  { phase: 'Days 2–3', icon: '💧', label: 'Healing', description: 'Skin settles. Follow aftercare routine provided by your doctor.' },
  { phase: 'Week 1', icon: '🌱', label: 'Recovery', description: 'Most side effects resolve. Light activity resumed.' },
  { phase: 'Month 1+', icon: '✨', label: 'Results', description: 'Full results become visible. Follow-up appointment recommended.' },
];

// Extracted from the service detail page's inline "Recovery Timeline" JSX so
// the exact same markup/styling (incl. the default-stages fallback) can be
// reused by the Content Block Builder's "Recovery Timeline" reference block
// (app/components/contentblocks/BlockRenderer.tsx) without duplicating it.
export default function RecoveryTimeline({
  recoveryTime,
  stages,
}: {
  recoveryTime?: string;
  stages?: Array<{ phase: string; icon: string; label: string; description?: string }>;
}) {
  if (!recoveryTime?.trim()) return null;

  return (
    <div>
      <h2 className="text-2xl font-headline font-bold text-[#0B2560] mb-5">Recovery Timeline</h2>
      <div className="rounded-3xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <CheckCircle size={18} className="text-green-600" />
          </div>
          <div>
            <p className="font-bold text-green-800 text-sm">Total recovery: <span className="text-[#0B2560]">{recoveryTime}</span></p>
            <p className="text-green-600 text-xs">Most patients return to daily activities quickly</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-4 gap-3">
          {(stages?.length ? stages : DEFAULT_RECOVERY_STAGES).map((phase, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-green-100 text-center">
              <div className="text-2xl mb-1.5">{phase.icon}</div>
              <p className="font-bold text-[#0B2560] text-xs">{phase.phase}</p>
              <p className="text-green-600 text-[10px] font-semibold mb-1.5">{phase.label}</p>
              <p className="text-gray-500 text-[11px] leading-relaxed">{phase.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
