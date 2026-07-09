import mongoose, { Schema, Document } from 'mongoose';

export const VIDEO_CATEGORIES = [
  'Hair', 'Skin', 'Laser', 'Botox', 'Acne', 'PRP', 'GFC',
  'Technology', 'Doctor Talks', 'Patient Stories', 'FAQ', 'Recovery', 'Lifestyle',
] as const;

export interface IVideo extends Document {
  title: string;
  slug: string;
  youtubeUrl: string;
  youtubeId: string;
  thumbnail?: { url: string; publicId?: string };
  category: string;
  doctor?: mongoose.Types.ObjectId;
  service?: mongoose.Types.ObjectId;
  duration?: string;
  featured: boolean;
  chapters: Array<{ time: string; timeSeconds: number; label: string }>;
  transcript?: string;
  tags: string[];
  language: string;
  faq: Array<{ question: string; answer: string }>;
  journeyKey?: string;
  journeyOrder: number;
  displayOrder: number;
  status: 'draft' | 'published';
  createdAt: Date;
  updatedAt: Date;
}

function parseYoutubeId(url: string): string {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const match = url.match(re);
    if (match) return match[1];
  }
  return '';
}

const VideoSchema = new Schema<IVideo>(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true, minlength: 3 },
    slug: { type: String, lowercase: true, match: /^[a-z0-9-]+$/, index: true, unique: true, sparse: true },
    youtubeUrl: { type: String, required: [true, 'YouTube URL is required'] },
    youtubeId: { type: String },
    thumbnail: { url: String, publicId: String },
    category: { type: String, required: true, enum: VIDEO_CATEGORIES },
    doctor: { type: Schema.Types.ObjectId, ref: 'Doctor' },
    service: { type: Schema.Types.ObjectId, ref: 'Service' },
    duration: { type: String, default: '' },
    featured: { type: Boolean, default: false },
    chapters: [{ time: String, timeSeconds: Number, label: String }],
    transcript: { type: String, default: '' },
    tags: [String],
    language: { type: String, default: 'English' },
    faq: [{ question: String, answer: String }],
    journeyKey: { type: String, default: '' },
    journeyOrder: { type: Number, default: 0 },
    displayOrder: { type: Number, default: 0 },
    status: { type: String, default: 'draft', enum: ['draft', 'published'] },
  },
  { timestamps: true }
);

VideoSchema.pre('save', async function () {
  if (this.youtubeUrl) {
    this.youtubeId = parseYoutubeId(this.youtubeUrl);
  }
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  if (!this.thumbnail?.url && this.youtubeId) {
    this.thumbnail = { url: `https://img.youtube.com/vi/${this.youtubeId}/hqdefault.jpg` };
  }
});

export const Video = mongoose.models.Video || mongoose.model<IVideo>('Video', VideoSchema);
