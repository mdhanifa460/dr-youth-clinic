import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Service } from '@/app/models/Service';
import { Doctor } from '@/app/models/Doctor';
import { Blog } from '@/app/models/Blog';
import { Video } from '@/app/models/Video';
import { Result } from '@/app/models/Result';
import { Faq } from '@/app/models/Faq';
import { requirePermission } from '@/app/lib/adminAuth';
import { isBlockEmpty } from '@/app/lib/contentBlocks/health';

export const dynamic = 'force-dynamic';

// Everything here is computed from data the platform already has — no new
// integration, no external API. Two different questions, both real and
// previously invisible without opening every admin module one at a time:
//
// 1. Completeness — which existing records are thin/unfinished (missing
//    photo, no SEO score, not doctor-reviewed)?
// 2. Coverage gaps — which *services* have zero supporting content (no
//    linked video, before/after result, or FAQ) pointing at them?
export async function GET() {
  const denied = await requirePermission('dashboard', 'view');
  if (denied) return denied;

  try {
    await connectDB();

    const [services, doctors, blogs, videos, results, faqs] = await Promise.all([
      (Service as any).find({ status: 'active' }).select('name category seoScore heroImage narrativeBlocks').lean(),
      (Doctor as any).find({ active: true }).select('name photo bio qualifications').lean(),
      (Blog as any).find({ active: true }).select('title reviewedByDoctorId excerpt').lean(),
      (Video as any).find({ status: 'published' }).select('service').lean(),
      (Result as any).find({ status: 'published' }).select('service').lean(),
      (Faq as any).find({ active: true }).select('service').lean(),
    ]);

    // Completeness signals
    const thinServices = services
      .filter((s: any) => !s.seoScore || s.seoScore < 50)
      .map((s: any) => ({ id: s._id, name: s.name, seoScore: s.seoScore || 0 }));

    const incompleteDoctors = doctors
      .filter((d: any) => !d.photo?.url || !d.bio?.trim() || !d.qualifications?.trim())
      .map((d: any) => ({
        id: d._id,
        name: d.name,
        missing: [!d.photo?.url && 'photo', !d.bio?.trim() && 'bio', !d.qualifications?.trim() && 'qualifications'].filter(Boolean),
      }));

    const unreviewedBlogs = blogs
      .filter((b: any) => !b.reviewedByDoctorId)
      .map((b: any) => ({ id: b._id, title: b.title }));

    // Coverage gap — services with no linked video/result/faq at all
    const servicesWithContent = new Set<string>();
    for (const v of videos) if (v.service) servicesWithContent.add(String(v.service));
    for (const r of results) if (r.service) servicesWithContent.add(String(r.service));
    for (const f of faqs) if (f.service) servicesWithContent.add(String(f.service));

    // A service can also carry its own before/after comparison directly
    // inside its page content (the Content Block Builder's "before-after"
    // block type, stored in narrativeBlocks) rather than via a standalone
    // Result document linked through the `service` field above — those are
    // two different, equally valid ways to add a before/after, and this
    // check previously only recognized the standalone-Result path. Without
    // this, a service with a complete, filled-in embedded before/after (and
    // a passing per-page Content Health score) still showed up here as
    // having "no supporting content," which is what was actually happening.
    for (const s of services) {
      const hasEmbeddedBeforeAfter = (s.narrativeBlocks || []).some(
        (b: any) => b?.visible && b?.type === 'before-after' && !isBlockEmpty(b)
      );
      if (hasEmbeddedBeforeAfter) servicesWithContent.add(String(s._id));
    }

    const contentGapServices = services
      .filter((s: any) => !servicesWithContent.has(String(s._id)))
      .map((s: any) => ({ id: s._id, name: s.name, category: s.category }));

    return NextResponse.json({
      success: true,
      data: {
        counts: {
          totalServices: services.length,
          thinServices: thinServices.length,
          totalDoctors: doctors.length,
          incompleteDoctors: incompleteDoctors.length,
          totalBlogs: blogs.length,
          unreviewedBlogs: unreviewedBlogs.length,
          contentGapServices: contentGapServices.length,
        },
        thinServices,
        incompleteDoctors,
        unreviewedBlogs,
        contentGapServices,
      },
    });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to compute content health' }, { status: 500 });
  }
}
