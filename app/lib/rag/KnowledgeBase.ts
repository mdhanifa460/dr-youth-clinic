import { createHash } from 'crypto';
import { connectDB } from '@/app/lib/mongodb';
import { KnowledgeChunk, IKnowledgeChunk } from '@/app/models/KnowledgeChunk';
import { embedText } from './EmbeddingService';
import { getServiceCities, getEffectiveSlug } from '@/app/lib/serviceSeo';

export interface ChunkInput {
  title: string;
  text: string;
  category?: string;
  location?: string;
  url?: string;
}

// name + narrative + heroDescription + benefits + the service's own faq[]
// field (Service.ts already has a per-service FAQ array, separate from the
// site-wide FAQ page) — flattened into one text blob for embedding.
export function buildServiceChunk(doc: any): ChunkInput {
  const benefitsText = (doc.benefits || [])
    .map((b: any) => [b.title, b.description].filter(Boolean).join(': '))
    .join('\n');
  const faqText = (doc.faq || [])
    .map((f: any) => `Q: ${f.question}\nA: ${f.answer}`)
    .join('\n');
  const text = [doc.narrative, doc.heroDescription, benefitsText, faqText]
    .filter(Boolean)
    .join('\n\n');

  // Real service pages are nested per-city: /[location]/services/[category]/[slug]
  // (confirmed via app/sitemap.ts, which builds URLs the same way) — a flat
  // /services/<slug> route doesn't exist. Pick the first targeted city as the
  // one representative citation URL for this chunk.
  const cities = getServiceCities(doc);
  const city = cities[0];
  const url = city && doc.urlSlug
    ? `/${city}/services/${String(doc.category || '').toLowerCase()}/${getEffectiveSlug(doc, city)}`
    : undefined;

  return {
    title: doc.name,
    text: text || doc.name,
    category: doc.category,
    location: city,
    url,
  };
}

// title + qualifications + bio + specializations — no individual public
// doctor page exists (confirmed: only a /doctors listing), so every doctor
// chunk links to that shared listing.
export function buildDoctorChunk(doc: any): ChunkInput {
  const text = [
    doc.title,
    doc.qualifications,
    doc.bio,
    (doc.specializations || []).join(', '),
  ].filter(Boolean).join('\n');

  return {
    title: doc.name,
    text: text || doc.name,
    location: (doc.locations || [])[0],
    url: '/doctors',
  };
}

export function buildBlogChunk(doc: any): ChunkInput {
  const text = [doc.excerpt, doc.body].filter(Boolean).join('\n\n');
  return {
    title: doc.title,
    text: text || doc.title,
    category: doc.category,
    url: doc.slug ? `/blog/${doc.slug}` : undefined,
  };
}

// clinicInfo.description + specialties + whyUs — the per-city public page
// content (app/(public)/[location]/page.tsx).
export function buildLocationChunk(doc: any): ChunkInput {
  const info = doc.clinicInfo || {};
  const whyUsText = (info.whyUs || [])
    .map((w: any) => [w.title, w.desc].filter(Boolean).join(': '))
    .join('\n');
  const text = [info.description, (info.specialties || []).join(', '), whyUsText]
    .filter(Boolean)
    .join('\n\n');

  return {
    title: `DR Youth Clinic — ${doc.location}`,
    text: text || doc.location,
    location: doc.location,
    url: doc.location ? `/${doc.location}` : undefined,
  };
}

// title + description + category + sessions/duration — feeds the AI chatbot
// with real patient-result context (e.g. "how many sessions for hair PRP?").
export function buildResultChunk(doc: any): ChunkInput {
  const facts = [
    doc.sessions ? `Sessions: ${doc.sessions}` : '',
    doc.duration ? `Duration: ${doc.duration}` : '',
    doc.patientAge ? `Patient age: ${doc.patientAge}` : '',
  ].filter(Boolean).join('\n');
  const text = [doc.description, facts].filter(Boolean).join('\n\n');

  return {
    title: doc.title,
    text: text || doc.title,
    category: doc.category,
    location: doc.branch && doc.branch !== 'all' ? doc.branch : undefined,
    url: doc.slug ? `/results/${doc.slug}` : '/results',
  };
}

