export type AdminRole =
  | 'super_admin'
  | 'clinic_owner'
  | 'marketing_manager'
  | 'doctor'
  | 'receptionist'
  | 'content_editor'
  | 'finance_manager'
  | 'customer_support';

export type AdminModule =
  | 'dashboard'
  | 'intelligence'
  | 'bookings'
  | 'leads'
  | 'services'
  | 'doctors'
  | 'homepage'
  | 'locations'
  | 'offers'
  | 'results'
  | 'reviews'
  | 'blog'
  | 'seo'
  | 'landing-pages'
  | 'settings'
  | 'team'
  | 'videos'
  | 'ai-assessment'
  | 'ai'
  | 'stories'
  | 'faqs'
  | 'banners';

export type AccessLevel = 'full' | 'view' | 'none';

export const ROLE_PERMISSIONS: Record<AdminRole, Record<AdminModule, AccessLevel>> = {
  super_admin: {
    dashboard: 'full', intelligence: 'full', bookings: 'full', leads: 'full',
    services: 'full', doctors: 'full', homepage: 'full',
    locations: 'full', offers: 'full', results: 'full', reviews: 'full',
    blog: 'full', seo: 'full', 'landing-pages': 'full',
    settings: 'full', team: 'full', videos: 'full', 'ai-assessment': 'full', banners: 'full',
    ai: 'full',
    stories: 'full', faqs: 'full',
  },
  clinic_owner: {
    dashboard: 'full', intelligence: 'full', bookings: 'full', leads: 'full',
    services: 'full', doctors: 'full', homepage: 'full',
    locations: 'full', offers: 'full', results: 'full', reviews: 'full',
    blog: 'full', seo: 'full', 'landing-pages': 'full',
    settings: 'view', team: 'full', videos: 'full', 'ai-assessment': 'full', banners: 'full',
    ai: 'full',
    stories: 'full', faqs: 'full',
  },
  marketing_manager: {
    dashboard: 'view', intelligence: 'full', bookings: 'view', leads: 'full',
    services: 'full', doctors: 'view', homepage: 'full',
    locations: 'view', offers: 'full', results: 'full', reviews: 'full',
    blog: 'full', seo: 'full', 'landing-pages': 'full',
    settings: 'none', team: 'none', videos: 'full', 'ai-assessment': 'full', banners: 'full',
    ai: 'full',
    stories: 'full', faqs: 'full',
  },
  doctor: {
    dashboard: 'view', intelligence: 'none', bookings: 'view', leads: 'none',
    services: 'view', doctors: 'view', homepage: 'none',
    locations: 'none', offers: 'none', results: 'none', reviews: 'view',
    blog: 'none', seo: 'none', 'landing-pages': 'none',
    settings: 'none', team: 'none', videos: 'view', 'ai-assessment': 'full', banners: 'none',
    ai: 'none',
    stories: 'none', faqs: 'view',
  },
  receptionist: {
    dashboard: 'view', intelligence: 'none', bookings: 'full', leads: 'none',
    services: 'view', doctors: 'view', homepage: 'none',
    locations: 'view', offers: 'view', results: 'none', reviews: 'none',
    blog: 'none', seo: 'none', 'landing-pages': 'none',
    // Was 'services: view' before this feature had its own module — the
    // quiz page was reachable at that level, so 'none' here would be a
    // silent access regression, not an intentional policy change.
    settings: 'none', team: 'none', videos: 'none', 'ai-assessment': 'view', banners: 'none',
    ai: 'none',
    stories: 'none', faqs: 'view',
  },
  content_editor: {
    dashboard: 'view', intelligence: 'none', bookings: 'none', leads: 'none',
    services: 'full', doctors: 'view', homepage: 'full',
    locations: 'full', offers: 'view', results: 'full', reviews: 'view',
    blog: 'full', seo: 'full', 'landing-pages': 'full',
    // Was 'services: full' before this feature had its own module — content
    // editors could already edit quiz content at that level.
    settings: 'none', team: 'none', videos: 'full', 'ai-assessment': 'full', banners: 'full',
    ai: 'full',
    stories: 'full', faqs: 'full',
  },
  finance_manager: {
    dashboard: 'view', intelligence: 'none', bookings: 'view', leads: 'none',
    services: 'none', doctors: 'none', homepage: 'none',
    locations: 'none', offers: 'none', results: 'none', reviews: 'none',
    blog: 'none', seo: 'none', 'landing-pages': 'none',
    settings: 'none', team: 'none', videos: 'none', 'ai-assessment': 'none', banners: 'none',
    ai: 'none',
    stories: 'none', faqs: 'none',
  },
  customer_support: {
    dashboard: 'view', intelligence: 'none', bookings: 'view', leads: 'none',
    services: 'view', doctors: 'view', homepage: 'none',
    locations: 'view', offers: 'view', results: 'none', reviews: 'full',
    blog: 'none', seo: 'none', 'landing-pages': 'none',
    // Was 'services: view' before this feature had its own module.
    settings: 'none', team: 'none', videos: 'none', 'ai-assessment': 'view', banners: 'none',
    ai: 'none',
    stories: 'none', faqs: 'view',
  },
};

