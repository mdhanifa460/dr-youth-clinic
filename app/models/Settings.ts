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
    whatsappCta: string;
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
    beforeAfterWatermark: string;
    testimonialMinRating: number;
    testimonialsRotateMs: number;
    schemaType: string;
  };
  promotions: {
    referralEnabled: boolean;
    referralReward: number;
    promoCode: string;
    promoDiscount: number;
    birthdayCampaign: boolean;
    birthdayDiscount: number;
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
    quickActions: Array<{ label: string; action: string }>;
    enableRecommendations: boolean;
    enableBooking: boolean;
    enableWhatsappHandoff: boolean;
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
      whatsappCta:    { type: String, default: '' },
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
      beforeAfterWatermark: { type: String, default: 'DR Youth Clinic' },
      testimonialMinRating: { type: Number, default: 4 },
      testimonialsRotateMs: { type: Number, default: 4000 },
      schemaType:           { type: String, default: 'MedicalClinic' },
    },
    promotions: {
      referralEnabled:  { type: Boolean, default: false },
      referralReward:   { type: Number,  default: 500 },
      promoCode:        { type: String,  default: '' },
      promoDiscount:    { type: Number,  default: 10 },
      birthdayCampaign: { type: Boolean, default: false },
      birthdayDiscount: { type: Number,  default: 20 },
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
      quickActions: {
        type: [{ label: String, action: String }],
        default: [
          { label: '📅 Book Appointment', action: '/book' },
          { label: '🧪 Take Skin Quiz', action: '/skin-quiz' },
          { label: '🏷️ View Offers', action: '/offers' },
        ],
      },
      enableRecommendations:  { type: Boolean, default: true },
      enableBooking:          { type: Boolean, default: true },
      enableWhatsappHandoff:  { type: Boolean, default: true },
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
