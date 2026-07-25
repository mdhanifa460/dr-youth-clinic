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
  // 'short' is auto-detected from a /shorts/ URL but admin-editable — a
  // Short is the same underlying YouTube object as a Video, just a
  // different aspect ratio/length, so this is a flag on one model rather
  // than a second collection (see Video module architecture discussion).
  format: 'video' | 'short';
  channel: string;
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
  // SEO — mirrors Blog.ts's field set exactly, so Video gets the same AI
  // keyword-suggestion tooling and admin UI pattern already proven there.
  metaTitle?: string;
  metaDescription?: string;
  keywords: string[];
  canonicalUrl?: string;
  ogImage?: { url: string; publicId?: string };
  // On-demand AI output (Level 2) — populated only when an admin clicks
  // "Generate", never automatically, and always reviewable/editable before
  // Save like every other field on this form.
  aiSummary?: string;
  keyTakeaways: string[];
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

function detectFormat(url: string): 'video' | 'short' {
  return /youtube\.com\/shorts\//.test(url) ? 'short' : 'video';
}

const VideoSchema = new Schema<IVideo>(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true, minlength: 3 },
    slug: { type: String, lowercase: true, match: /^[a-z0-9-]+$/, index: true, unique: true, sparse: true },
    youtubeUrl: { type: String, required: [true, 'YouTube URL is required'] },
    youtubeId: { type: String },
    format: { type: String, enum: ['video', 'short'], default: 'video' },
    channel: { type: String, default: '' },
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
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    keywords: [String],
    canonicalUrl: { type: String, default: '' },
    ogImage: { url: String, publicId: String },
    aiSummary: { type: String, default: '' },
    keyTakeaways: [String],
  },
  { timestamps: true }
);

VideoSchema.pre('save', async function () {
  if (this.youtubeUrl) {
    this.youtubeId = parseYoutubeId(this.youtubeUrl);
    // A channel/handle URL (e.g. youtube.com/@clinicname) or a malformed
    // link parses to an empty id — that would silently save a video whose
    // embed never plays, so reject it here instead of only failing later,
    // client-side, when a patient tries to watch it.
    if (!this.youtubeId) {
      throw new Error('Could not find a video ID in that YouTube URL — paste a direct video link (e.g. youtube.com/watch?v=..., youtu.be/..., or a Shorts link), not a channel URL.');
    }
    if (this.isModified('youtubeUrl')) {
      this.format = detectFormat(this.youtubeUrl);
    }
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

VideoSchema.post('save', function (doc) {
  syncVideoChunk(doc).catch((e) => console.error('[KB] video sync failed', e));
});
VideoSchema.post('findOneAndDelete', function (doc: any) {
  if (doc) removeVideoChunk(doc._id).catch((e: any) => console.error('[KB] video chunk removal failed', e));
});

export const Video = mongoose.models.Video || mongoose.model<IVideo>('Video', VideoSchema);

// Deferred import to avoid a require cycle (KnowledgeBase.ts doesn't import
// Video.ts, but keeping the sync call at the bottom of the file mirrors the
// require-after-model-registration pattern the other synced models use).
import { syncKnowledgeChunk, removeChunk } from '@/app/lib/rag/KnowledgeBase';
async function syncVideoChunk(doc: any) {
  if (doc.status === 'published') {
    await syncKnowledgeChunk('video', doc);
  } else {
    await removeChunk('video', String(doc._id));
  }
}
async function removeVideoChunk(id: any) {
  await removeChunk('video', String(id));
}
