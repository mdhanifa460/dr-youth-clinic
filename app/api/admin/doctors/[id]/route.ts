import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Doctor } from '@/app/models/Doctor';
import { deleteImage } from '@/app/lib/cloudinary';
import { requirePermission } from '@/app/lib/adminAuth';
import { removeChunk } from '@/app/lib/rag/KnowledgeBase';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('doctors', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const doctor = await (Doctor as any).findById(params.id).lean();
    if (!doctor) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: doctor });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to fetch doctor' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('doctors', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();
    const doctor = await (Doctor as any).findByIdAndUpdate(params.id, body, { new: true, runValidators: true });
    if (!doctor) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: doctor });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors ?? {}).map((e: any) => e.message);
      return NextResponse.json({ success: false, message: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Failed to update doctor' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('doctors', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const doctor = await (Doctor as any).findById(params.id);
    if (!doctor) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    if (doctor.photo?.publicId) await deleteImage(doctor.photo.publicId).catch(console.error);
    await (Doctor as any).findByIdAndDelete(params.id);
    removeChunk('doctor', params.id).catch(console.error);
    return NextResponse.json({ success: true, message: 'Doctor deleted' });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to delete doctor' }, { status: 500 });
  }
}
