import mongoose, { Schema } from 'mongoose';

interface IMetaSuggestionCache {
  cacheKey: string;
  serviceName: string;
  category: string;
  location: string;
  options: { title: string; description: string }[];
  createdAt: Date;
}

const MetaSuggestionCacheSchema = new Schema<IMetaSuggestionCache>({
  cacheKey:    { type: String, required: true, unique: true, index: true },
  serviceName: { type: String, required: true },
  category:    { type: String, required: true },
  location:    { type: String, required: true },
  options: [
    {
      title: String,
      description: String,
    },
  ],
  // MongoDB TTL index — auto-deletes after 30 days so stale suggestions clear themselves
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 },
});

export const MetaSuggestionCache =
  mongoose.models.MetaSuggestionCache ||
  mongoose.model<IMetaSuggestionCache>('MetaSuggestionCache', MetaSuggestionCacheSchema);
