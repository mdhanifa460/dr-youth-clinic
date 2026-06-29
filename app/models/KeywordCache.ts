import mongoose, { Schema } from 'mongoose';

interface IKeywordCache {
  cacheKey: string;
  serviceName: string;
  category: string;
  location: string;
  keywords: {
    seo: string[];
    geo: string[];
    aeo: string[];
  };
  createdAt: Date;
}

const KeywordCacheSchema = new Schema<IKeywordCache>({
  cacheKey:    { type: String, required: true, unique: true, index: true },
  serviceName: { type: String, required: true },
  category:    { type: String, required: true },
  location:    { type: String, required: true },
  keywords: {
    seo: [String],
    geo: [String],
    aeo: [String],
  },
  // MongoDB TTL index — auto-deletes after 30 days so stale keyword data clears itself
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 },
});

export const KeywordCache =
  mongoose.models.KeywordCache ||
  mongoose.model<IKeywordCache>('KeywordCache', KeywordCacheSchema);
