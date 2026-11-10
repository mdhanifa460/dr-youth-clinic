import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Service } from '@/app/models/Service';
import { Doctor } from '@/app/models/Doctor';
import { Blog } from '@/app/models/Blog';
import { LocationContent } from '@/app/models/LocationContent';
import { Result, PUBLISHED_RESULT } from '@/app/models/Result';
import { Offer } from '@/app/models/Offer';
import { KnowledgeDocument } from '@/app/models/KnowledgeDocument';
import { Story } from '@/app/models/Story';
import { Faq } from '@/app/models/Faq';
import { Video } from '@/app/models/Video';
import { HomepageSection } from '@/app/models/HomepageSection';
import { KnowledgeChunk, IKnowledgeChunk } from '@/app/models/KnowledgeChunk';
import { requirePermission } from '@/app/lib/adminAuth';
import {
  syncKnowledgeChunk,
  upsertChunk,
  buildFaqChunk,
  currentSiteFaqs,
  removeStaleSiteFaqChunks,
  SITE_FAQ_ID,
  LIBRARY_FAQ_ID,
} from '@/app/lib/rag/KnowledgeBase';
import { flattenStaticFaqs } from '@/app/lib/rag/staticFaqs';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Reindex runs in small batches driven by the admin screen: GET returns each
// content type's status (live items vs. index entries), POST {step, offset}
// embeds one batch and reports progress. One long request used to do
// everything at once with no progress and could be cut off by the server's
// time limit part-way.

const BATCH = 10;
const CONCURRENCY = 5;

type Step = {
  key: string;
  label: string;
  sourceType: IKnowledgeChunk['sourceType'];
  // Index entries this step owns (FAQ library and site FAQs share 'faq').
  idPattern?: RegExp;
  // Only what visitors can actually open: a draft or inactive item in the
  // index gets recommended and leads to a 404.
  load?: () => { model: any; filter: Record<string, unknown> };
};

const STEPS: Step[] = [
  { key: 'service', label: 'Treatments', sourceType: 'service', load: () => ({ model: Service, filter: {} }) },
  { key: 'doctor', label: 'Doctors', sourceType: 'doctor', load: () => ({ model: Doctor, filter: {} }) },
  { key: 'blog', label: 'Blog posts', sourceType: 'blog', load: () => ({ model: Blog, filter: {} }) },
  { key: 'location', label: 'Branches', sourceType: 'location', load: () => ({ model: LocationContent, filter: {} }) },
  { key: 'result', label: 'Results', sourceType: 'result', load: () => ({ model: Result, filter: PUBLISHED_RESULT }) },
  { key: 'offer', label: 'Offers', sourceType: 'offer', load: () => ({ model: Offer, filter: { active: { $ne: false } } }) },
  { key: 'document', label: 'Documents', sourceType: 'document', load: () => ({ model: KnowledgeDocument, filter: { active: true } }) },
  { key: 'story', label: 'Web stories', sourceType: 'story', load: () => ({ model: Story, filter: { status: 'published' } }) },
  { key: 'video', label: 'Academy videos', sourceType: 'video', load: () => ({ model: Video, filter: { status: 'published' } }) },
  { key: 'faq_library', label: 'FAQ library', sourceType: 'faq', idPattern: LIBRARY_FAQ_ID, load: () => ({ model: Faq, filter: { active: true } }) },
  { key: 'faq_site', label: 'Site FAQs', sourceType: 'faq', idPattern: SITE_FAQ_ID },
];

async function siteFaqs() {
  const section: any = await HomepageSection.findOne({ sectionKey: 'faq' } as any).lean();
  return currentSiteFaqs(flattenStaticFaqs(), section?.data?.faqs ?? []);
}

// Ids of every item this step should have in the index.
async function liveIds(step: Step): Promise<string[]> {
  if (step.key === 'faq_site') return (await siteFaqs()).map((f) => f.id);
  const { model, filter } = step.load!();
  const docs = await model.find(filter).select('_id').sort({ _id: 1 }).lean();
  return docs.map((d: any) => String(d._id));
}

