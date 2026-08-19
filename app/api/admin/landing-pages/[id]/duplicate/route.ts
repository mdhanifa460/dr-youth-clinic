import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { LandingPage } from '@/app/models/LandingPage';
import { requirePermission } from '@/app/lib/adminAuth';
import { generateUniqueLandingPageSlug } from '@/app/lib/landingPages/uniqueSlug';

// Clones an existing landing page's content (sections, form, tracking, SEO,
// template) into a new draft — for the common case where a new campaign
// is 95% the same page with a few details changed, rather than rebuilding
// from scratch. Resets exactly what a fresh copy needs reset: a new unique
// slug (never the source's own — that's still live), status forced back to
// 'draft' regardless of the source's status (a duplicate should never go
// live by itself), and every analytics counter zeroed (a copy has no
// traffic of its own yet). Tracking IDs, form fields, and sections are
// carried over as-is — for a "same campaign, different landing page"
// duplicate, keeping the same GTM/Meta Pixel/Google Ads IDs is usually
// exactly what's wanted, and easy to change on the new page's own Tracking
// tab if not.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const denied = await requirePermission('landing-pages', 'full');
  if (denied) return denied;

  try {
    await connectDB();

    const source = await (LandingPage as any).findById(params.id).lean();
    if (!source) {
      return NextResponse.json({ success: false, message: 'Landing page not found' }, { status: 404 });
    }

    const title = `${source.title} (Copy)`;
    const slug = await generateUniqueLandingPageSlug(`${source.slug}-copy`);

    const copy = new LandingPage({
      title,
      slug,
      status: 'draft',
      template: source.template,
      // Deliberately not copied — the whole point of duplicating for a
      // city-wise variant is a fresh, explicit choice per copy; carrying
      // the source's city over would leave two pages silently claiming the
      // same city until someone remembers to change it.
      city: '',
      seo: source.seo,
      sections: source.sections,
      form: source.form,
      tracking: source.tracking,
      abTest: {
        enabled: source.abTest?.enabled ?? false,
        variantB: { sections: source.abTest?.variantB?.sections ?? [], leads: 0, visitors: 0 },
      },
      analytics: { visitors: 0, leads: 0 },
      layoutEngineEnabled: source.layoutEngineEnabled ?? false,
    });

    await copy.save();

    return NextResponse.json(
      { success: true, data: copy, message: 'Landing page duplicated successfully' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error duplicating landing page:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors ?? {}).map((e: any) => e.message);
      return NextResponse.json({ success: false, message: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Failed to duplicate landing page' }, { status: 500 });
  }
}
