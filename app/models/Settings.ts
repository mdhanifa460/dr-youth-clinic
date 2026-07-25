import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  serviceForm: {
    showNarrative: boolean;
    showBenefits: boolean;
    showHeroImage: boolean;
    showBeforeAfter: boolean;
    showSeoSection: boolean;
    showKeywordSuggestions: boolean;
    defaultStatus: 'active' | 'draft';
    defaultDuration: number;
    defaultCurrency: string;
  };
  // Mirrors serviceForm's provisioning pattern for the Landing Page builder —
  // which section types (from the LP builder's SECTION_LABELS) must be
  // present before a landing page can be published. Enforced in the admin
  // LP builder's publish action, not at the DB layer, so existing published
  // pages that predate a rule change are never silently broken.
  landingPageForm: {
    requiredSections: string[];
  };
  booking: {
    collectEmail: boolean;
    collectAge: boolean;
    collectConcern: boolean;
    collectPreferredDoctor: boolean;
    requirePhone: boolean;
    whatsappNotify: boolean;
    clinicWhatsapp: string;
    consultationDuration: number;
    consultationFee: number;
    emiBankPartners: string;
    // Lead/appointment source options — shown in the "New Appointment"
    // source picker and the Booking Leads source filter. Admin-configurable
    // so a clinic can add e.g. "Just Dial" without a code change; the
    // underlying field is a plain string, not a fixed enum, to match.
    sources: string[];
  };
  display: {
    showPriceOnCards: boolean;
    showDurationOnCards: boolean;
    showBeforeAfterOnPublic: boolean;
    relatedServicesCount: number;
  };
  brand: {
    tagline: string;
    primaryColor: string;
    instagram: string;
    facebook: string;
    youtube: string;
    googleBusiness: string;
  };
  analytics: {
    ga4Id: string;
    metaPixelId: string;
    gtmId: string;
    clarityId: string;
    hotjarId: string;
    searchConsoleId: string;
  };
  whatsapp: {
    bookingConfirmation: string;
    appointmentReminder: string;
    postTreatmentFollowup: string;
    reviewRequest: string;
    reEngagement: string;
  };
  content: {
    blogPostsPerPage: number;
    defaultAuthorName: string;
    testimonialMinRating: number;
    testimonialsRotateMs: number;
    schemaType: string;
  };
  promotions: {
    promoCode: string;
    promoDiscount: number;
  };
  freeLabels: {
    consultationFree: boolean;
    skinQuizFree: boolean;
  };
  contact: {
    publicPhone: string;
    publicWhatsApp: string;
    publicEmail: string;
  };
  contactPrivacy: {
    phoneMaskEnabled: boolean;
    showPatientPhoneRoles: string[];
  };
  adminUi: {
    analyticsStripEnabled: boolean;
  };
  // Single source of truth for clinic identity strings that used to be
  // hardcoded directly into AI prompts and knowledge-base chunk text
  // (assessment-chat's system prompt, location chunk titles, offer chunk
  // pricing text) — extracted here so those AI surfaces can be reused for a
  // different clinic/brand without a source change, not because anything
  // else in the app currently reads this yet.
  clinicProfile: {
    name: string;
    country: string;
    currencySymbol: string;
  };
  // Drives the public Navbar (app/components/Navbar.tsx) instead of its old
  // hardcoded navItems array. `linkType` covers the two links whose target
  // depends on runtime state the admin can't express as a plain string:
  // 'services' resolves to the visitor's current/detected city's services
  // page, 'locations' renders as the existing 4-city dropdown. Everything
  // else ('custom'/'anchor') just uses `href` as-is. Defaults below mirror
  // the previous hardcoded nav exactly, so nothing changes until an admin
  // edits it.
  navigation: {
    items: Array<{
      id: string;
      label: string;
      linkType: 'custom' | 'services' | 'locations' | 'anchor';
      href: string;
      order: number;
      visible: boolean;
      children: Array<{ id: string; label: string; href: string; order: number }>;
    }>;
  };
  // Per-clinic on/off switches for the Video module's on-demand AI actions
  // (Level 2) — every "Generate ..." button in the admin Video form checks
  // its matching flag here first, so a clinic controls its own AI spend
  // instead of every generator always being available. Nothing here ever
  // triggers automatically; these only gate whether the button is usable.
  videoAI: {
    generateSeoEnabled: boolean;
    generateSummaryEnabled: boolean;
    generateFaqEnabled: boolean;
    generateBlogEnabled: boolean;
    generateStoryEnabled: boolean;
  };
  ai: {
    enabled: boolean;
    greeting: string;
    welcomeMessage: string;
    systemPrompt: string;
    recommendationPrompt: string;
    model: string;
    temperature: number;
    theme: 'luxury' | 'minimal' | 'vibrant';
    suggestedQuestions: string[];
    // Per-branch override — when the visitor's detected branch (see
    // quickActions.branch below) has a non-empty entry here, the widget uses
    // that list instead of `suggestedQuestions` above. Kept as a separate map
    // rather than adding a `branch` field per-item (like quickActions) so the
    // existing string[] shape — already read/written throughout the admin UI
    // and the widget — never has to change to an object array.
    suggestedQuestionsByBranch: Record<string, string[]>;
    // Optional branch scoping — empty/unset means "show for every branch",
    // matching the existing ?location=/?clinic= URL convention used by the
    // skin-quiz's campaign attribution rather than inventing a new signal.
    quickActions: Array<{ label: string; action: string; branch?: string }>;
    enableRecommendations: boolean;
    enableBooking: boolean;
    enableWhatsappHandoff: boolean;
    // Resolved client-side in AiChatWidget (only the client knows local time,
    // URL params, and returning-visitor state) — highest `priority` among
    // matching, enabled rules wins; falls back to `greeting`/`welcomeMessage`
    // above when none match. Defaults to [], so behavior is unchanged until
    // an admin adds a rule.
    greetingRules: Array<{
      id: string;
      enabled: boolean;
      type: 'time_of_day' | 'date_range' | 'returning_visitor' | 'new_visitor' | 'branch';
      startHour?: number;
      endHour?: number;
      startDate?: string;
      endDate?: string;
      campaignParam?: string;
      branch?: string;
      greeting: string;
      welcomeMessage?: string;
      priority: number;
    }>;
    // Resolved server-side in /api/ai-chat against the incoming message text
    // (case-insensitive substring match on matchKeywords) — the
    // highest-priority enabled match overrides the default card
    // types/threshold for that turn only. Defaults to [].
    recommendationRules: Array<{
      id: string;
      enabled: boolean;
      matchKeywords: string[];
      preferredTypes: Array<'doctor' | 'service' | 'offer' | 'result'>;
      minScore?: number;
      priority: number;
    }>;
    // Resolved server-side the same way — a match nudges that turn's system
    // prompt to acknowledge the topic and proactively offer a human handoff,
    // rather than silently trying to fully resolve it in-chat. Defaults to [].
    escalationRules: Array<{
      id: string;
      enabled: boolean;
      matchKeywords: string[];
      message: string;
      priority: number;
    }>;
  };
}

