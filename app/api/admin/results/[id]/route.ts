import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Result } from '@/app/models/Result';
import { requirePermission } from '@/app/lib/adminAuth';
import { revalidateTag } from 'next/cache';

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('results', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const result = await (Result as any).findById(params.id).populate('service', 'name').populate('doctor', 'name').lean();
    if (!result) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: result });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to fetch result' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('results', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();
    if (!body.service) body.service = null;
    if (!body.doctor) body.doctor = null;
    if (!body.branch) body.branch = null;

    // findByIdAndUpdate bypasses the 'save' hook that auto-generates a slug
    // on create — regenerate here too when the admin clears it, or editing
    // a result to a blank slug would fail the schema's format validator.
    if (!body.slug && body.title) {
      const base = slugify(body.title);
      let slug = base;
      let counter = 1;
      while (await (Result as any).exists({ slug, _id: { $ne: params.id } })) {
        slug = `${base}-${counter}`;
        counter++;
      }
      body.slug = slug;
    }

    const result = await (Result as any).findByIdAndUpdate(params.id, body, { new: true, runValidators: true });
    if (!result) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    revalidateTag('results');
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors ?? {}).map((e: any) => e.message);
      return NextResponse.json({ success: false, message: messages.join(', ') }, { status: 400 });
    }
    if (error.code === 11000) {
      return NextResponse.json({ success: false, message: 'That slug is already in use' }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Failed to update result' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('results', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const result = await (Result as any).findByIdAndDelete(params.id);
    if (!result) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    revalidateTag('results');
    return NextResponse.json({ success: true, message: 'Result deleted' });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to delete result' }, { status: 500 });
  }
}
