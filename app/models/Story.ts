import mongoose, { Schema, Document } from 'mongoose';
import { syncKnowledgeChunk, removeChunk } from '@/app/lib/rag/KnowledgeBase';

// Element types a slide can contain — kept as a flexible {id,type,visible,data}
// shape (same convention as Service.narrativeBlocks / the Content Block
// Builder) rather than one rigid schema per type. This is what makes future
// AI-generated slides possible without a schema migration: a generator just
// appends new elements shaped like these, nothing about the collection
// itself has to change.
export interface IStoryElement {
  id: string;
  type: 'title' | 'subtitle' | 'description' | 'quote' | 'doctor_card' | 'service_card'
      | 'offer_card' | 'result_card' | 'cta_button' | 'whatsapp_button' | 'call_button'
      | 'website_link' | 'location_card' | 'countdown';
  visible: boolean;
  data: Record<string, any>;
}

export interface IStorySlide {
  id: string;
  order: number;
  background: {
    type: 'image' | 'video' | 'color' | 'gradient';
    image?: { url: string; publicId: string };
    video?: { url: string; publicId: string };
    color?: string;
    gradientFrom?: string;
    gradientTo?: string;
  };
  overlay: boolean;
  elements: IStoryElement[];
  duration: number; // seconds, autoplay
  transition: 'slide' | 'fade' | 'none';
  muted: boolean;
}

export interface IStory extends Document {
  title: string;
  slug: string;
  description: string;
  coverImage: { url: string; publicId: string };
  storyType: mongoose.Types.ObjectId;
  tags: string[];
  branch: string[];
  slides: IStorySlide[];
  featured: boolean;
  editorsPick: boolean;
  doctorPick: boolean;
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  scheduledFor?: Date;
  publishedAt?: Date;
  viewCount: number;
  order: number;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  createdAt: Date;
  updatedAt: Date;
}

const VALID_BRANCHES = ['all', 'chennai', 'bangalore', 'coimbatore', 'kochi'];

const StoryElementSchema = new Schema<IStoryElement>({
  id: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ['title', 'subtitle', 'description', 'quote', 'doctor_card', 'service_card',
      'offer_card', 'result_card', 'cta_button', 'whatsapp_button', 'call_button',
      'website_link', 'location_card', 'countdown'],
  },
  visible: { type: Boolean, default: true },
  data: { type: Schema.Types.Mixed, default: {} },
}, { _id: false });

const StorySlideSchema = new Schema<IStorySlide>({
  id: { type: String, required: true },
  order: { type: Number, default: 0 },
  background: {
    type: { type: String, enum: ['image', 'video', 'color', 'gradient'], default: 'color' },
    image: { url: String, publicId: String },
    video: { url: String, publicId: String },
    color: { type: String, default: '#0B2560' },
    gradientFrom: String,
    gradientTo: String,
  },
  overlay: { type: Boolean, default: true },
  elements: { type: [StoryElementSchema], default: [] },
  duration: { type: Number, default: 5, min: 2, max: 30 },
  transition: { type: String, enum: ['slide', 'fade', 'none'], default: 'slide' },
  muted: { type: Boolean, default: true },
}, { _id: false });

const StorySchema = new Schema<IStory>({
  title:       { type: String, required: [true, 'Title is required'], trim: true },
  slug:        { type: String, lowercase: true, match: /^[a-z0-9-]+$/, unique: true, sparse: true, index: true },
  description: { type: String, default: '' },
  coverImage:  { url: { type: String, default: '' }, publicId: { type: String, default: '' } },
  storyType:   { type: Schema.Types.ObjectId, ref: 'StoryType', required: true },
  tags:        { type: [String], default: [] },
  branch:      { type: [String], enum: VALID_BRANCHES, default: ['all'] },
  slides:      { type: [StorySlideSchema], default: [] },
  featured:    { type: Boolean, default: false },
  editorsPick: { type: Boolean, default: false },
  doctorPick:  { type: Boolean, default: false },
  status:      { type: String, enum: ['draft', 'scheduled', 'published', 'archived'], default: 'draft' },
  scheduledFor: Date,
  publishedAt:  Date,
  viewCount:   { type: Number, default: 0 },
  order:       { type: Number, default: 0 },
  seoTitle:       { type: String, default: '' },
  seoDescription: { type: String, default: '' },
  seoKeywords:    { type: [String], default: [] },
}, { timestamps: true });

StorySchema.index({ status: 1, order: 1 });
StorySchema.index({ storyType: 1 });
StorySchema.index({ featured: 1 });
StorySchema.index({ viewCount: -1 });

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

StorySchema.pre('save', async function () {
  if (!this.slug && this.title) {
    const base = slugify(this.title);
    let slug = base;
    let counter = 1;
    while (await mongoose.model('Story').exists({ slug, _id: { $ne: this._id } })) {
      slug = `${base}-${counter}`;
      counter++;
    }
    this.slug = slug;
  }
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
});

// Only published stories are searchable/recommendable — draft/scheduled/
// archived stories must not leak into RAG retrieval or the AI assistant.
StorySchema.post('save', function (doc: any) {
  if (doc.status === 'published') {
    syncKnowledgeChunk('story', doc).catch((e) => console.error('[KB] story sync failed', e));
  } else {
    removeChunk('story', String(doc._id)).catch((e) => console.error('[KB] story remove failed', e));
  }
});
StorySchema.post('findOneAndUpdate', function (doc: any) {
  if (!doc) return;
  if (doc.status === 'published') {
    syncKnowledgeChunk('story', doc).catch((e) => console.error('[KB] story sync failed', e));
  } else {
    removeChunk('story', String(doc._id)).catch((e) => console.error('[KB] story remove failed', e));
  }
});
StorySchema.post('findOneAndDelete', function (doc: any) {
  if (doc) removeChunk('story', String(doc._id)).catch((e) => console.error('[KB] story remove failed', e));
});

export const Story = mongoose.models.Story || mongoose.model<IStory>('Story', StorySchema);
