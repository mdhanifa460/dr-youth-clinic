import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Doctor } from '@/app/models/Doctor';
import { requirePermission } from '@/app/lib/adminAuth';

export async function GET() {
  const denied = await requirePermission('doctors', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const doctors = await Doctor.find({} as any).sort({ order: 1, createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: doctors });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch doctors' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requirePermission('doctors', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();
    const doctor = await Doctor.create(body);
    return NextResponse.json({ success: true, data: doctor }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors ?? {}).map((e: any) => e.message);
      return NextResponse.json({ success: false, message: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Failed to create doctor' }, { status: 500 });
  }
}
