import mongoose, { Document, Schema } from 'mongoose';
import { syncKnowledgeChunk } from '@/app/lib/rag/KnowledgeBase';
import { FocalPointSchema } from '@/app/models/shared/imageSchema';
import type { FocalPoint } from '@/app/lib/media/focalPoint';

export interface IBeforeAfterPair {
  title: string;
  treatment: string;
  description?: string;
  before: { publicId: string; url: string };
  after: { publicId: string; url: string };
  // One focal point per pair, applied identically to before and after.
  focalPoint?: FocalPoint;
  isVisible: boolean;
  displayOrder: number;
}

export interface IGalleryImage {
  publicId: string;
  url: string;
  caption?: string;
  focalPoint?: FocalPoint;
  isVisible: boolean;
  displayOrder: number;
}

export interface ILocationDoctor {
  name: string;
  role: string;
  experience?: string;
  photo: { publicId: string; url: string };
  linkedIn?: string;
  isVisible: boolean;
}

export interface IClinicHour {
  day: string;
  hours: string;
}

// Structured hours, additive alongside the existing free-text IClinicHour
// (which stays as-is for display copy like "Mon–Sat: 9 AM – 7 PM, Sun:
// Closed") — this is the machine-readable version a booking/slot system
// can actually reason about (is this branch open right now, generate valid
// slot times, etc.), which free text can't support.
export interface IOperatingHour {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  isOpen: boolean;
  openTime: string;  // "09:00"
  closeTime: string; // "19:00"
}

export interface IHoliday {
  date: string; // "2026-08-15"
  label: string; // "Independence Day"
}

// Per-branch overrides of the global Settings.booking fields — every field
// optional and falling back to the global value when unset, so a branch
// with no overrides behaves identically to today (one global rule set for
// every city).
export interface IBookingRules {
  consultationDuration?: number;
  consultationFee?: number;
  requirePhone?: boolean;
  // Booking Capacity & Availability — same override-the-global-default
  // pattern as the three fields above, see app/lib/branchConfig.ts's
  // getEffectiveBranchConfig() for the merge order. dailyAppointmentCapacity
  // is a CLINIC CAPACITY policy ("how many real appointments can this
  // branch handle today"), deliberately distinct from the unrelated
  // per-IP API rate limiter in app/lib/rateLimit.ts — null/unset means
  // unlimited, never a silent 0.
  dailyAppointmentCapacity?: number | null;
  bookingEnabled?: boolean;
  sameDayBookingEnabled?: boolean;
  // null/unset means no advance-window restriction (unlimited how-far-ahead).
  advanceBookingDays?: number | null;
}

export interface ISlotConfig {
  slotDurationMinutes: number;
  availableTimes: string[]; // e.g. ["09:00 AM", "10:00 AM", ...] — admin-editable list, not hardcoded
}

export interface IWhyUsItem {
  icon: string;
  title: string;
  desc: string;
}

export interface IClinicInfo {
  address: string;
  phone: string;
  /** Where booking WhatsApp alerts for this location go. Separate from `phone`
   *  (the public "call us" number) since the staff member who should get
   *  internal booking alerts may not be the same number shown to patients.
   *  Falls back to `phone`, then to the global CLINIC_PHONE env var, if unset. */
  whatsappNotifyNumber?: string;
  // Outbound-to-patient sender number, distinct from whatsappNotifyNumber
  // above (which only receives the internal "new booking" alert). Only
  // meaningful if this clinic has actually registered more than one
  // WhatsApp Business phone number with Meta — most businesses have just
  // one, in which case this stays empty and every branch keeps sending
  // from the single global PHONE_NUMBER_ID, exactly like today.
  whatsappSenderPhoneNumberId?: string;
  // The patient-facing "chat with us on WhatsApp" number for THIS branch
  // — distinct from both fields above (neither is meant for a patient to
  // message). Empty by default; every wa.me link site-wide falls back to
  // Settings.contact.publicWhatsApp (the single sitewide number) until an
  // admin fills this in per branch, so nothing breaks for an unconfigured
  // location.
  publicWhatsApp?: string;
  hours: IClinicHour[];
  operatingHours: IOperatingHour[];
  holidays: IHoliday[];
  bookingRules?: IBookingRules;
  slotConfig?: ISlotConfig;
  // IANA timezone for this branch's "what day is it right now" math (daily
  // appointment capacity resets at LOCAL midnight, not UTC — see
  // app/lib/branchTimezone.ts). Defaults to Asia/Kolkata since every real
  // branch today is in India, but this is a per-branch, fully admin-
  // editable string, not hardcoded logic — a future non-India branch just
  // sets its own IANA zone here, no code change needed.
  timezone?: string;
  languages: string[];
  rating: number;
  reviewCount: number;
  serviceCount: number;
  doctorCount: number;
  description: string;
  specialties: string[];
  whyUs: IWhyUsItem[];
}

