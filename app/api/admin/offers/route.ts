import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Offer } from '@/app/models/Offer';
import { requirePermission } from '@/app/lib/adminAuth';
import { revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await requirePermission('offers', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const offers = await (Offer as any).find({}).sort({ order: 1, createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: offers });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to fetch offers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requirePermission('offers', 'full');
  if (denied) return denied;

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
