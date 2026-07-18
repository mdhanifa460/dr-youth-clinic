import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Service } from '@/app/models/Service';
import { Doctor } from '@/app/models/Doctor';
import { Blog } from '@/app/models/Blog';
import { LocationContent } from '@/app/models/LocationContent';
import { HomepageSection } from '@/app/models/HomepageSection';
import { IKnowledgeChunk } from '@/app/models/KnowledgeChunk';
import { requirePermission } from '@/app/lib/adminAuth';
import { syncKnowledgeChunk, syncFaqChunks } from '@/app/lib/rag/KnowledgeBase';
import { flattenStaticFaqs } from '@/app/lib/rag/staticFaqs';

// Bulk backfill for content that existed before the sync hooks did (Steps
// 2-5 already keep new saves in sync incrementally — this just catches up
// anything created earlier). Reuses the 'seo' admin module rather than adding
// a new AdminModule enum value + touching all 8 role rows for a single
// internal tool.
export async function POST() {
  const denied = await requirePermission('seo', 'full');
  if (denied) return denied;

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { success: false, message: 'Add a valid GEMINI_API_KEY to your .env.local file to enable knowledge-base reindexing.' },
      { status: 400 }
    );
  }

  await connectDB();

  const results = {
    total: 0,
    upserted: 0,
    failed: [] as { sourceType: string; sourceId: string; error: string }[],
  };

  // Each document is synced independently — one embedding failure must never
  // abort the rest of the batch (same lesson as the admin Reviews page's
  // save-failure fix earlier this project: never let one failure hide behind
  // a blanket try/catch with no visibility).
  async function reindexAll(sourceType: IKnowledgeChunk['sourceType'], docs: any[]) {
    for (const doc of docs) {
      results.total++;
      try {
        await syncKnowledgeChunk(sourceType, doc);
        results.upserted++;
      } catch (e: any) {
        results.failed.push({ sourceType, sourceId: String(doc._id), error: e.message || String(e) });
      }
    }
  }

  const [services, doctors, blogs, locations, faqSection] = await Promise.all([
    Service.find({}).lean(),
    Doctor.find({}).lean(),
    Blog.find({}).lean(),
    LocationContent.find({}).lean(),
    HomepageSection.findOne({ sectionKey: 'faq' } as any).lean(),
  ]);

  await reindexAll('service', services);
  await reindexAll('doctor', doctors);
  await reindexAll('blog', blogs);
  await reindexAll('location', locations);

  const cmsFaqs = (faqSection as any)?.data?.faqs ?? [];
  const faqResult = await syncFaqChunks(flattenStaticFaqs(), cmsFaqs);
  results.total += faqResult.upserted + faqResult.failed.length;
  results.upserted += faqResult.upserted;
  for (const f of faqResult.failed) {
    results.failed.push({ sourceType: 'faq', sourceId: f.question, error: f.error });
  }

  return NextResponse.json({ success: true, ...results });
}