async function indexIds(step: Step): Promise<string[]> {
  const docs = await (KnowledgeChunk as any).find({ sourceType: step.sourceType }).select('sourceId').lean();
  return docs.map((d: any) => String(d.sourceId)).filter((id: string) => !step.idPattern || step.idPattern.test(id));
}

export async function GET() {
  const denied = await requirePermission('ai', 'view');
  if (denied) return denied;
  try {
    await connectDB();
    const steps = await Promise.all(STEPS.map(async (step) => {
      const [live, indexed] = await Promise.all([liveIds(step), indexIds(step)]);
      const liveSet = new Set(live);
      const indexedLive = indexed.filter((id) => liveSet.has(id)).length;
      return {
        key: step.key,
        label: step.label,
        total: live.length,
        indexed: indexedLive,
        missing: live.length - indexedLive,
        outdated: indexed.length - indexedLive,
      };
    }));
    return NextResponse.json({ success: true, steps, ready: !!process.env.GEMINI_API_KEY });
  } catch {
    return NextResponse.json({ success: false, message: 'Could not read the index status.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requirePermission('ai', 'full');
  if (denied) return denied;

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { success: false, message: 'Add a valid GEMINI_API_KEY to enable knowledge-base reindexing.' },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const step = STEPS.find((s) => s.key === body?.step);
  const offset = Math.max(0, Number(body?.offset) || 0);
  if (!step) {
    return NextResponse.json({ success: false, message: 'Reload the page to use the new reindex.' }, { status: 400 });
  }

  await connectDB();
  const failed: { id: string; error: string }[] = [];
  let upserted = 0;
  let total = 0;

  // Embed one batch, a few at a time; one failure never stops the rest.
  const run = async <T,>(items: T[], idOf: (t: T) => string, sync: (t: T) => Promise<void>) => {
    for (let i = 0; i < items.length; i += CONCURRENCY) {
      const part = items.slice(i, i + CONCURRENCY);
      const outcomes = await Promise.allSettled(part.map(sync));
      outcomes.forEach((o, j) => {
        if (o.status === 'fulfilled') upserted++;
        else failed.push({ id: idOf(part[j]), error: (o.reason as any)?.message || String(o.reason) });
      });
    }
  };

  let currentIds: string[] | null = null;
  if (step.key === 'faq_site') {
    const all = await siteFaqs();
    total = all.length;
    currentIds = all.map((f) => f.id);
    await run(all.slice(offset, offset + BATCH), (f) => f.question, (f) => upsertChunk('faq', f.id, buildFaqChunk(f)));
  } else {
    const { model, filter } = step.load!();
    total = await model.countDocuments(filter);
    const docs = await model.find(filter).sort({ _id: 1 }).skip(offset).limit(BATCH).lean();
    await run(docs, (d: any) => String(d._id), (d: any) => syncKnowledgeChunk(step.sourceType, d));
  }

  const processed = Math.min(offset + BATCH, total);
  const done = processed >= total;

  // On the last batch, remove this step's entries for items that were
  // deleted, unpublished or deactivated.
  let removed = 0;
  if (done) {
    if (step.key === 'faq_site') {
      removed = await removeStaleSiteFaqChunks(new Set(currentIds || []));
    } else {
      const keep = await liveIds(step);
      const indexed = await indexIds(step);
      const keepSet = new Set(keep);
      const stale = indexed.filter((id) => !keepSet.has(id));
      if (stale.length) {
        const res = await (KnowledgeChunk as any).deleteMany({ sourceType: step.sourceType, sourceId: { $in: stale } });
        removed = res?.deletedCount || 0;
      }
    }
  }

  return NextResponse.json({ success: true, step: step.key, total, processed, upserted, failed, removed, done });
}