const SettingsSchema = new Schema<ISettings>(
  {
    serviceForm: {
      showNarrative:           { type: Boolean, default: true },
      showBenefits:            { type: Boolean, default: true },
      showHeroImage:           { type: Boolean, default: true },
      showBeforeAfter:         { type: Boolean, default: true },
      showSeoSection:          { type: Boolean, default: true },
      showKeywordSuggestions:  { type: Boolean, default: true },
      defaultStatus:           { type: String,  default: 'active' },
      defaultDuration:         { type: Number,  default: 60 },
      defaultCurrency:         { type: String,  default: 'INR' },
    },
    landingPageForm: {
      requiredSections: { type: [String], default: ['hero', 'form'] },
    },
    booking: {
      collectEmail:            { type: Boolean, default: true },
      collectAge:              { type: Boolean, default: false },
      collectConcern:          { type: Boolean, default: true },
      collectPreferredDoctor:  { type: Boolean, default: false },
      requirePhone:            { type: Boolean, default: true },
      whatsappNotify:          { type: Boolean, default: true },
      clinicWhatsapp:          { type: String,  default: '' },
      consultationDuration:    { type: Number,  default: 30 },
      consultationFee:         { type: Number,  default: 500 },
      emiBankPartners:         { type: String,  default: 'HDFC, ICICI, Axis Bank' },
      sources: {
        type: [String],
        default: ['Website', 'Instagram', 'Facebook', 'Google', 'WhatsApp', 'Referral', 'Walk-in', 'Phone', 'Just Dial', 'Other'],
      },
    },
    display: {
      showPriceOnCards:        { type: Boolean, default: true },
      showDurationOnCards:     { type: Boolean, default: true },
      showBeforeAfterOnPublic: { type: Boolean, default: true },
      relatedServicesCount:    { type: Number,  default: 3 },
    },
    brand: {
      tagline:        { type: String, default: "Your Skin's Best Friend" },
      primaryColor:   { type: String, default: '#0B2560' },
      instagram:      { type: String, default: '' },
      facebook:       { type: String, default: '' },
      youtube:        { type: String, default: '' },
      googleBusiness: { type: String, default: '' },
    },
    analytics: {
      ga4Id:           { type: String, default: '' },
      metaPixelId:     { type: String, default: '' },
      gtmId:           { type: String, default: '' },
      clarityId:       { type: String, default: '' },
      hotjarId:        { type: String, default: '' },
      searchConsoleId: { type: String, default: '' },
    },
    whatsapp: {
      bookingConfirmation:   { type: String, default: "Hello {{name}}! 🌟 Your appointment at DR Youth Clinic has been requested.\n\n📅 Treatment: {{service}}\n📍 Location: {{location}}\n\nOur team will call you within 2 hours to confirm your slot.\n\n— DR Youth Clinic ✨" },
      appointmentReminder:   { type: String, default: "Hi {{name}}! 👋 Reminder — your appointment is tomorrow at DR Youth Clinic.\n\n📅 Treatment: {{service}}\n📍 Location: {{location}}\n\nPlease arrive 10 minutes early.\n\n— DR Youth Clinic ✨" },
      postTreatmentFollowup: { type: String, default: "Hi {{name}}! 😊 We hope your {{service}} session went well!\n\nHow are you feeling? Share any concerns — our team is here for you.\n\n💧 Remember your post-care routine.\n\n— DR Youth Clinic ✨" },
      reviewRequest:         { type: String, default: "Hi {{name}}! ⭐ Thank you for visiting DR Youth Clinic!\n\nCould you spare 2 minutes to leave us a Google review?\n\n👉 {{googleReviewLink}}\n\nThank you! — DR Youth Clinic ✨" },
      reEngagement:          { type: String, default: "Hi {{name}}! 💫 We miss you at DR Youth Clinic!\n\nYour skin deserves consistent care. 🎁 Reply COMEBACK for your exclusive loyalty discount.\n\n— DR Youth Clinic ✨" },
    },
    content: {
      blogPostsPerPage:     { type: Number, default: 9 },
      defaultAuthorName:    { type: String, default: 'DR Youth Clinic' },
      testimonialMinRating: { type: Number, default: 4 },
      testimonialsRotateMs: { type: Number, default: 4000 },
      schemaType:           { type: String, default: 'MedicalClinic' },
    },
    promotions: {
      promoCode:        { type: String,  default: '' },
      promoDiscount:    { type: Number,  default: 10 },
    },
    freeLabels: {
      consultationFree: { type: Boolean, default: true },
      skinQuizFree:     { type: Boolean, default: true },
    },
    contact: {
      publicPhone:    { type: String, default: '' },
      publicWhatsApp: { type: String, default: '' },
      publicEmail:    { type: String, default: '' },
    },
    contactPrivacy: {
      phoneMaskEnabled: { type: Boolean, default: true },
      showPatientPhoneRoles: {
        type: [String],
        default: ['super_admin', 'clinic_owner', 'receptionist', 'customer_support'],
      },
    },
    adminUi: {
      analyticsStripEnabled: { type: Boolean, default: true },
    },
    clinicProfile: {
      name:           { type: String, default: 'DR Youth Clinic' },
      country:        { type: String, default: 'India' },
      currencySymbol: { type: String, default: '₹' },
    },
    navigation: {
      items: {
        type: [{
          id: String,
          label: String,
          linkType: { type: String, enum: ['custom', 'services', 'locations', 'anchor'], default: 'custom' },
          href: { type: String, default: '' },
          order: { type: Number, default: 0 },
          visible: { type: Boolean, default: true },
          children: {
            type: [{ id: String, label: String, href: String, order: { type: Number, default: 0 } }],
            default: [],
          },
        }],
        default: [
          { id: 'home',     label: 'Home',     linkType: 'custom',    href: '/',              order: 0, visible: true, children: [] },
          { id: 'services', label: 'Services',  linkType: 'services',  href: '',               order: 1, visible: true, children: [] },
          { id: 'doctors',  label: 'Doctors',   linkType: 'custom',    href: '/doctors',       order: 2, visible: true, children: [] },
          { id: 'about',    label: 'About',     linkType: 'custom',    href: '/about',         order: 3, visible: true, children: [] },
          { id: 'results',  label: 'Results',   linkType: 'custom',    href: '/results',       order: 4, visible: true, children: [] },
          { id: 'stories',  label: 'Stories',   linkType: 'custom',    href: '/web-stories',   order: 5, visible: true, children: [] },
          { id: 'blog',     label: 'Blog',      linkType: 'custom',    href: '/blog',          order: 6, visible: true, children: [] },
          { id: 'offers',   label: 'Offers',    linkType: 'custom',    href: '/offers',        order: 7, visible: true, children: [] },
          { id: 'contact',  label: 'Contact',   linkType: 'anchor',    href: 'contact',        order: 8, visible: true, children: [] },
          { id: 'locations', label: 'Locations', linkType: 'locations', href: '',              order: 9, visible: true, children: [] },
        ],
      },
    },
    videoAI: {
      generateSeoEnabled:     { type: Boolean, default: true },
      generateSummaryEnabled: { type: Boolean, default: true },
      generateFaqEnabled:     { type: Boolean, default: false },
      generateBlogEnabled:    { type: Boolean, default: false },
      generateStoryEnabled:   { type: Boolean, default: false },
    },
    ai: {
      enabled:      { type: Boolean, default: true },
      greeting:     { type: String, default: "Hi! I'm the DR Youth Clinic assistant 👋" },
      welcomeMessage: { type: String, default: "Ask me about treatments, doctors, offers, or book a consultation." },
      // Appended to CLINICAL_AI_GUARDRAILS (app/lib/ai/clinicalGuardrails.ts) —
      // never replaces it, so the safety preamble can't be edited away from admin.
      systemPrompt: { type: String, default: "You are the DR Youth Clinic assistant. Be warm, concise, and helpful. Ground every factual claim in the provided context — never invent prices, doctor names, or availability." },
      recommendationPrompt: { type: String, default: "Given the patient's concern and the retrieved context, suggest the most relevant treatment, doctor, or offer. Explain briefly why it fits." },
      model:        { type: String, default: 'claude-haiku-4-5-20251001' },
      temperature:  { type: Number, default: 0.4, min: 0, max: 1 },
      theme:        { type: String, enum: ['luxury', 'minimal', 'vibrant'], default: 'luxury' },
      suggestedQuestions: {
        type: [String],
        default: [
          'What treatments do you offer for acne scars?',
          'Do you have any current offers?',
          'How do I book a consultation?',
        ],
      },
      suggestedQuestionsByBranch: { type: Schema.Types.Mixed, default: {} },
      quickActions: {
        type: [{ label: String, action: String, branch: { type: String, default: '' } }],
        default: [
          { label: '📅 Book Appointment', action: '/book' },
          { label: '🧪 Take Skin Quiz', action: '/skin-quiz' },
          { label: '🏷️ View Offers', action: '/offers' },
        ],
      },
      enableRecommendations:  { type: Boolean, default: true },
      enableBooking:          { type: Boolean, default: true },
      enableWhatsappHandoff:  { type: Boolean, default: true },
      greetingRules: {
        type: [{
          id: String,
          enabled: { type: Boolean, default: true },
          type: { type: String, enum: ['time_of_day', 'date_range', 'returning_visitor', 'new_visitor', 'branch'] },
          startHour: Number,
          endHour: Number,
          startDate: String,
          endDate: String,
          campaignParam: String,
          branch: String,
          greeting: String,
          welcomeMessage: String,
          priority: { type: Number, default: 0 },
        }],
        default: [],
      },
      recommendationRules: {
        type: [{
          id: String,
          enabled: { type: Boolean, default: true },
          matchKeywords: [String],
          preferredTypes: [{ type: String, enum: ['doctor', 'service', 'offer', 'result'] }],
          minScore: Number,
          priority: { type: Number, default: 0 },
        }],
        default: [],
      },
      escalationRules: {
        type: [{
          id: String,
          enabled: { type: Boolean, default: true },
          matchKeywords: [String],
          message: String,
          priority: { type: Number, default: 0 },
        }],
        default: [],
      },
    },
  },
  { timestamps: true }
);

export const Settings =
  mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);

// Singleton helper — always returns the one settings doc, creates it if missing
export async function getSettings(): Promise<ISettings> {
  let doc = await Settings.findOne({} as any).lean() as ISettings | null;
  if (!doc) {
    doc = await Settings.create({}) as ISettings;
  }
  return doc;
}