export interface ILocationContent extends Document {
  location: string;                      // city key: 'chennai' | 'bangalore' | etc.
  heroImage: { publicId: string; url: string };
  googleMapsUrl?: string;
  mapEmbedUrl?: string;
  clinicInfo?: IClinicInfo;
  beforeAfterPairs: IBeforeAfterPair[];
  galleryImages: IGalleryImage[];
  localDoctors: ILocationDoctor[];
  // Content Layout Engine opt-in — same pattern as Service/Blog/LandingPage.
  layoutEngineEnabled?: boolean;
  // Additive — set when this branch is linked to a CRM Connector branch
  // record. Deliberately narrow: sync only ever writes to this subdocument,
  // never to heroImage/beforeAfterPairs/galleryImages/localDoctors/hours —
  // those stay admin-authored marketing content, never CRM-overwritten.
  crmSync?: { externalCrmId: string; crmSyncedAt: Date | null; crmActive: boolean };
  updatedAt: Date;
  createdAt: Date;
}

const BeforeAfterSchema = new Schema<IBeforeAfterPair>({
  title:        { type: String, required: true },
  treatment:    { type: String, default: '' },
  description:  { type: String, default: '' },
  before:       { publicId: { type: String, default: '' }, url: { type: String, default: '' } },
  after:        { publicId: { type: String, default: '' }, url: { type: String, default: '' } },
  focalPoint:   { type: FocalPointSchema, default: undefined },
  isVisible:    { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
}, { _id: true });

const GalleryImageSchema = new Schema<IGalleryImage>({
  publicId:     { type: String, required: true },
  url:          { type: String, required: true },
  caption:      { type: String, default: '' },
  focalPoint:   { type: FocalPointSchema, default: undefined },
  isVisible:    { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
}, { _id: true });

const LocalDoctorSchema = new Schema<ILocationDoctor>({
  name:       { type: String, required: true },
  role:       { type: String, default: '' },
  experience: { type: String, default: '' },
  photo:      { publicId: { type: String, default: '' }, url: { type: String, default: '' } },
  linkedIn:   { type: String, default: '' },
  isVisible:  { type: Boolean, default: true },
}, { _id: true });

const ClinicHourSchema = new Schema<IClinicHour>(
  { day: { type: String, default: '' }, hours: { type: String, default: '' } },
  { _id: false }
);

const VALID_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const OperatingHourSchema = new Schema<IOperatingHour>(
  {
    day: { type: String, enum: VALID_DAYS, required: true },
    isOpen: { type: Boolean, default: true },
    openTime: { type: String, default: '09:00' },
    closeTime: { type: String, default: '19:00' },
  },
  { _id: false }
);

const HolidaySchema = new Schema<IHoliday>(
  { date: { type: String, required: true }, label: { type: String, default: '' } },
  { _id: true }
);

const BookingRulesSchema = new Schema<IBookingRules>(
  {
    consultationDuration: { type: Number },
    consultationFee: { type: Number },
    requirePhone: { type: Boolean },
    dailyAppointmentCapacity: { type: Number, default: null },
    bookingEnabled: { type: Boolean },
    sameDayBookingEnabled: { type: Boolean },
    advanceBookingDays: { type: Number, default: null },
  },
  { _id: false }
);

const SlotConfigSchema = new Schema<ISlotConfig>(
  {
    slotDurationMinutes: { type: Number, default: 30 },
    availableTimes: { type: [String], default: [] },
  },
  { _id: false }
);

const WhyUsItemSchema = new Schema<IWhyUsItem>(
  {
    icon:  { type: String, default: '' },
    title: { type: String, default: '' },
    desc:  { type: String, default: '' },
  },
  { _id: false }
);

const ClinicInfoSchema = new Schema<IClinicInfo>(
  {
    address:      { type: String, default: '' },
    phone:        { type: String, default: '' },
    whatsappNotifyNumber: { type: String, default: '' },
    whatsappSenderPhoneNumberId: { type: String, default: '' },
    publicWhatsApp: { type: String, default: '' },
    hours:        { type: [ClinicHourSchema], default: [] },
    operatingHours: { type: [OperatingHourSchema], default: [] },
    holidays:     { type: [HolidaySchema], default: [] },
    bookingRules: { type: BookingRulesSchema, default: undefined },
    slotConfig:   { type: SlotConfigSchema, default: undefined },
    timezone:     { type: String, default: 'Asia/Kolkata' },
    languages:    { type: [String], default: [] },
    rating:       { type: Number, default: 0 },
    reviewCount:  { type: Number, default: 0 },
    serviceCount: { type: Number, default: 0 },
    doctorCount:  { type: Number, default: 0 },
    description:  { type: String, default: '' },
    specialties:  { type: [String], default: [] },
    whyUs:        { type: [WhyUsItemSchema], default: [] },
  },
  { _id: false }
);

const LocationContentSchema = new Schema<ILocationContent>(
  {
    location:       { type: String, required: true, unique: true, lowercase: true, trim: true },
    heroImage:      { publicId: { type: String, default: '' }, url: { type: String, default: '' } },
    googleMapsUrl:  { type: String, default: '' },
    mapEmbedUrl:    { type: String, default: '' },
    clinicInfo:     { type: ClinicInfoSchema, default: () => ({}) },
    beforeAfterPairs: { type: [BeforeAfterSchema], default: [] },
    galleryImages:    { type: [GalleryImageSchema], default: [] },
    localDoctors:     { type: [LocalDoctorSchema], default: [] },
    layoutEngineEnabled: { type: Boolean, default: false },
    crmSync: {
      externalCrmId: { type: String, default: '' },
      crmSyncedAt:   { type: Date, default: null },
      crmActive:     { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);


// LocationContent never calls .save()/.create() — only findOneAndUpdate
// (upsert). Confirmed the admin GET route also does a lazy find-or-create
// upsert (`$setOnInsert` only, no real content change) on every page view —
// guard against syncing on that call, or every admin page load would embed
// unnecessarily. Can't just check "$set is present": the `{timestamps:true}`
// option makes Mongoose auto-inject `$set: {updatedAt}` into every update,
// including the lazy GET-route's setOnInsert-only touch — so the real signal
// is whether $set carries any key besides updatedAt.
LocationContentSchema.post('findOneAndUpdate', function (doc) {
  const update: any = this.getUpdate();
  const realChange = Object.keys(update?.$set || {}).some((k) => k !== 'updatedAt');
  if (!doc || !realChange) return;
  syncKnowledgeChunk('location', doc).catch((e) => console.error('[KB] location sync failed', e));
});

export const LocationContent =
  (mongoose.models.LocationContent as mongoose.Model<ILocationContent>) ||
  mongoose.model<ILocationContent>('LocationContent', LocationContentSchema);
