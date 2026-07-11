import { NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { getAdminUser } from '@/app/lib/adminAuth';
import { canAccess } from '@/app/lib/permissions';
import { Service } from '@/app/models/Service';
import { LandingPage } from '@/app/models/LandingPage';
import { Video } from '@/app/models/Video';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();
    const [services, landingPages, videos] = await Promise.all([
      canAccess(user.role, 'services') ? (Service as any).countDocuments({ status: 'draft' }) : 0,
      canAccess(user.role, 'landing-pages') ? (LandingPage as any).countDocuments({ status: 'draft' }) : 0,
      canAccess(user.role, 'videos') ? (Video as any).countDocuments({ status: 'draft' }) : 0,
    ]);
    return NextResponse.json({ services, landingPages, videos });
  } catch {
    return NextResponse.json({ services: 0, landingPages: 0, videos: 0 });
  }
}
