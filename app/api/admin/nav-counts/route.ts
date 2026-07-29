import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { getAdminUser } from '@/app/lib/adminAuth';
import { canAccess } from '@/app/lib/permissions';
import { Service } from '@/app/models/Service';
import { LandingPage } from '@/app/models/LandingPage';
import { Video } from '@/app/models/Video';
import { Course } from '@/app/models/Course';
import { AnimationAsset } from '@/app/models/AnimationAsset';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();
    const [services, landingPages, videos, courses, animationAssets] = await Promise.all([
      canAccess(user.role, 'services') ? (Service as any).countDocuments({ status: 'draft' }) : 0,
      canAccess(user.role, 'landing-pages') ? (LandingPage as any).countDocuments({ status: 'draft' }) : 0,
      canAccess(user.role, 'videos') ? (Video as any).countDocuments({ status: 'draft' }) : 0,
      canAccess(user.role, 'courses') ? (Course as any).countDocuments({ status: 'draft' }) : 0,
      canAccess(user.role, 'animation-library') ? (AnimationAsset as any).countDocuments({ status: 'draft' }) : 0,
    ]);
    return NextResponse.json({ services, landingPages, videos, courses, animationAssets });
  } catch {
    return NextResponse.json({ services: 0, landingPages: 0, videos: 0, courses: 0, animationAssets: 0 });
  }
}
