import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Blog } from '@/app/models/Blog';
import { requirePermission } from '@/app/lib/adminAuth';

export async function GET(req: NextRequest) {
  const denied = await requirePermission('blog', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const { searchParams } = req.nextUrl;

    const query: Record<string, any> = {};
    const category = searchParams.get('category');
    if (category) query.category = category;
    const active = searchParams.get('active');
    if (active === 'true' || active === 'false') query.active = active === 'true';
    const search = searchParams.get('search')?.trim();
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = new RegExp(escaped, 'i');
      query.$or = [{ title: rx }, { excerpt: rx }];
    }

    const posts = await Blog.find(query as any).sort({ publishedAt: -1 }).lean();
    return NextResponse.json({ success: true, data: posts });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to fetch posts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requirePermission('blog', 'full');
  if (denied) return denied;

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
