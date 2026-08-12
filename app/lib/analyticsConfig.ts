import { connectDB } from './mongodb';
import { getSettings } from '../models/Settings';
import { extractSearchConsoleToken } from './searchConsole';

export type AnalyticsConfig = {
  gtmEnabled: boolean;
  gtmId: string;
  gtmAuth: string;
  gtmPreview: string;
  // True only when GTM is actually going to load (enabled + has an ID).
  // The single source of truth for "should GA4/Meta Pixel load directly
  // or defer to GTM" — computed once here rather than re-derived
  // ad-hoc in layout.tsx and the admin page.
  gtmActive: boolean;
  ga4Id: string;
  metaPixelId: string;
  clarityId: string;
  hotjarId: string;
  searchConsoleId: string;
};

const EMPTY_CONFIG: AnalyticsConfig = {
  gtmEnabled: false, gtmId: '', gtmAuth: '', gtmPreview: '', gtmActive: false,
  ga4Id: '', metaPixelId: '', clarityId: '', hotjarId: '', searchConsoleId: '',
};

export async function getAnalyticsConfig(): Promise<AnalyticsConfig> {
  try {
    await connectDB();
    const settings = await getSettings();
    const gtmEnabled = settings.analytics?.gtmEnabled ?? true;
    const gtmId = settings.analytics?.gtmId || '';
    return {
      gtmEnabled,
      gtmId,
      gtmAuth:         settings.analytics?.gtmAuth         || '',
      gtmPreview:      settings.analytics?.gtmPreview      || '',
      gtmActive:       gtmEnabled && !!gtmId,
      ga4Id:           settings.analytics?.ga4Id           || '',
      metaPixelId:     settings.analytics?.metaPixelId     || '',
      clarityId:       settings.analytics?.clarityId       || '',
      hotjarId:        settings.analytics?.hotjarId        || '',
      // Defensive, not just documented: self-heals if an admin ever pastes
      // the full <meta ...> tag instead of just the token (see
      // searchConsole.ts) — renders correctly in layout.tsx either way,
      // without needing another admin save.
      searchConsoleId: extractSearchConsoleToken(settings.analytics?.searchConsoleId || ''),
    };
  } catch {
    return EMPTY_CONFIG;
  }
}
