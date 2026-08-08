import mongoose, { Schema, Document } from 'mongoose';
import { syncKnowledgeChunk } from '@/app/lib/rag/KnowledgeBase';
import { ImageWithFocalPointSchema, type IImageWithFocalPoint } from '@/app/models/shared/imageSchema';

export interface IDoctor extends Document {
  name: string;
  title: string;
  // Doctor is the proof case for the sitewide focal-point image system —
  // photo now carries an optional focalPoint (preset or manual x/y) so
  // DoctorCard/detail-page crops can center on the face instead of the
  // hardcoded `object-top` every other image field still uses.
  photo: IImageWithFocalPoint;
  qualifications: string;
  specializations: string[];
  languages: string[];
  bio: string;
  experience: number;
  locations: string[];
  order: number;
  active: boolean;
  // Per-record Content Layout Engine opt-in — same pattern as
  // Service/Blog/LandingPage.
  layoutEngineEnabled?: boolean;
  // Additive — set when this doctor is linked to a CRM Connector record.
  // Sync only ever touches `active`/`locations` from the CRM side; photo,
  // bio, qualifications, and order stay admin-authored even for a synced
  // doctor, so a CRM pull can never clobber curated marketing content.
  externalCrmId?: string;
  crmSyncedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const VALID_LOCATIONS = ['all', 'chennai', 'bangalore', 'coimbatore', 'kochi'];

const DoctorSchema = new Schema<IDoctor>(
  {
    name:            { type: String, required: [true, 'Name is required'], trim: true },
    title:           { type: String, required: [true, 'Title is required'], trim: true },
    photo:           { type: ImageWithFocalPointSchema, default: () => ({ url: '', publicId: '' }) },
    qualifications:  { type: String, default: '' },
    specializations: [String],
    languages:       [String],
    bio:             { type: String, maxlength: 2000, default: '' },
    experience:      { type: Number, min: 0, max: 50, default: 0 },
    locations:       { type: [String], enum: VALID_LOCATIONS, default: ['all'] },
    order:           { type: Number, default: 0 },
    active:          { type: Boolean, default: true },
    layoutEngineEnabled: { type: Boolean, default: false },
    externalCrmId:   { type: String, default: '', index: true },
    crmSyncedAt:     { type: Date, default: null },
  },
  { timestamps: true }
);

// Matches the real query on every location page's doctor list:
// { locations: { $in: [city, 'all'] }, active: true }, sorted by order.
DoctorSchema.index({ active: 1, locations: 1 });

// Keeps the RAG knowledge base (KnowledgeChunk) in sync whenever a doctor is
// created or edited — fire-and-forget + logged, never allowed to fail the
// actual save. .create() triggers 'save'; the admin PUT route's
// findByIdAndUpdate (with {returnDocument: 'after'}) triggers 'findOneAndUpdate'.
DoctorSchema.post('save', function (doc) {
  syncKnowledgeChunk('doctor', doc).catch((e) => console.error('[KB] doctor sync failed', e));
});
DoctorSchema.post('findOneAndUpdate', function (doc) {
  if (doc) syncKnowledgeChunk('doctor', doc).catch((e) => console.error('[KB] doctor sync failed', e));
});

export const Doctor = mongoose.models.Doctor || mongoose.model('Doctor', DoctorSchema);
