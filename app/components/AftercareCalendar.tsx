import { Clock } from 'lucide-react';

interface AftercareItem {
  activity: string;
  waitPeriod?: string;
  guidance: string;
}

export default function AftercareCalendar({ items, serviceName }: { items: AftercareItem[]; serviceName: string }) {
  if (!items?.length) return null;

  return (
    <div>
      <h2 className="text-2xl font-headline font-bold text-[#0B2560] mb-2">Aftercare Guide</h2>
      <p className="text-gray-500 text-sm mb-6">Everyday questions patients ask after {serviceName} — answered upfront.</p>

      <div className="relative">
        <div className="absolute left-5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-[#0B2560]/15 to-transparent hidden sm:block" />
        <div className="space-y-4">
          {items.map((item, i) => (
            <div key={i} className="flex gap-4 relative">
              <div className="shrink-0 w-10 h-10 rounded-full bg-white border-2 border-[#0B2560]/15 text-[#0B2560] flex items-center justify-center z-10">
                <Clock size={15} />
              </div>
              <div className="flex-1 bg-[#f6faff] rounded-2xl p-4 border border-blue-50">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="font-bold text-[#0B2560] text-sm">{item.activity}</h3>
                  {item.waitPeriod && (
                    <span className="text-[10px] font-bold text-[#F5A623] bg-[#F5A623]/10 px-2 py-0.5 rounded-full uppercase tracking-wide">
                      {item.waitPeriod}
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-sm leading-relaxed">{item.guidance}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
