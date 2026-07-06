import { NextRequest, NextResponse } from 'next/server';
import { Service } from '@/app/models/Service';
import { connectDB } from '@/app/lib/mongodb';
import { requirePermission } from '@/app/lib/adminAuth';

export async function GET(req: NextRequest) {
  const denied = await requirePermission('services', 'view');
  if (denied) return denied;

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const location = searchParams.get('location');
    const status = searchParams.get('status');

    const query: any = {};
    if (location) query.location = location.toLowerCase();
    if (status) query.status = status;

    const services = await Service.find(query as any).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: services });
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch services' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const denied = await requirePermission('services', 'full');
  if (denied) return denied;

  try {
    await connectDB();

    const body = await req.json();

    const service = new Service(body);

    // Ensure slug uniqueness within the same location before the pre-save hook runs
    if (body.name && body.location) {
      const baseSlug = body.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      let slug = baseSlug;
      let counter = 1;
      while (await Service.findOne({ urlSlug: slug, location: body.location } as any).select('_id').lean()) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }
      service.urlSlug = slug;
    }

    await service.save();

    return NextResponse.json(
      { success: true, data: service, message: 'Service created successfully' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ Service save error:', {
      name: error.name,
      message: error.message,
      errors: error.errors,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
    });

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors ?? {}).map((e: any) => e.message);
      return NextResponse.json(
        { success: false, message: messages.join(', ') },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create service' },
      { status: 500 }
    );
  }
}
