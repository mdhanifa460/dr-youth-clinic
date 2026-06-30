import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { connectDB } from '@/app/lib/mongodb';
import { HomepageSection } from '@/app/models/HomepageSection';
import { getAdminSession } from '@/app/lib/adminAuth';

const SECTION_KEY = 'doctors_page';

export async function GET() {
  try {
    await connectDB();
    const s = await HomepageSection.findOne({ sectionKey: SECTION_KEY } as any).lean() as any;
    return NextResponse.json({ success: true, data: s?.data || {} });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorised' }, { status: 401 });

  try {
    await connectDB();
    const data = await req.json();
    await (HomepageSection as any).findOneAndUpdate(
      { sectionKey: SECTION_KEY },
      { $set: { sectionKey: SECTION_KEY, label: 'Doctors Listing Page', order: 99, visible: true, data } },
      { upsert: true, new: true }
    );
    revalidateTag('doctors-page');
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
