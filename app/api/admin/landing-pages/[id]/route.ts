import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import { LandingPage } from '@/app/models/LandingPage';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const page = await (LandingPage as any).findById(params.id);

    if (!page) {
      return NextResponse.json(
        { success: false, message: 'Landing page not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: page });
  } catch (error) {
    console.error('Error fetching landing page:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch landing page' },
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

    // Prevent slug conflicts when slug changes
    if (body.slug) {
      const existing = await LandingPage.findOne({
        slug: body.slug,
        _id: { $ne: params.id },
      }).select('_id').lean();

      if (existing) {
        return NextResponse.json(
          { success: false, message: 'A landing page with this slug already exists' },
          { status: 409 }
        );
      }
    }

    const page = await (LandingPage as any).findByIdAndUpdate(
      params.id,
      body,
      { new: true, runValidators: true }
    );

    if (!page) {
      return NextResponse.json(
        { success: false, message: 'Landing page not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: page,
      message: 'Landing page updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating landing page:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors ?? {}).map((e: any) => e.message);
      return NextResponse.json(
        { success: false, message: messages.join(', ') },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to update landing page' },
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

    const page = await (LandingPage as any).findByIdAndDelete(params.id);

    if (!page) {
      return NextResponse.json(
        { success: false, message: 'Landing page not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Landing page deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting landing page:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete landing page' },
      { status: 500 }
    );
  }
}
