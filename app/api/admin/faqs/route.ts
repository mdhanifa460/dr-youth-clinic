import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Faq } from '@/app/models/Faq';
import { requirePermission } from '@/app/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const denied = await requirePermission('faqs', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    const query: any = {};
    if (category) query.category = category;
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ question: re }, { answer: re }, { tags: re }];
    }

    const faqs = await (Faq as any)
      .find(query)
      .populate('doctor', 'name')
      .populate('service', 'name')
      .sort({ order: 1, createdAt: -1 })
      .lean();
    return NextResponse.json({ success: true, data: faqs });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to fetch FAQs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requirePermission('faqs', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();
    if (!body.doctor) delete body.doctor;
    if (!body.service) delete body.service;
    const faq = await Faq.create(body);
    return NextResponse.json({ success: true, data: faq }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors ?? {}).map((e: any) => e.message);
      return NextResponse.json({ success: false, message: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Failed to create FAQ' }, { status: 500 });
  }
}
