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
  };
  display: {
    showPriceOnCards: boolean;
    showDurationOnCards: boolean;
    showBeforeAfterOnPublic: boolean;
    relatedServicesCount: number;
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
    },
    display: {
      showPriceOnCards:        { type: Boolean, default: true },
      showDurationOnCards:     { type: Boolean, default: true },
      showBeforeAfterOnPublic: { type: Boolean, default: true },
      relatedServicesCount:    { type: Number,  default: 3 },
    },
  },
  { timestamps: true }
);

export const Settings =
  mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);

// Singleton helper — always returns the one settings doc, creates it if missing
export async function getSettings(): Promise<ISettings> {
  let doc = await Settings.findOne().lean() as ISettings | null;
  if (!doc) {
    doc = await Settings.create({}) as ISettings;
  }
  return doc;
}
