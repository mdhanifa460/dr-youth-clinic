export type AdSlotKey =
  | 'home_mid'
  | 'blog_inline'
  | 'blog_sidebar'
  | 'offers_top'
  | 'doctors_bottom';

export interface AdsConfig {
  enabled: boolean;
  testMode: boolean;
  publisherId: string;
  slots: Record<AdSlotKey, { slotId: string; enabled: boolean }>;
}

export const ADS_SLOT_LABELS: Record<AdSlotKey, string> = {
  home_mid:        'Homepage — Between Stats & Services',
  blog_inline:     'Blog Article — Before Article Body',
  blog_sidebar:    'Blog Article — Right Sidebar',
  offers_top:      'Offers Page — Above Offers Grid',
  doctors_bottom:  'Doctors Page — Below Team Grid',
};

export const DEFAULT_ADS_CONFIG: AdsConfig = {
  enabled:     false,
  testMode:    true,
  publisherId: '',
  slots: {
    home_mid:       { slotId: '', enabled: true },
    blog_inline:    { slotId: '', enabled: true },
    blog_sidebar:   { slotId: '', enabled: false },
    offers_top:     { slotId: '', enabled: true },
    doctors_bottom: { slotId: '', enabled: false },
  },
};
