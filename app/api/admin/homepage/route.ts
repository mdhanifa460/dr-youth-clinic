import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import { HomepageSection } from '@/app/models/HomepageSection';
import { HOMEPAGE_DEFAULTS } from '@/app/lib/homepageDefaults';
import { normalizeLegacyImageUrls } from '@/app/lib/legacyImageUrls';
import { requirePermission } from '@/app/lib/adminAuth';
import { syncFaqChunks } from '@/app/lib/rag/KnowledgeBase';
import { flattenStaticFaqs } from '@/app/lib/rag/staticFaqs';

export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await requirePermission('homepage', 'view');
  if (denied) return denied;

  try {
    await connectDB();

    let sections = await HomepageSection.find({} as any).sort({ order: 1 }).lean();

    // Seed any default section keys that don't exist yet — covers both the
    // first-ever load (empty collection) and new section types added later.
    const existingKeys = new Set(sections.map((s: any) => s.sectionKey));
    const missing = Object.entries(HOMEPAGE_DEFAULTS).filter(([key]) => !existingKeys.has(key));
    if (missing.length > 0) {
      const defaults = missing.map(([key, val]) => ({
        sectionKey: key,
        label: val.label,
        order: val.order,
        visible: val.visible,
        data: val.data,
      }));
      await HomepageSection.insertMany(defaults as any, { ordered: false }).catch(() => {});
      sections = await HomepageSection.find({} as any).sort({ order: 1 }).lean();
    }

    return NextResponse.json({
      success: true,
      sections: normalizeLegacyImageUrls(sections),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requirePermission('homepage', 'full');
  if (denied) return denied;

  try {
    await connectDB();

    const { sections } = await req.json();

    if (!Array.isArray(sections)) {
      return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 });
    }

    const normalizedSections = normalizeLegacyImageUrls(sections);

    const ops = normalizedSections.map((s: any) => ({
      updateOne: {
        filter: { sectionKey: s.sectionKey },
        update: {
          $set: {
            label: s.label,
            order: s.order,
            visible: s.visible,
            data: s.data,
          },
        },
        upsert: true,
      },
    }));

    await (HomepageSection as any).bulkWrite(ops);
    revalidateTag('homepage-layout');

    // Keep the RAG knowledge base's FAQ chunks in sync — fire-and-forget +
    // logged, never allowed to fail the actual homepage save. FAQs have no
    // per-document home to hook a save/update middleware on (they live inside
    // this one section's Mixed `data.faqs` array), so this PUT route is the
    // only viable sync trigger.
    const faqSection = normalizedSections.find((s: any) => s.sectionKey === 'faq');
    if (faqSection) {
      syncFaqChunks(flattenStaticFaqs(), faqSection.data?.faqs ?? [])
        .then((r) => {
          if (r.failed.length > 0) console.error('[KB] faq sync had failures', r.failed);
        })
        .catch((e) => console.error('[KB] faq sync failed', e));
    }

    return NextResponse.json({ success: true, message: 'Homepage saved successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
