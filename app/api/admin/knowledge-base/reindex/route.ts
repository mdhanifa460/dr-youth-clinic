import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Service } from '@/app/models/Service';
import { Doctor } from '@/app/models/Doctor';
import { Blog } from '@/app/models/Blog';
import { LocationContent } from '@/app/models/LocationContent';
import { Result } from '@/app/models/Result';
import { Offer } from '@/app/models/Offer';
import { KnowledgeDocument } from '@/app/models/KnowledgeDocument';
import { Story } from '@/app/models/Story';
import { Faq } from '@/app/models/Faq';
import { HomepageSection } from '@/app/models/HomepageSection';
import { IKnowledgeChunk } from '@/app/models/KnowledgeChunk';
import { requirePermission } from '@/app/lib/adminAuth';
import { syncKnowledgeChunk, syncFaqChunks } from '@/app/lib/rag/KnowledgeBase';
import { flattenStaticFaqs } from '@/app/lib/rag/staticFaqs';

// Bulk backfill for content that existed before the sync hooks did — new
// saves already stay in sync incrementally via each model's own hooks, this
// just catches up anything created earlier (or bulk-imported).
export async function POST() {
  const denied = await requirePermission('ai', 'full');
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

  const [services, doctors, blogs, locations, resultDocs, offers, documents, stories, faqDocs, faqSection] = await Promise.all([
    (Service as any).find({}).lean(),
    (Doctor as any).find({}).lean(),
    (Blog as any).find({}).lean(),
    (LocationContent as any).find({}).lean(),
    (Result as any).find({}).lean(),
    (Offer as any).find({}).lean(),
    (KnowledgeDocument as any).find({ active: true }).lean(),
    (Story as any).find({ status: 'published' }).lean(),
    (Faq as any).find({ active: true }).lean(),
    HomepageSection.findOne({ sectionKey: 'faq' } as any).lean(),
  ]);

  await reindexAll('service', services);
  await reindexAll('doctor', doctors);
  await reindexAll('blog', blogs);
  await reindexAll('location', locations);
  await reindexAll('result', resultDocs);
  await reindexAll('offer', offers);
  await reindexAll('document', documents);
  await reindexAll('story', stories);
  await reindexAll('faq', faqDocs);

  const cmsFaqs = (faqSection as any)?.data?.faqs ?? [];
  const faqResult = await syncFaqChunks(flattenStaticFaqs(), cmsFaqs);
  results.total += faqResult.upserted + faqResult.failed.length;
  results.upserted += faqResult.upserted;
  for (const f of faqResult.failed) {
    results.failed.push({ sourceType: 'faq', sourceId: f.question, error: f.error });
  }

  return NextResponse.json({ success: true, ...results });
}
