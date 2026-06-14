import { NextRequest, NextResponse } from 'next/server';
import { Service } from '@/app/models/Service';
import { connectDB } from '@/app/lib/mongodb';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const location = searchParams.get('location');
    const status = searchParams.get('status');

    const query: any = {};
    if (location) query.location = location.toLowerCase();
    if (status) query.status = status;

    const services = await Service.find(query).sort({ createdAt: -1 });

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
  try {
    await connectDB();

    const body = await req.json();

    const service = new Service(body);
    await service.save();

    return NextResponse.json(
      { success: true, data: service, message: 'Service created successfully' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating service:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      return NextResponse.json(
        { success: false, message: messages.join(', ') },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to create service' },
      { status: 500 }
    );
  }
}
