import mongoose, { Schema, Document } from 'mongoose';

export interface IDoctor extends Document {
  name: string;
  title: string;
  photo: { url: string; publicId: string };
  specializations: string[];
  bio: string;
  experience: number;
  location: string;
  order: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DoctorSchema = new Schema<IDoctor>(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    title: { type: String, required: [true, 'Title is required'], trim: true },
    photo: { url: String, publicId: String },
    specializations: [String],
    bio: { type: String, maxlength: 500 },
    experience: { type: Number, min: 0, max: 50 },
    location: {
      type: String,
      enum: ['chennai', 'bangalore', 'coimbatore', 'kochi', 'all'],
      default: 'all',
    },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const Doctor = mongoose.models.Doctor || mongoose.model('Doctor', DoctorSchema);
