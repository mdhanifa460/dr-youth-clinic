import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Offer } from '@/app/models/Offer';
import { getAdminSession } from '@/app/lib/adminAuth';
import { revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    const offers = await (Offer as any).find({}).sort({ order: 1, createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: offers });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to fetch offers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorised' }, { status: 401 });

  try {
    await connectDB();
    const body = await req.json();
    const offer = await Offer.create(body);
    revalidateTag('offers');
    return NextResponse.json({ success: true, data: offer }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors ?? {}).map((e: any) => e.message);
      return NextResponse.json({ success: false, message: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Failed to create offer' }, { status: 500 });
  }
}
