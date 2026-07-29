import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { Course } from '@/app/models/Course';
// Registers Doctor with Mongoose for the .populate() call below.
import '@/app/models/Doctor';
import { requirePermission } from '@/app/lib/adminAuth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('courses', 'view');
  if (denied) return denied;

  try {
    await connectDB();
    const course = await (Course as any).findById(params.id).populate('instructors');
    if (!course) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: course });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to fetch course' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('courses', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const body = await req.json();
    // findByIdAndUpdate bypasses document middleware (pre('save')) — using
    // it here means editing a course's title never recomputes its slug.
    // Loading the document and calling .save() runs that hook every time.
    const course = await (Course as any).findById(params.id);
    if (!course) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    Object.assign(course, body);
    await course.save();
    return NextResponse.json({ success: true, data: course, message: 'Course updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to update course' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = await requirePermission('courses', 'full');
  if (denied) return denied;

  try {
    await connectDB();
    const course = await (Course as any).findByIdAndDelete(params.id);
    if (!course) return NextResponse.json({ success: false, message: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Course deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Failed to delete course' }, { status: 500 });
  }
}
