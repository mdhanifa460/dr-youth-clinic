import { NextResponse } from 'next/server';
import { verifyCloudinaryConnection } from '@/app/lib/cloudinary';

export async function GET() {
  try {
    const connectionResult = await verifyCloudinaryConnection();
    return NextResponse.json({
      connected: connectionResult.connected,
      message: connectionResult.message,
    });
  } catch (error: any) {
    return NextResponse.json({ connected: false, message: error.message }, { status: 500 });
  }
}
