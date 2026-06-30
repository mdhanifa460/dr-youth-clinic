import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Category, DEFAULT_CATEGORIES } from '@/app/models/Category';
import { getAdminSession } from '@/app/lib/adminAuth';

export async function GET() {
  try {
    await connectDB();

    // Auto-seed the 4 default categories if none exist
    const count = await Category.countDocuments({} as any);
    if (count === 0) {
      await Category.insertMany(DEFAULT_CATEGORIES as any);
    }

    const categories = await Category.find({} as any).sort({ order: 1 }).lean();
    return NextResponse.json({ success: true, data: categories });
  } catch {
    return NextResponse.json({ success: false, message: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ success: false, message: 'Unauthorised' }, { status: 401 });

  try {
    await connectDB();
    const body = await req.json();
    // Auto-generate dbKey from label if not provided
    if (!body.dbKey) body.dbKey = body.label?.trim();
    const category = await Category.create(body);
    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, message: 'A category with this slug already exists' }, { status: 409 });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors ?? {}).map((e: any) => e.message);
      return NextResponse.json({ success: false, message: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: 'Failed to create category' }, { status: 500 });
  }
}
