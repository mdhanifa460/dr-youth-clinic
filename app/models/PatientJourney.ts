import mongoose, { Schema, Document } from 'mongoose';

// Persisted record of one visitor's AI Beauty Journey — replaces the
// old /api/journey-simulator pattern of generating an AI response and
// throwing it away on every call. One document per journey attempt,
// found/resumed via sessionId (a client-generated UUID stored in
// localStorage) before a Lead exists, then linked to the Lead once contact
// info is captured — same "anonymous first, identified later" shape
// Plan My Journey's existing lead-capture step already uses.
export interface IPatientJourney extends Document {
  sessionId: string;
  lead?: mongoose.Types.ObjectId;
  goal: string; // JourneyConfig goal slug at the time this journey was started
  status: 'in_progress' | 'completed' | 'abandoned';
  // Which of the 11 modules the visitor last completed — lets the flow
  // resume exactly where they left off instead of restarting from Goal
  // Selection if they close the tab mid-journey.
  currentModule: string;
  photos: { url: string; publicId?: string; angle?: string }[];
  aiObservations?: {
    text: string;
    // The UI must not let a patient proceed past this module without
    // explicitly acknowledging JourneyConfig.aiObservationsDisclaimer —
    // this records that it happened, not just that text was shown.
    disclaimerAcknowledged: boolean;
    generatedAt: Date;
  };
  timeline?: {
    summary: string;
    phases: { sessionRange: string; title: string; description: string }[];
    disclaimer: string;
    generatedAt: Date;
  };
  costRange?: {
    min: number;
    max: number;
    currency: string;
    note: string;
  };
  matchedDoctor?: mongoose.Types.ObjectId;
  matchedBranch?: string;
  appointmentBooked: boolean;
  aiSummaryReport?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PatientJourneySchema = new Schema<IPatientJourney>(
  {
    sessionId: { type: String, required: true, index: true },
    lead: { type: Schema.Types.ObjectId, ref: 'Lead' },
    goal: { type: String, required: true },
    status: { type: String, enum: ['in_progress', 'completed', 'abandoned'], default: 'in_progress' },
    currentModule: { type: String, default: 'goal_selection' },
    photos: { type: [{ url: String, publicId: String, angle: String }], default: [] },
    aiObservations: {
      type: {
        text: String,
        disclaimerAcknowledged: { type: Boolean, default: false },
        generatedAt: Date,
      },
      required: false,
    },
    timeline: {
      type: {
        summary: String,
        phases: [{ sessionRange: String, title: String, description: String }],
        disclaimer: String,
        generatedAt: Date,
      },
      required: false,
    },
    costRange: {
      type: {
        min: Number,
        max: Number,
        currency: { type: String, default: '₹' },
        note: String,
      },
      required: false,
    },
    matchedDoctor: { type: Schema.Types.ObjectId, ref: 'Doctor' },
    matchedBranch: { type: String, default: '' },
    appointmentBooked: { type: Boolean, default: false },
    aiSummaryReport: { type: String, default: '' },
  },
  { timestamps: true }
);

PatientJourneySchema.index({ sessionId: 1, createdAt: -1 });
PatientJourneySchema.index({ lead: 1 });

export const PatientJourney =
  mongoose.models.PatientJourney || mongoose.model<IPatientJourney>('PatientJourney', PatientJourneySchema);
