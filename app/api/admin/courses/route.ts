import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Course } from '@/app/models/Course';
// Registers Doctor with Mongoose for the .populate() call below — see
// app/api/admin/videos/route.ts for why this import can't be dropped.
import '@/app/models/Doctor';
import { requirePermission } from '@/app/lib/adminAuth';

export async function GET(req: NextRequest) {
  const denied = await requirePermission('courses', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const query: Record<string, any> = {};
    if (category) query.category = category;

    const courses = await (Course as any)
      .find(query)
      .sort({ displayOrder: 1, createdAt: -1 })
      .populate('instructors', 'name photo title')
      .lean();

    return NextResponse.json({ success: true, data: courses });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to fetch courses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requirePermission('courses', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();
    const course = await Course.create(body);
    return NextResponse.json({ success: true, data: course, message: 'Course created successfully' }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to create course' }, { status: 500 });
  }
}
