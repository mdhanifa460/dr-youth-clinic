import { connectDB } from './mongodb';
import { getSettings } from '../models/Settings';

export type AnalyticsConfig = {
  ga4Id: string;
  metaPixelId: string;
  gtmId: string;
  clarityId: string;
  hotjarId: string;
  searchConsoleId: string;
};

export async function getAnalyticsConfig(): Promise<AnalyticsConfig> {
  try {
    await connectDB();
    const settings = await getSettings();
    return {
      ga4Id:           settings.analytics?.ga4Id           || '',
      metaPixelId:     settings.analytics?.metaPixelId     || '',
      gtmId:           settings.analytics?.gtmId           || '',
      clarityId:       settings.analytics?.clarityId       || '',
      hotjarId:        settings.analytics?.hotjarId        || '',
      searchConsoleId: settings.analytics?.searchConsoleId || '',
    };
  } catch {
    return { ga4Id: '', metaPixelId: '', gtmId: '', clarityId: '', hotjarId: '', searchConsoleId: '' };
  }
}