export function buildFaqChunk(faq: { question: string; answer: string; category?: string }): ChunkInput {
  return {
    title: faq.question,
    text: `Q: ${faq.question}\nA: ${faq.answer}`,
    category: faq.category,
    url: '/faqs',
  };
}

// Stable id for an FAQ chunk — FAQs have no natural _id (STATIC_FAQS is a TS
// array, CMS FAQs live inside a Mixed blob), so the question text itself is
// the identity. sha1 keeps sourceId a short, deterministic string.
function faqSourceId(question: string): string {
  return createHash('sha1').update(question).digest('hex');
}

// Builders are looked up by sourceType so syncKnowledgeChunk stays a single
// entry point as more source types are wired in later steps.
const BUILDERS: Partial<Record<IKnowledgeChunk['sourceType'], (doc: any) => ChunkInput>> = {
  service: buildServiceChunk,
  doctor: buildDoctorChunk,
  blog: buildBlogChunk,
  location: buildLocationChunk,
  result: buildResultChunk,
};

export async function upsertChunk(
  sourceType: IKnowledgeChunk['sourceType'],
  sourceId: string,
  chunk: ChunkInput
): Promise<void> {
  await connectDB();
  const embedding = await embedText(chunk.text);
  await KnowledgeChunk.findOneAndUpdate(
    { sourceType, sourceId },
    {
      $set: {
        ...chunk,
        embedding,
        embeddingModel: 'gemini-embedding-001',
        embeddingUpdatedAt: new Date(),
      },
    },
    { upsert: true }
  );
}

export async function removeChunk(sourceType: IKnowledgeChunk['sourceType'], sourceId: string): Promise<void> {
  await connectDB();
  await KnowledgeChunk.deleteOne({ sourceType, sourceId });
}

// Single entry point called from each model's save/update hooks. Silently
// no-ops for source types that don't have a builder wired up yet (rolled out
// incrementally across steps) rather than throwing on an unrecognized type.
export async function syncKnowledgeChunk(sourceType: IKnowledgeChunk['sourceType'], doc: any): Promise<void> {
  const builder = BUILDERS[sourceType];
  if (!builder || !doc?._id) return;
  const chunk = builder(doc);
  await upsertChunk(sourceType, String(doc._id), chunk);
}

// Reconciles the full current FAQ set (static + CMS) against existing
// sourceType:'faq' chunks — upserts every current question, and removes any
// chunk whose question no longer exists (a deleted/renamed FAQ). CMS entries
// take priority on a question-text collision, mirroring the same priority
// direction as the merge in app/(public)/faqs/page.tsx. Each FAQ is upserted
// independently — one embedding failure doesn't abort the rest of the batch,
// same principle as the admin reindex route.
export async function syncFaqChunks(
  staticFaqs: { question: string; answer: string; category: string }[],
  cmsFaqs: { question: string; answer: string; category?: string }[]
): Promise<{ upserted: number; removed: number; failed: { question: string; error: string }[] }> {
  await connectDB();

  const seen = new Set<string>();
  const deduped: { question: string; answer: string; category?: string }[] = [];
  for (const faq of [...cmsFaqs, ...staticFaqs]) {
    if (seen.has(faq.question)) continue;
    seen.add(faq.question);
    deduped.push(faq);
  }

  let upserted = 0;
  const currentIds = new Set<string>();
  const failed: { question: string; error: string }[] = [];
  for (const faq of deduped) {
    const id = faqSourceId(faq.question);
    currentIds.add(id);
    try {
      await upsertChunk('faq', id, buildFaqChunk(faq));
      upserted++;
    } catch (e: any) {
      failed.push({ question: faq.question, error: e.message || String(e) });
    }
  }

  const existing = await KnowledgeChunk.find({ sourceType: 'faq' }).select('sourceId').lean();
  const staleIds = existing
    .map((c: any) => c.sourceId)
    .filter((id: string) => !currentIds.has(id));

  let removed = 0;
  if (staleIds.length > 0) {
    const res = await KnowledgeChunk.deleteMany({ sourceType: 'faq', sourceId: { $in: staleIds } });
    removed = res.deletedCount || 0;
  }

  return { upserted, removed, failed };
}