export function canAccess(role: AdminRole, module: AdminModule, minLevel: AccessLevel = 'view'): boolean {
  const level = ROLE_PERMISSIONS[role]?.[module] ?? 'none';
  if (minLevel === 'full') return level === 'full';
  if (minLevel === 'view') return level !== 'none';
  return level !== 'none';
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: '👑 Super Admin',
  clinic_owner: '🏥 Clinic Owner',
  marketing_manager: '📈 Marketing Manager',
  doctor: '👨‍⚕️ Doctor',
  receptionist: '🧑‍💼 Receptionist',
  content_editor: '✍️ Content Editor',
  finance_manager: '💰 Finance Manager',
  customer_support: '☎️ Customer Support',
};

export const ROLE_COLORS: Record<AdminRole, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  clinic_owner: 'bg-blue-100 text-blue-700',
  marketing_manager: 'bg-green-100 text-green-700',
  doctor: 'bg-teal-100 text-teal-700',
  receptionist: 'bg-orange-100 text-orange-700',
  content_editor: 'bg-pink-100 text-pink-700',
  finance_manager: 'bg-yellow-100 text-yellow-700',
  customer_support: 'bg-gray-100 text-gray-700',
};

export const ALL_ROLES: AdminRole[] = [
  'super_admin', 'clinic_owner', 'marketing_manager',
  'doctor', 'receptionist', 'content_editor',
  'finance_manager', 'customer_support',
];

// Roles that may export lead data
export const EXPORT_ALLOWED_ROLES: AdminRole[] = [
  'super_admin',
  'clinic_owner',
  'marketing_manager',
];

// Roles that may toggle patient-phone masking on/off, independent of the coarser
// `settings` module permission (clinic_owner has 'view' only there) — a deliberate,
// narrow field-level carve-out rather than a blanket settings:'full' grant.
export const PHONE_MASK_TOGGLE_ROLES: AdminRole[] = [
  'super_admin',
  'clinic_owner',
];

// Which booking fields each role may export (data masking)
export const EXPORT_FIELDS_BY_ROLE: Partial<Record<AdminRole, string[]>> = {
  super_admin:       ['bookingId', 'name', 'phone', 'service', 'location', 'date', 'time', 'status', 'concern', 'promoCode', 'promoDiscount', 'createdAt'],
  clinic_owner:      ['bookingId', 'name', 'phone', 'service', 'location', 'date', 'time', 'status', 'concern', 'promoCode', 'promoDiscount', 'createdAt'],
  marketing_manager: ['name', 'phone', 'service', 'location', 'status', 'createdAt'],
};
