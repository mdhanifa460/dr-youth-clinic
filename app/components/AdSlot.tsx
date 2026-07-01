import { getAdsConfig, ADS_SLOT_LABELS, type AdSlotKey } from '@/app/lib/adsConfig';
import AdSlotClient from './AdSlotClient';

interface Props {
  slotKey: AdSlotKey;
  className?: string;
}

export default async function AdSlot({ slotKey, className = '' }: Props) {
  const config = await getAdsConfig();

  if (!config.enabled) return null;

  const slot = config.slots[slotKey];
  if (!slot?.enabled) return null;

  const label = ADS_SLOT_LABELS[slotKey];

  return (
    <div className={`w-full ${className}`}>
      <div className="max-w-4xl mx-auto px-6">
        {/* Label */}
        <p className="text-[9px] font-semibold tracking-[0.2em] text-gray-300 uppercase text-center mb-2 select-none">
          Advertisement
        </p>

        {/* Ad container */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {config.testMode || !config.publisherId || !slot.slotId ? (
            /* Placeholder shown in test mode or when not configured */
            <div className="flex flex-col items-center justify-center py-8 px-6 bg-gradient-to-r from-gray-50 to-gray-100 min-h-[100px]">
              <div className="w-10 h-10 rounded-2xl bg-[#0B2560]/10 flex items-center justify-center mb-3">
                <span className="text-xl">📣</span>
              </div>
              <p className="text-xs font-bold text-gray-400 text-center">
                Ad Slot: <span className="text-[#0B2560]">{label}</span>
              </p>
              <p className="text-[10px] text-gray-300 mt-1 text-center">
                {!config.publisherId
                  ? 'Add your Publisher ID in Admin → Settings → Ads'
                  : !slot.slotId
                  ? 'Add the Ad Unit ID in Admin → Settings → Ads'
                  : 'Test mode — real ads will appear when disabled'}
              </p>
            </div>
          ) : (
            /* Real AdSense unit */
            <AdSlotClient
              publisherId={config.publisherId}
              slotId={slot.slotId}
              className="p-4"
            />
          )}
        </div>
      </div>
    </div>
  );
}
