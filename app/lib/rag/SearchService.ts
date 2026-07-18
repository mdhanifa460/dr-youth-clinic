import { connectDB } from '@/app/lib/mongodb';
import { Service } from '@/app/models/Service';
import { Doctor } from '@/app/models/Doctor';

// Traditional MongoDB Atlas Search ($search) against existing collections —
// additive, read-only. Does not replace app/api/admin/search/route.ts (admin
// ⌘K palette, regex-based) or BlogPageClient.tsx's client-side filter; both
// keep working exactly as before this feature.
//
// Location and blog search are deliberately not implemented here: this
// cluster's tier caps Atlas Search indexes at 3 total (shared with Vector
// Search). blog_search_idx was dropped to free a slot for the RAG knowledge
// base's vector index — blog already has BlogPageClient.tsx's client-side
// filter as a fallback, making it the least costly of the 4 to give up.
// Add either back if the cluster tier is upgraded.

export async function searchServices(query: string, limit = 10) {
  await connectDB();
  return Service.aggregate([
    {
      $search: {
        index: 'service_search_idx',
        text: { query, path: ['name', 'narrative', 'heroDescription', 'keywords', 'metaTitle', 'metaDescription'] },
      },
    },
    { $match: { status: 'active' } },
    { $limit: limit },
    { $project: { name: 1, urlSlug: 1, category: 1, location: 1, heroDescription: 1, heroImage: 1, score: { $meta: 'searchScore' } } },
  ]);
}

export async function searchDoctors(query: string, limit = 10) {
  await connectDB();
  return Doctor.aggregate([
    {
      $search: {
        index: 'doctor_search_idx',
        text: { query, path: ['name', 'title', 'qualifications', 'bio'] },
      },
    },
    { $match: { active: true } },
    { $limit: limit },
    { $project: { name: 1, title: 1, specializations: 1, locations: 1, photo: 1, score: { $meta: 'searchScore' } } },
  ]);
}
