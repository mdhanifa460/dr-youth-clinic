import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Service } from '@/app/models/Service';
import { Doctor } from '@/app/models/Doctor';
import { Blog } from '@/app/models/Blog';
import { Video } from '@/app/models/Video';
import { Result } from '@/app/models/Result';
import { Faq } from '@/app/models/Faq';
import { requirePermission } from '@/app/lib/adminAuth';

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
      (Service as any).find({ status: 'active' }).select('name category seoScore heroImage').lean(),
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
