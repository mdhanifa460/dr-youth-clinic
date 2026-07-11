import { CheckCircle } from 'lucide-react';

interface CompareService {
  _id: string;
  name: string;
  price: number;
  duration: number;
  sessionsRequired?: string;
  recoveryTime?: string;
  painLevel?: string;
  idealFor?: string[];
}

const ROWS: { label: string; render: (s: CompareService) => string }[] = [
  { label: 'Starting Price', render: (s) => `₹${s.price?.toLocaleString('en-IN') ?? '—'}` },
  { label: 'Session Duration', render: (s) => `${s.duration ?? '—'} min` },
  { label: 'Sessions Needed', render: (s) => s.sessionsRequired || 'Consult' },
  { label: 'Recovery / Downtime', render: (s) => s.recoveryTime || 'Minimal' },
  { label: 'Pain Level', render: (s) => s.painLevel || 'Not specified' },
  { label: 'Suitable For', render: (s) => s.idealFor?.slice(0, 2).join(', ') || 'Most skin/hair types' },
];

export default function TreatmentComparison({ current, alternatives }: { current: CompareService; alternatives: CompareService[] }) {
  const services = [current, ...alternatives];
  if (services.length < 2) return null;

  return (
    <div>
      <h2 className="text-2xl font-headline font-bold text-[#0B2560] mb-2">How Does {current.name} Compare?</h2>
      <p className="text-gray-500 text-sm mb-6">A side-by-side look at similar treatments, so you can make an informed choice.</p>

      <div className="overflow-x-auto rounded-3xl border border-blue-50">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="bg-[#0B2560] text-white">
              <th className="text-left px-4 py-3.5 text-xs font-semibold uppercase tracking-wide">Compare</th>
              {services.map((s) => (
                <th
                  key={s._id}
                  className={`px-4 py-3.5 text-xs font-bold uppercase tracking-wide text-center ${
                    s._id === current._id ? 'text-[#F5A623]' : 'text-white/70'
                  }`}
                >
                  {s.name}
                  {s._id === current._id && (
                    <span className="block text-[9px] font-semibold normal-case text-[#F5A623]/80 mt-0.5">This treatment</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {ROWS.map((row, i) => (
              <tr key={row.label} className={i % 2 === 0 ? 'bg-white' : 'bg-[#f6faff]/50'}>
                <td className="px-4 py-3.5 text-xs font-semibold text-gray-500">{row.label}</td>
                {services.map((s) => (
                  <td
                    key={s._id}
                    className={`px-4 py-3.5 text-center text-xs font-bold ${
                      s._id === current._id ? 'text-[#0B2560] bg-[#F5A623]/5' : 'text-gray-600'
                    }`}
                  >
                    {row.render(s)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-start gap-2 mt-3 text-xs text-gray-400">
        <CheckCircle size={13} className="text-[#3B82C4] mt-0.5 shrink-0" />
        <span>Every treatment plan is finalised by your doctor based on your specific skin/hair assessment — figures above are typical ranges.</span>
      </div>
    </div>
  );
}
