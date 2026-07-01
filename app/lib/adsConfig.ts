import { unstable_cache } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import { HomepageSection } from '@/app/models/HomepageSection';
import { DEFAULT_ADS_CONFIG, type AdsConfig } from './adsConstants';

export { DEFAULT_ADS_CONFIG, ADS_SLOT_LABELS, type AdSlotKey, type AdsConfig } from './adsConstants';

export const getAdsConfig = unstable_cache(
  async (): Promise<AdsConfig> => {
    try {
      await connectDB();
      const doc = await HomepageSection.findOne({ sectionKey: 'ads_config' } as any).lean() as any;
      if (!doc?.data) return DEFAULT_ADS_CONFIG;
      return { ...DEFAULT_ADS_CONFIG, ...doc.data, slots: { ...DEFAULT_ADS_CONFIG.slots, ...doc.data.slots } };
    } catch {
      return DEFAULT_ADS_CONFIG;
    }
  },
  ['ads-config-v1'],
  { revalidate: 300, tags: ['ads-config'] }
);
