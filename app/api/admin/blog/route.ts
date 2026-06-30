import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Blog } from '@/app/models/Blog';
import { getAdminSession } from '@/app/lib/adminAuth';

export async function GET() {
  try {
    await connectDB();
    const posts = await Blog.find({} as any).sort({ publishedAt: -1 }).lean();
    return NextResponse.json({ success: true, data: posts });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to fetch posts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorised' }, { status: 401 });

  try {
    await connectDB();
    const body = await req.json();
    const post = await Blog.create(body);
    return NextResponse.json({ success: true, data: post }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors ?? {}).map((e: any) => e.message);
      return NextResponse.json({ success: false, message: messages.join(', ') }, { status: 400 });
    }
    if (error.code === 11000) {
      return NextResponse.json({ success: false, message: 'A post with this slug already exists' }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Failed to create post' }, { status: 500 });
  }
}
