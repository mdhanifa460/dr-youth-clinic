import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Result } from '@/app/models/Result';
import { requirePermission } from '@/app/lib/adminAuth';
import { revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const denied = await requirePermission('results', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const featured = searchParams.get('featured');
    const search = searchParams.get('search');

    const query: any = {};
    if (status) query.status = status;
    if (featured) query.featured = featured === 'true';
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ title: re }, { description: re }, { category: re }];
    }

    const results = await (Result as any)
      .find(query)
      .populate('service', 'name')
      .populate('doctor', 'name')
      .sort({ order: 1, createdAt: -1 })
      .lean();
    return NextResponse.json({ success: true, data: results });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to fetch results' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requirePermission('results', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();
    if (!body.service) delete body.service;
    if (!body.doctor) delete body.doctor;
    if (!body.branch) delete body.branch;
    const result = await Result.create(body);
    revalidateTag('results');
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors ?? {}).map((e: any) => e.message);
      return NextResponse.json({ success: false, message: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Failed to create result' }, { status: 500 });
  }
}
