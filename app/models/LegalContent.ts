import mongoose, { Schema, Document } from 'mongoose';
import { unstable_cache } from 'next/cache';

// Privacy Policy and Terms of Service — previously hardcoded JSX in
// app/(public)/privacy-policy/page.tsx and app/(public)/terms/page.tsx,
// now admin-editable (see /admin/legal) while keeping the same visual
// structure (hero, icon-card sections, CTA) those pages already had.
// Singleton document, same pattern as Settings.ts/JourneyConfig.ts — a
// fresh doc seeds with the exact text those pages shipped with, so
// nothing changes for a site that hasn't touched the new admin page yet.
export interface ILegalSection {
  id: string;
  icon: string;
  title: string;
  // Rich text HTML (edited via the existing Tiptap RichTextEditor —
  // app/admin/components/contentblocks/RichTextEditor.tsx), not Markdown.
  bodyHtml: string;
}

export interface ILegalPage {
  lastUpdated: string;
  heroSubtitle: string;
  sections: ILegalSection[];
}

export interface ILegalContent extends Document {
  contactEmail: string;
  privacyPolicy: ILegalPage;
  terms: ILegalPage;
  updatedAt: Date;
}

const LegalSectionSchema = new Schema<ILegalSection>(
  {
    id: { type: String, required: true },
    icon: { type: String, default: '📄' },
    title: { type: String, default: '' },
    bodyHtml: { type: String, default: '' },
  },
  { _id: false }
);

const DEFAULT_PRIVACY_SECTIONS: ILegalSection[] = [
  {
    id: 'collect', icon: '📋', title: 'What Information We Collect',
    bodyHtml:
      '<p>When you book a consultation, contact us or browse our website, we may collect the following:</p>' +
      '<ul>' +
      '<li><strong>Full Name</strong> — to address you correctly and maintain patient records.</li>' +
      '<li><strong>Phone Number</strong> — to confirm appointments and send WhatsApp reminders.</li>' +
      '<li><strong>Email Address</strong> — to send booking confirmations and follow-up care tips.</li>' +
      '<li><strong>Health Concern</strong> — to match you with the right specialist and treatment.</li>' +
      '<li><strong>Location / City</strong> — to route your booking to the nearest clinic.</li>' +
      '</ul>',
  },
  {
    id: 'use', icon: '🔍', title: 'How We Use Your Information',
    bodyHtml:
      '<p>Your information is used solely to provide and improve our services:</p>' +
      '<ul>' +
      '<li>Appointment booking, scheduling and reminders via call or WhatsApp.</li>' +
      '<li>Sending post-treatment care instructions and follow-up messages.</li>' +
      '<li>Personalising your experience across our four clinic locations.</li>' +
      '<li>Responding to enquiries submitted through our website or forms.</li>' +
      '<li>Improving our services based on anonymised usage patterns.</li>' +
      '</ul>' +
      '<p><strong>We do not sell, rent or share your personal data with third parties for marketing purposes.</strong></p>',
  },
  {
    id: 'retention', icon: '🗄️', title: 'Data Retention',
    bodyHtml:
      '<p>Medical and consultation records are retained for a minimum of <strong>3 years</strong> from the date of your last visit, in compliance with applicable Indian healthcare regulations.</p>' +
      '<p>Non-medical contact data (e.g. enquiry form submissions) may be retained for up to 12 months or until you request deletion, whichever is sooner.</p>' +
      '<p>After the applicable retention period, data is securely deleted or anonymised.</p>',
  },
  {
    id: 'cookies', icon: '🍪', title: 'Cookies & Analytics',
    bodyHtml:
      '<p>Our website uses the following third-party analytics and tracking tools to understand site usage and improve your experience:</p>' +
      '<ul>' +
      '<li><strong>Google Analytics 4 (GA4)</strong> — Collects anonymised page view and session data to help us understand how visitors use our site.</li>' +
      '<li><strong>Meta Pixel</strong> — Enables us to measure the effectiveness of our Facebook and Instagram ads and to reach relevant audiences.</li>' +
      '<li><strong>Microsoft Clarity</strong> — Records anonymised session recordings and heatmaps to identify usability improvements.</li>' +
      '</ul>' +
      '<p>You may disable cookies at any time through your browser settings. Note that some website features may not function correctly if cookies are disabled.</p>',
  },
  {
    id: 'rights', icon: '⚖️', title: 'Your Rights',
    bodyHtml:
      '<p>You have the right to:</p>' +
      '<ul>' +
      '<li>Access the personal data we hold about you.</li>' +
      '<li>Request correction of inaccurate or incomplete data.</li>' +
      '<li>Request deletion of your data (subject to medical retention requirements).</li>' +
      '<li>Withdraw consent for marketing communications at any time.</li>' +
      '<li>Lodge a complaint with us if you believe your data has been misused.</li>' +
      '</ul>' +
      '<p>To exercise any of these rights, email us. We aim to respond within 7 business days.</p>',
  },
  {
    id: 'contact', icon: '✉️', title: 'Contact Us',
    bodyHtml:
      '<p>For any questions, concerns or requests regarding this Privacy Policy or your personal data, please contact our privacy team using the email below.</p>' +
      '<p><strong>Clinics:</strong> Chennai · Bangalore · Kochi · Coimbatore</p>' +
      '<p><em>DR Youth Clinic reserves the right to update this policy periodically. Material changes will be notified via our website.</em></p>',
  },
];

