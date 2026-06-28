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

export interface ILocationContent extends Document {
  location: string;                      // city key: 'chennai' | 'bangalore' | etc.
  heroImage: { publicId: string; url: string };
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

const LocationContentSchema = new Schema<ILocationContent>(
  {
    location:       { type: String, required: true, unique: true, lowercase: true, trim: true },
    heroImage:      { publicId: { type: String, default: '' }, url: { type: String, default: '' } },
    beforeAfterPairs: { type: [BeforeAfterSchema], default: [] },
    galleryImages:    { type: [GalleryImageSchema], default: [] },
    localDoctors:     { type: [LocalDoctorSchema], default: [] },
  },
  { timestamps: true }
);


export const LocationContent =
  (mongoose.models.LocationContent as mongoose.Model<ILocationContent>) ||
  mongoose.model<ILocationContent>('LocationContent', LocationContentSchema);
