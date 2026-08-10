import mongoose, { Schema, Document } from 'mongoose';
import { unstable_cache } from 'next/cache';

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
    // Shared auto-rotate interval for every multi-slide carousel site-wide
    // (homepage hero, admin-managed promo banners) — was three separate
    // hardcoded constants (5000/6000ms, one component with none at all)
    // before this existed, each only changeable by editing code.
    carouselIntervalMs: number;
  };
  brand: {
    tagline: string;
    primaryColor: string;
    logoUrl: string;
    logoPublicId: string;
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
  // Which appointment status transition fires which communication trigger —
  // replaces the hardcoded TRANSITION_NOTIFICATIONS map in
  // app/lib/appointmentFlow.ts. Empty by default; the status-change route
  // falls back to that hardcoded map for any status with no matching row
  // here, so nothing changes in behavior until an admin adds/edits a rule.
  automationRules: {
    items: Array<{
      id: string;
      status: string; // an AppointmentStatus value
      trigger: string; // a communicationTemplates trigger key
      enabled: boolean;
      branch: string; // '' = all branches — same convention as whatsappCtaButtons.branch below; a branch-specific rule for this status wins over a global one
    }>;
  };
  content: {
    blogPostsPerPage: number;
    defaultAuthorName: string;
    testimonialMinRating: number;
    testimonialsRotateMs: number;
    schemaType: string;
  };
  // Content Layout Engine opt-in for the Home page. Home is a singleton (no
  // per-record document to hang a flag off, unlike Service/Blog/LandingPage),
  // so this lives on the site-wide Settings singleton instead.
  homepageLayoutEngineEnabled?: boolean;
  // Same reasoning for the /offers listing page — a singleton with no
  // per-record document.
  offersPageLayoutEngineEnabled?: boolean;
  // Homepage Personalization Engine (Phase 1) — master on/off for the
  // whole visitor-interest tracking pipeline (InterestEvent collection +
  // /api/interest-events + every postInterestEvent() call site). Defaults
  // off, same as the layout-engine flags above: this collects visitor
  // behavioral data, so it stays inert until an admin explicitly turns it
  // on rather than silently starting to track on deploy.
  personalizationEnabled?: boolean;
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
  // Admin-configurable WhatsApp CTA buttons — same array-of-structured-
  // items convention as navigation.items above. Rendered wherever a WhatsApp
  // CTA is shown (chat widget quick-actions today; any future surface reads
  // the same array rather than each place hardcoding its own button list).
  whatsappCtaButtons: {
    buttons: Array<{
      id: string;
      label: string;
      icon: string; // emoji or a lucide-react icon name
      action: 'link' | 'call' | 'whatsapp_chat' | 'download';
      url: string; // href / tel: number / wa.me link / download URL, depending on `action`
      branch: string; // '' = all branches
      language: string; // '' = all languages
      order: number;
      visible: boolean;
    }>;
  };
  // The real, single source of truth for patient communication content —
  // replaces the hardcoded DEFAULT_TEMPLATES object in
  // app/lib/notificationTemplates.ts (which an admin could never actually
  // edit) and consolidates the previously-separate, disconnected
  // Settings.whatsapp fixed-key templates below, which were editable but
  // silently had zero effect on anything actually sent — see
  // docs/decisions for the full note. One row per trigger+channel
  // combination, so a trigger can have both a WhatsApp and an Email
  // version active at once.
  communicationTemplates: {
    items: Array<{
      id: string;
      trigger: 'booking_confirmed' | 'rescheduled' | 'cancelled' | 'reminder_24h' | 'reminder_2h' | 'treatment_completed' | 'review_request';
      channel: 'whatsapp' | 'email';
      enabled: boolean;
      subject: string; // email only — ignored for whatsapp
      body: string; // {{name}}/{{service}}/{{branch}}/{{date}}/{{time}}/{{doctor}}/{{reason}}/{{followUp}}/{{clinicPhone}} placeholders
      order: number;
      branch: string; // '' = all branches — a branch-specific template for this trigger+channel wins over a global one
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
      carouselIntervalMs:      { type: Number,  default: 5000 },
    },
    brand: {
      tagline:        { type: String, default: "Your Skin's Best Friend" },
      primaryColor:   { type: String, default: '#0B2560' },
      logoUrl:        { type: String, default: '' },
      logoPublicId:   { type: String, default: '' },
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
    automationRules: {
      items: {
        type: [{ id: String, status: String, trigger: String, enabled: { type: Boolean, default: true }, branch: { type: String, default: '' } }],
        default: [],
      },
    },
    content: {
      blogPostsPerPage:     { type: Number, default: 9 },
      defaultAuthorName:    { type: String, default: 'DR Youth Clinic' },
      testimonialMinRating: { type: Number, default: 4 },
      testimonialsRotateMs: { type: Number, default: 4000 },
      schemaType:           { type: String, default: 'MedicalClinic' },
    },
    homepageLayoutEngineEnabled: { type: Boolean, default: false },
    offersPageLayoutEngineEnabled: { type: Boolean, default: false },
    personalizationEnabled: { type: Boolean, default: false },
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
    whatsappCtaButtons: {
      buttons: {
        type: [{
          id: String,
          label: String,
          icon: { type: String, default: '💬' },
          action: { type: String, enum: ['link', 'call', 'whatsapp_chat', 'download'], default: 'link' },
          url: { type: String, default: '' },
          branch: { type: String, default: '' },
          language: { type: String, default: '' },
          order: { type: Number, default: 0 },
          visible: { type: Boolean, default: true },
        }],
        default: [
          { id: 'book-consult', label: 'Book Consultation', icon: '📅', action: 'link', url: '/book', branch: '', language: '', order: 0, visible: true },
          { id: 'chat-expert',  label: 'Chat with Expert',  icon: '💬', action: 'whatsapp_chat', url: '', branch: '', language: '', order: 1, visible: true },
          { id: 'call-clinic',  label: 'Call Clinic',       icon: '📞', action: 'call', url: '', branch: '', language: '', order: 2, visible: true },
        ],
      },
    },
    communicationTemplates: {
      items: {
        type: [{
          id: String,
          trigger: {
            type: String,
            enum: ['booking_confirmed', 'rescheduled', 'cancelled', 'reminder_24h', 'reminder_2h', 'treatment_completed', 'review_request'],
            required: true,
          },
          channel: { type: String, enum: ['whatsapp', 'email'], default: 'whatsapp' },
          enabled: { type: Boolean, default: true },
          subject: { type: String, default: '' },
          body: { type: String, default: '' },
          order: { type: Number, default: 0 },
          branch: { type: String, default: '' },
        }],
        // Seeded verbatim from the previous hardcoded DEFAULT_TEMPLATES in
        // app/lib/notificationTemplates.ts, so migrating to this array
        // changes nothing about what gets sent until an admin edits one.
        // branch is omitted below — the sub-schema default ('') applies, so
        // every seed row stays global, same as before this field existed.
        default: [
          { id: 'booking-confirmed-wa', trigger: 'booking_confirmed', channel: 'whatsapp', enabled: true, subject: '', order: 0, body:
            "Hello {{name}}! ✨\n\nYour appointment at *DR Youth Clinic* has been confirmed.\n\n📅 *Treatment:* {{service}}\n📍 *Branch:* {{branch}}\n🗓️ *Date:* {{date}} at {{time}}\n👨‍⚕️ *Doctor:* {{doctor}}\n\nPlease arrive *10 minutes early*. Avoid makeup on the treatment area.\nFor any queries, reply here or call {{clinicPhone}}.\n\n_DR Youth Clinic – Your Skin's Best Friend_ 🌿" },
          { id: 'rescheduled-wa', trigger: 'rescheduled', channel: 'whatsapp', enabled: true, subject: '', order: 1, body:
            "Hello {{name}},\n\nYour appointment has been rescheduled.\n\n📅 *New Date:* {{date}} at {{time}}\n📍 *Branch:* {{branch}}\n📝 *Reason:* {{reason}}\n\nApologies for any inconvenience. For queries: {{clinicPhone}}.\n\n_DR Youth Clinic_ 🌿" },
          { id: 'cancelled-wa', trigger: 'cancelled', channel: 'whatsapp', enabled: true, subject: '', order: 2, body:
            "Hello {{name}},\n\nYour appointment on {{date}} at {{branch}} has been cancelled.\n\n📝 *Reason:* {{reason}}\n\nTo reschedule, please call {{clinicPhone}} or reply here.\n\n_DR Youth Clinic_ 🌿" },
          { id: 'reminder-24h-wa', trigger: 'reminder_24h', channel: 'whatsapp', enabled: true, subject: '', order: 3, body:
            "Hi {{name}}! 👋 *Reminder — your appointment is tomorrow!*\n\n📅 *{{date}}* at *{{time}}*\n📍 *{{branch}}* – with *{{doctor}}*\n\nPlease arrive 10 minutes early and avoid sun exposure today.\nSee you tomorrow! — _DR Youth Clinic_ ✨" },
          { id: 'reminder-2h-wa', trigger: 'reminder_2h', channel: 'whatsapp', enabled: true, subject: '', order: 4, body:
            "Hi {{name}}! ⏰ Your appointment at DR Youth {{branch}} is *in 2 hours* ({{time}}).\n*{{doctor}}* is ready for you. See you soon! 🌿" },
          { id: 'treatment-completed-wa', trigger: 'treatment_completed', channel: 'whatsapp', enabled: true, subject: '', order: 5, body:
            "Thank you for visiting *DR Youth Clinic*, {{name}}! 😊\n\nHow are you feeling after your *{{service}}* session?\n\n💧 Remember your post-care routine. If you have any concerns, just reply to this message.\n{{followUp}}\n\n_DR Youth Clinic – We care beyond the clinic_ 🌿" },
          { id: 'review-request-wa', trigger: 'review_request', channel: 'whatsapp', enabled: true, subject: '', order: 6, body:
            "Hi {{name}}! ⭐ Thank you for choosing DR Youth Clinic!\n\nCould you spare 2 minutes to share your experience?\nYour feedback helps other patients find the right care. 🙏\n\nFor queries: {{clinicPhone}}\n\n_DR Youth Clinic_ 🌿" },
        ],
      },
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

// Cached read — getSettings() is called from dozens of places across both
// runtime requests and, more importantly, every one of this site's ~380
// statically-generated pages at build time. It previously did a fresh,
// uncached MongoDB round-trip on every single call with zero
// deduplication — tolerable when the document was small, but as
// Settings has grown (communicationTemplates, whatsappCtaButtons,
// automationRules, etc. all added this session) that cost compounds
// across every one of those pages. unstable_cache is the same pattern
// already used elsewhere in this codebase for exactly this kind of
// shared, build-time-and-runtime config read (see getCachedNavItems,
// getCachedAiConfig in app/(public)/layout.tsx) — one real fetch per
// revalidate window, not one per page. The admin Settings PUT route
// calls revalidateTag('settings') so an admin's save is reflected
// immediately rather than waiting out the window.
const getCachedSettingsDoc = unstable_cache(
  async () => {
    const doc = await Settings.findOne({} as any).lean();
    return doc as ISettings | null;
  },
  ['settings-singleton'],
  { revalidate: 60, tags: ['settings'] }
);

// Singleton helper — always returns the one settings doc, creates it if missing
export async function getSettings(): Promise<ISettings> {
  const doc = await getCachedSettingsDoc();
  if (doc) return doc;
  // First-ever call with no document yet — a real write, deliberately kept
  // outside the cached read above (unstable_cache is for reads, not writes
  // with side effects) and only reachable once, ever, per deployment.
  return (await Settings.create({})) as ISettings;
}
