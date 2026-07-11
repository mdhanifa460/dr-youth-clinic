import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { getAdminUser } from '@/app/lib/adminAuth';
import { canAccess } from '@/app/lib/permissions';
import { Service } from '@/app/models/Service';
import { Doctor } from '@/app/models/Doctor';
import { Blog } from '@/app/models/Blog';
import { LandingPage } from '@/app/models/LandingPage';
import { Offer } from '@/app/models/Offer';
import { Video } from '@/app/models/Video';

export const dynamic = 'force-dynamic';

const LIMIT = 5;

type Result = { type: string; label: string; sublabel?: string; href: string };

export async function GET(req: NextRequest) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const q = (req.nextUrl.searchParams.get('q') || '').trim();
  if (q.length < 2) return NextResponse.json({ results: [] });

  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rx = new RegExp(escaped, 'i');

  try {
    await connectDB();

    const tasks: Promise<Result[]>[] = [];

    if (canAccess(user.role, 'services')) {
      tasks.push(
        (Service as any).find({ name: rx }).select('name location category').limit(LIMIT).lean()
          .then((docs: any[]) => docs.map((d) => ({
            type: 'Service',
            label: d.name,
            sublabel: [d.category, d.location].filter(Boolean).join(' · '),
            href: `/admin/services/${d._id}`,
          })))
      );
    }
    if (canAccess(user.role, 'doctors')) {
      tasks.push(
        (Doctor as any).find({ name: rx }).select('name title').limit(LIMIT).lean()
          .then((docs: any[]) => docs.map((d) => ({
            type: 'Doctor',
            label: d.name,
            sublabel: d.title,
            href: `/admin/doctors`,
          })))
      );
    }
    if (canAccess(user.role, 'blog')) {
      tasks.push(
        (Blog as any).find({ title: rx }).select('title').limit(LIMIT).lean()
          .then((docs: any[]) => docs.map((d) => ({
            type: 'Blog Post',
            label: d.title,
            href: `/admin/blog`,
          })))
      );
    }
    if (canAccess(user.role, 'landing-pages')) {
      tasks.push(
        (LandingPage as any).find({ title: rx }).select('title slug').limit(LIMIT).lean()
          .then((docs: any[]) => docs.map((d) => ({
            type: 'Landing Page',
            label: d.title,
            sublabel: d.slug ? `/lp/${d.slug}` : undefined,
            href: `/admin/landing-pages/${d._id}`,
          })))
      );
    }
    if (canAccess(user.role, 'offers')) {
      tasks.push(
        (Offer as any).find({ title: rx }).select('title').limit(LIMIT).lean()
          .then((docs: any[]) => docs.map((d) => ({
            type: 'Offer',
            label: d.title,
            href: `/admin/offers`,
          })))
      );
    }
    if (canAccess(user.role, 'videos')) {
      tasks.push(
        (Video as any).find({ title: rx }).select('title').limit(LIMIT).lean()
          .then((docs: any[]) => docs.map((d) => ({
            type: 'Video',
            label: d.title,
            href: `/admin/videos/${d._id}`,
          })))
      );
    }

    const settled = await Promise.all(tasks);
    return NextResponse.json({ results: settled.flat() });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
