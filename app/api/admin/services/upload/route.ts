import { NextRequest, NextResponse } from 'next/server';
import { uploadImage } from '@/app/lib/cloudinary';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(req: NextRequest) {
  try {
    console.log('🔄 Image upload request received');

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'dr-youth-clinic/services';

    // ============ VALIDATION ============
    if (!file) {
      console.warn('❌ No file provided in request');
      return NextResponse.json(
        { success: false, message: 'No file provided' },
        { status: 400 }
      );
    }

    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      console.warn(`❌ Invalid file type: ${file.type}`);
      return NextResponse.json(
        {
          success: false,
          message: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      console.warn(`❌ File too large: ${file.size} bytes (max: ${MAX_FILE_SIZE})`);
      return NextResponse.json(
        {
          success: false,
          message: `File size exceeds 5MB limit. Your file: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
        },
        { status: 400 }
      );
    }

    console.log(`📁 File details:`, {
      name: file.name,
      size: `${(file.size / 1024).toFixed(2)}KB`,
      type: file.type,
      folder,
    });

    // ============ CONVERSION ============
    console.log('🔄 Converting file to base64...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataURI = `data:${file.type};base64,${base64}`;

    // ============ UPLOAD ============
    console.log('📤 Uploading to Cloudinary...');
    const result = await uploadImage(dataURI, folder);

    console.log('✅ Upload successful', {
      publicId: result.public_id,
      url: result.secure_url,
      size: `${(result.size / 1024).toFixed(2)}KB`,
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: 'Image uploaded successfully',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Upload error:', {
      message: error.message,
      stack: error.stack,
    });

    // Determine error type and provide helpful message
    let statusCode = 500;
    let errorMessage = error.message || 'Failed to upload image';

    if (error.message.includes('Authentication')) {
      statusCode = 401;
      errorMessage = 'Cloudinary authentication failed. Check your API credentials.';
    } else if (error.message.includes('Invalid file')) {
      statusCode = 400;
      errorMessage = 'Invalid file format or corrupted file.';
    } else if (error.message.includes('size')) {
      statusCode = 413;
      errorMessage = 'File size exceeds maximum limit.';
    }

    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: statusCode }
    );
  }
}
