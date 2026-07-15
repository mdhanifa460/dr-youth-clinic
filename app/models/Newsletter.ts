import mongoose from 'mongoose';

// Medical Knowledge Center newsletter signup — separate from Lead (which is
// assessment/consultation-intent-shaped: concerns, recommendations, phone)
// since a newsletter subscriber hasn't expressed any of that, just an email.
const NewsletterSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    name: { type: String, default: '' },
    source: { type: String, default: 'blog' },
  },
  { timestamps: true }
);

NewsletterSchema.index({ email: 1 }, { unique: true });

export const Newsletter = mongoose.models.Newsletter || mongoose.model('Newsletter', NewsletterSchema);
