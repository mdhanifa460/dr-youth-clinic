import { NextRequest, NextResponse } from 'next/server';
import { Service } from '@/app/models/Service';
import { connectDB } from '@/app/lib/mongodb';
import { deleteImage } from '@/app/lib/cloudinary';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const service = await Service.findById(params.id);

    if (!service) {
      return NextResponse.json(
        { success: false, message: 'Service not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: service });
  } catch (error) {
    console.error('Error fetching service:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch service' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const body = await req.json();
    const service = await Service.findByIdAndUpdate(params.id, body, {
      new: true,
      runValidators: true,
    });

    if (!service) {
      return NextResponse.json(
        { success: false, message: 'Service not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: service,
      message: 'Service updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating service:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e: any) => e.message);
      return NextResponse.json(
        { success: false, message: messages.join(', ') },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to update service' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const service = await Service.findById(params.id);

    if (!service) {
      return NextResponse.json(
        { success: false, message: 'Service not found' },
        { status: 404 }
      );
    }

    // Delete images from Cloudinary
    if (service.heroImage?.publicId) {
      await deleteImage(service.heroImage.publicId).catch(console.error);
    }

    if (service.beforeAfterImages) {
      for (const pair of service.beforeAfterImages) {
        if (pair.before?.publicId) {
          await deleteImage(pair.before.publicId).catch(console.error);
        }
        if (pair.after?.publicId) {
          await deleteImage(pair.after.publicId).catch(console.error);
        }
      }
    }

    await Service.findByIdAndDelete(params.id);

    return NextResponse.json({
      success: true,
      message: 'Service deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting service:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete service' },
      { status: 500 }
    );
  }
}
