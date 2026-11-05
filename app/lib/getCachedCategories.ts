import { unstable_cache } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import { Category, DEFAULT_CATEGORIES } from '@/app/models/Category';

export type { ICategory } from '@/app/models/Category';

// Kept in its own file, separate from app/lib/serviceCategories.ts — that
// file is imported by 'use client' admin pages for the plain CATEGORY_MAP
// data; a Mongoose-touching import living there would pull the whole
// Mongoose chain into those client bundles and break the build. Only
// import this file from Server Components.
export const getCachedCategories = unstable_cache(
  async () => {
    // A database blip shouldn't fail a whole deploy: the slugs here match the defaults.
    try {
      await connectDB();
      const count = await (Category as any).countDocuments({});
      if (count === 0) await (Category as any).insertMany(DEFAULT_CATEGORIES);
      return await (Category as any).find({ active: true }).sort({ order: 1 }).lean();
    } catch {
      return DEFAULT_CATEGORIES;
    }
  },
  ['public-service-categories'],
  { revalidate: 300, tags: ['categories'] }
);
