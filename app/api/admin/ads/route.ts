import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { HomepageSection } from '@/app/models/HomepageSection';
import { getAdminSession } from '@/app/lib/adminAuth';
import { revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    const doc = await (HomepageSection as any).findOne({ sectionKey: 'ads_config' }).lean() as any;
    return NextResponse.json({ success: true, data: doc?.data ?? null });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to fetch ads config' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorised' }, { status: 401 });

  try {
    await connectDB();
    const body = await req.json();
    await (HomepageSection as any).findOneAndUpdate(
      { sectionKey: 'ads_config' },
      { $set: { data: body, visible: true, label: 'Ads Configuration', order: 99 } },
      { upsert: true, new: true }
    );
    revalidateTag('ads-config');
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to save ads config' }, { status: 500 });
  }
}
