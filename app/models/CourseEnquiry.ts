import mongoose, { Schema, Document } from 'mongoose';

// Deliberately NOT Lead.ts — a practitioner enrolling in certification
// training is a fundamentally different kind of lead than a patient
// booking a consultation. Lead.ts is heavily patient/skin-quiz-shaped
// (primaryConcern, answers, qrSource, clinicLocation, channel — all
// specific to that flow) and none of it fits a course enrollment enquiry.
export interface ICourseEnquiry extends Document {
  name: string;
  phone: string;
  email: string;
  practiceOrClinicName: string;
  city: string;
  course: mongoose.Types.ObjectId;
  message: string;
  source: string;
  status: 'new' | 'contacted' | 'enrolled' | 'declined';
  createdAt: Date;
  updatedAt: Date;
}

const CourseEnquirySchema = new Schema<ICourseEnquiry>(
  {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    practiceOrClinicName: { type: String, default: '' },
    city: { type: String, default: '' },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    message: { type: String, default: '' },
    source: { type: String, default: 'academy-courses' },
    status: { type: String, enum: ['new', 'contacted', 'enrolled', 'declined'], default: 'new' },
  },
  { timestamps: true }
);

CourseEnquirySchema.index({ status: 1, createdAt: -1 });

export const CourseEnquiry = mongoose.models.CourseEnquiry || mongoose.model<ICourseEnquiry>('CourseEnquiry', CourseEnquirySchema);
