import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Achievement } from '@/app/models/Achievement';
import { requirePermission } from '@/app/lib/adminAuth';
import { revalidateTag } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  const denied = await requirePermission('achievements', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const achievements = await (Achievement as any).find({}).sort({ order: 1, createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: achievements });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to fetch achievements' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requirePermission('achievements', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();
    const achievement = await Achievement.create(body);
    revalidateTag('achievements');
    return NextResponse.json({ success: true, data: achievement }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors ?? {}).map((e: any) => e.message);
      return NextResponse.json({ success: false, message: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Failed to create achievement' }, { status: 500 });
  }
}
