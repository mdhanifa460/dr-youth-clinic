import mongoose, { Document, Schema } from 'mongoose';

export interface IBeforeAfterPair {
  title: string;
  treatment: string;
  description?: string;
  before: { publicId: string; url: string };
  after: { publicId: string; url: string };
  isVisible: boolean;
  displayOrder: number;
}

export interface IGalleryImage {
  publicId: string;
  url: string;
  caption?: string;
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
  hours: IClinicHour[];
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
  updatedAt: Date;
  createdAt: Date;
}

const BeforeAfterSchema = new Schema<IBeforeAfterPair>({
  title:        { type: String, required: true },
  treatment:    { type: String, default: '' },
  description:  { type: String, default: '' },
  before:       { publicId: { type: String, default: '' }, url: { type: String, default: '' } },
  after:        { publicId: { type: String, default: '' }, url: { type: String, default: '' } },
  isVisible:    { type: Boolean, default: true },
  displayOrder: { type: Number, default: 0 },
}, { _id: true });

const GalleryImageSchema = new Schema<IGalleryImage>({
  publicId:     { type: String, required: true },
  url:          { type: String, required: true },
  caption:      { type: String, default: '' },
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
    hours:        { type: [ClinicHourSchema], default: [] },
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
  },
  { timestamps: true }
);


export const LocationContent =
  (mongoose.models.LocationContent as mongoose.Model<ILocationContent>) ||
  mongoose.model<ILocationContent>('LocationContent', LocationContentSchema);