const DEFAULT_TERMS_SECTIONS: ILegalSection[] = [
  {
    id: 'appointments', icon: '📅', title: 'Appointment Booking',
    bodyHtml:
      '<p>All appointments at DR Youth Clinic are subject to the following conditions:</p>' +
      '<ul>' +
      "<li>Bookings are only confirmed once you receive a WhatsApp or SMS confirmation from our team.</li>" +
      "<li>A minimum of 24 hours' notice is required to cancel or reschedule an appointment without penalty.</li>" +
      '<li>Late cancellations (within 24 hours) or no-shows may result in a cancellation fee or loss of priority booking status.</li>' +
      '<li>Walk-in availability is subject to doctor schedules and cannot be guaranteed.</li>' +
      '<li>DR Youth Clinic reserves the right to reschedule appointments due to unforeseen clinical circumstances. Patients will be notified as early as possible.</li>' +
      '</ul>',
  },
  {
    id: 'disclaimer', icon: '⚕️', title: 'Medical Disclaimer',
    bodyHtml:
      '<p>Aesthetic and dermatological treatments are inherently individual in nature. By using our services, you acknowledge the following:</p>' +
      '<ul>' +
      '<li>Results vary from person to person depending on skin type, age, lifestyle and adherence to aftercare instructions.</li>' +
      '<li>No specific outcome is guaranteed. Treatment plans are recommendations based on clinical assessment.</li>' +
      '<li>All treatments require a prior consultation with a qualified doctor. No procedure will be carried out without informed consent.</li>' +
      '<li>Information on our website is for general awareness only and does not constitute medical advice.</li>' +
      '<li>If you have an existing medical condition, please disclose it fully during consultation — it may affect treatment suitability.</li>' +
      '</ul>',
  },
  {
    id: 'payment', icon: '💳', title: 'Payment Policy',
    bodyHtml:
      '<p>The following payment terms apply to all services provided at DR Youth Clinic:</p>' +
      '<ul>' +
      '<li>Full payment is due at the time of treatment, prior to the procedure being carried out.</li>' +
      '<li>We accept cash, UPI, debit/credit cards and select digital wallets. EMI options may be available — ask at the front desk.</li>' +
      '<li>Package payments must be made in full at the time of purchase unless a payment plan is agreed in writing.</li>' +
      '<li>Completed treatments are non-refundable. If a treatment session has been administered, no refund will be issued for that session regardless of outcome.</li>' +
      "<li>If a package is partially used and discontinued at the patient's request, any refund for unused sessions is at the clinic's discretion, minus a 15% administrative fee.</li>" +
      '<li>Promotions and offer prices cannot be applied retrospectively to already-paid bookings.</li>' +
      '</ul>',
  },
  {
    id: 'content', icon: '📸', title: 'Before / After Content',
    bodyHtml:
      '<p>DR Youth Clinic may capture and use before-and-after photographs or videos for clinical records, educational and marketing purposes, subject to the following:</p>' +
      '<ul>' +
      "<li>Before/after content is captured and published only with the patient's explicit written consent, obtained at the time of the visit.</li>" +
      '<li>Consent may be withdrawn at any time by writing to us. Previously published content will be removed within 7 business days.</li>' +
      "<li>All published patient images are anonymised or used with the patient's knowledge and approval.</li>" +
      '<li>Content shared by patients about DR Youth Clinic on social media may be reposted or featured with due credit, unless the patient requests otherwise.</li>' +
      '</ul>',
  },
  {
    id: 'governing-law', icon: '⚖️', title: 'Governing Law',
    bodyHtml:
      '<p>These Terms of Service are governed by and construed in accordance with the laws of <strong>Tamil Nadu, India</strong>.</p>' +
      '<p>Any disputes arising out of or in connection with these terms shall be subject to the exclusive jurisdiction of the courts in Chennai, Tamil Nadu.</p>' +
      '<p>DR Youth Clinic reserves the right to update these terms at any time. Continued use of our services following any update constitutes acceptance of the revised terms.</p>',
  },
];

const LegalPageSchema = new Schema<ILegalPage>(
  {
    lastUpdated: { type: String, default: 'January 2025' },
    heroSubtitle: { type: String, default: '' },
    sections: { type: [LegalSectionSchema], default: [] },
  },
  { _id: false }
);

const LegalContentSchema = new Schema<ILegalContent>(
  {
    contactEmail: { type: String, default: 'hello@dryouthclinic.com' },
    privacyPolicy: {
      type: LegalPageSchema,
      default: () => ({
        lastUpdated: 'January 2025',
        heroSubtitle:
          'DR Youth Clinic is committed to protecting your privacy. This policy explains how we collect, use and safeguard your personal information.',
        sections: DEFAULT_PRIVACY_SECTIONS,
      }),
    },
    terms: {
      type: LegalPageSchema,
      default: () => ({
        lastUpdated: 'January 2025',
        heroSubtitle: 'By booking an appointment or using any DR Youth Clinic service, you agree to the terms set out below. Please read them carefully.',
        sections: DEFAULT_TERMS_SECTIONS,
      }),
    },
  },
  { timestamps: true }
);

export const LegalContent =
  mongoose.models.LegalContent || mongoose.model<ILegalContent>('LegalContent', LegalContentSchema);

const getCachedLegalContentDoc = unstable_cache(
  async () => {
    const doc = await LegalContent.findOne({} as any).lean();
    return doc as ILegalContent | null;
  },
  ['legal-content-singleton'],
  { revalidate: 300, tags: ['legal-content'] }
);

export async function getLegalContent(): Promise<ILegalContent> {
  const doc = await getCachedLegalContentDoc();
  if (doc) return doc;
  return (await LegalContent.create({})) as ILegalContent;
}
