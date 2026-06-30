import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Blog } from '@/app/models/Blog';
import { deleteImage } from '@/app/lib/cloudinary';
import { getAdminSession } from '@/app/lib/adminAuth';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectDB();
    const post = await (Blog as any).findById(params.id).lean();
    if (!post) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: post });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to fetch post' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorised' }, { status: 401 });

  try {
    await connectDB();
    const body = await req.json();
    const post = await (Blog as any).findByIdAndUpdate(params.id, body, { new: true, runValidators: true });
    if (!post) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: post });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors ?? {}).map((e: any) => e.message);
      return NextResponse.json({ success: false, message: messages.join(', ') }, { status: 400 });
    }
    if (error.code === 11000) {
      return NextResponse.json({ success: false, message: 'A post with this slug already exists' }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Failed to update post' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorised' }, { status: 401 });

  try {
    await connectDB();
    const post = await (Blog as any).findById(params.id);
    if (!post) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    if (post.coverImage?.publicId) await deleteImage(post.coverImage.publicId).catch(console.error);
    await (Blog as any).findByIdAndDelete(params.id);
    return NextResponse.json({ success: true, message: 'Post deleted' });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to delete post' }, { status: 500 });
  }
}
