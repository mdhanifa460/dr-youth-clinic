import mongoose, { Schema, Document } from 'mongoose';

export interface IDoctor extends Document {
  name: string;
  title: string;
  photo: { url: string; publicId: string };
  qualifications: string;
  specializations: string[];
  languages: string[];
  bio: string;
  experience: number;
  locations: string[];
  order: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VALID_LOCATIONS = ['all', 'chennai', 'bangalore', 'coimbatore', 'kochi'];

const DoctorSchema = new Schema<IDoctor>(
  {
    name:            { type: String, required: [true, 'Name is required'], trim: true },
    title:           { type: String, required: [true, 'Title is required'], trim: true },
    photo:           { url: { type: String, default: '' }, publicId: { type: String, default: '' } },
    qualifications:  { type: String, default: '' },
    specializations: [String],
    languages:       [String],
    bio:             { type: String, maxlength: 2000, default: '' },
    experience:      { type: Number, min: 0, max: 50, default: 0 },
    locations:       { type: [String], enum: VALID_LOCATIONS, default: ['all'] },
    order:           { type: Number, default: 0 },
    active:          { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Doctor = mongoose.models.Doctor || mongoose.model('Doctor', DoctorSchema);
