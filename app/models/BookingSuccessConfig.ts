import mongoose, { Schema, Document } from 'mongoose';
import { unstable_cache } from 'next/cache';

// Booking Success page — admin-configurable content for
// /book/success/[bookingId], replacing the old inline "thank you" div in
// Form.tsx. Singleton document, same pattern as JourneyConfig/Settings.
export interface ICtaButtonConfig {
  key: 'calendar' | 'directions' | 'whatsapp' | 'call' | 'portal' | 'bookAnother';
  label: string;
  enabled: boolean;
}

export interface IRelatedSectionConfig {
  key: 'beforeAfter' | 'aiAssessment' | 'successStories' | 'faqs' | 'offers';
  label: string;
  enabled: boolean;
  order: number;
}

export interface IChecklistItemConfig {
  key: 'aiAssessment' | 'uploadReports' | 'calendar' | 'directions';
  label: string;
  enabled: boolean;
}

export interface IBookingSuccessConfig extends Document {
  thankYouHeadline: string; // supports {name} template token
  thankYouMessage: string;
  preVisitInstructions: string[];
  ctaButtons: ICtaButtonConfig[];
  relatedSections: IRelatedSectionConfig[];
  checklistEnabled: boolean;
  checklistItems: IChecklistItemConfig[];
  updatedAt: Date;
}

const DEFAULT_CTA_BUTTONS: ICtaButtonConfig[] = [
  { key: 'calendar', label: 'Add to Calendar', enabled: true },
  { key: 'directions', label: 'Get Directions', enabled: true },
  { key: 'whatsapp', label: 'WhatsApp Clinic', enabled: true },
  { key: 'call', label: 'Call Clinic', enabled: true },
  { key: 'portal', label: 'View Patient Portal', enabled: true },
  { key: 'bookAnother', label: 'Book Another Appointment', enabled: true },
];

const DEFAULT_RELATED_SECTIONS: IRelatedSectionConfig[] = [
  { key: 'beforeAfter', label: 'Before & After Results', enabled: true, order: 1 },
  { key: 'aiAssessment', label: 'AI Assessment', enabled: true, order: 2 },
  { key: 'successStories', label: 'Success Stories', enabled: true, order: 3 },
  { key: 'faqs', label: 'FAQs', enabled: true, order: 4 },
  { key: 'offers', label: 'Offers', enabled: true, order: 5 },
];

const DEFAULT_CHECKLIST_ITEMS: IChecklistItemConfig[] = [
  { key: 'aiAssessment', label: 'Complete AI Skin Assessment (2 min)', enabled: true },
  { key: 'uploadReports', label: 'Upload Previous Reports', enabled: true },
  { key: 'calendar', label: 'Save Appointment to Calendar', enabled: true },
  { key: 'directions', label: 'Get Clinic Directions', enabled: true },
];

const CtaButtonSchema = new Schema<ICtaButtonConfig>(
  {
    key: { type: String, required: true, enum: ['calendar', 'directions', 'whatsapp', 'call', 'portal', 'bookAnother'] },
    label: { type: String, required: true },
    enabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const RelatedSectionSchema = new Schema<IRelatedSectionConfig>(
  {
    key: { type: String, required: true, enum: ['beforeAfter', 'aiAssessment', 'successStories', 'faqs', 'offers'] },
    label: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const ChecklistItemSchema = new Schema<IChecklistItemConfig>(
  {
    key: { type: String, required: true, enum: ['aiAssessment', 'uploadReports', 'calendar', 'directions'] },
    label: { type: String, required: true },
    enabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const BookingSuccessConfigSchema = new Schema<IBookingSuccessConfig>(
  {
    thankYouHeadline: { type: String, default: 'Thank you, {name}!' },
    thankYouMessage: {
      type: String,
      default: "Your consultation is booked. We're looking forward to seeing you — our team will confirm every detail via WhatsApp shortly.",
    },
    preVisitInstructions: {
      type: [String],
      default: [
        'Please arrive 10 minutes early to complete your intake form.',
        'Bring any previous medical reports or prescriptions relevant to your concern.',
        'Avoid applying makeup, sunscreen, or other skin products before your visit.',
        'Wear comfortable clothing suited to the treatment area being discussed.',
      ],
    },
    ctaButtons: { type: [CtaButtonSchema], default: () => DEFAULT_CTA_BUTTONS },
    relatedSections: { type: [RelatedSectionSchema], default: () => DEFAULT_RELATED_SECTIONS },
    checklistEnabled: { type: Boolean, default: true },
    checklistItems: { type: [ChecklistItemSchema], default: () => DEFAULT_CHECKLIST_ITEMS },
  },
  { timestamps: true }
);

export const BookingSuccessConfig =
  mongoose.models.BookingSuccessConfig ||
  mongoose.model<IBookingSuccessConfig>('BookingSuccessConfig', BookingSuccessConfigSchema);

const getCachedBookingSuccessConfigDoc = unstable_cache(
  async () => {
    const doc = await BookingSuccessConfig.findOne({} as any).lean();
    return doc as IBookingSuccessConfig | null;
  },
  ['booking-success-config-singleton'],
  { revalidate: 60, tags: ['booking-success-config'] }
);

// Singleton helper — same shape as getJourneyConfig()/getSettings(): always
// returns the one config doc, creating it (with the defaults above) on the
// first-ever call.
export async function getBookingSuccessConfig(): Promise<IBookingSuccessConfig> {
  const doc = await getCachedBookingSuccessConfigDoc();
  if (doc) return doc;
  return (await BookingSuccessConfig.create({})) as IBookingSuccessConfig;
}
