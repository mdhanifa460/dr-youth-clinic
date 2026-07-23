import mongoose, { Schema, Document } from 'mongoose';

export interface IStoryType extends Document {
  name: string;
  slug: string;
  icon: string;
  order: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StoryTypeSchema = new Schema<IStoryType>({
  name:   { type: String, required: [true, 'Name is required'], trim: true },
  slug:   { type: String, lowercase: true, match: /^[a-z0-9-]+$/, unique: true, sparse: true },
  icon:   { type: String, default: '✨' },
  order:  { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

StoryTypeSchema.pre('save', async function () {
  if (!this.slug && this.name) {
    const base = slugify(this.name);
    let slug = base;
    let counter = 1;
    while (await mongoose.model('StoryType').exists({ slug, _id: { $ne: this._id } })) {
      slug = `${base}-${counter}`;
      counter++;
    }
    this.slug = slug;
  }
});

export const StoryType = mongoose.models.StoryType || mongoose.model<IStoryType>('StoryType', StoryTypeSchema);
