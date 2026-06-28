import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResponse {
  public_id:     string;
  secure_url:    string;
  url:           string;
  width:         number;
  height:        number;
  format:        string;
  resource_type: string;
  size:          number;
}

export async function uploadImage(
  file: string,
  folder: string = 'dr-youth-clinic/services',
  options: Record<string, any> = {}
): Promise<UploadResponse> {
  if (!file || typeof file !== 'string') {
    throw new Error('Invalid file: must be a valid base64 string or file path');
  }

  const result = await cloudinary.uploader.upload(file, {
    folder,
    resource_type: 'auto',
    quality: 'auto',
    fetch_format: 'auto',
    flags: 'progressive',
    transformation: [{ quality: 'auto', fetch_format: 'auto', dpr: 'auto' }],
    ...options,
  }).catch((err) => {
    if (err.message?.includes('Authentication failed')) {
      throw new Error('Cloudinary authentication failed. Verify your API credentials.');
    }
    if (err.message?.includes('File size')) {
      throw new Error('File size exceeds maximum limit (5MB).');
    }
    throw new Error(err.message || 'Failed to upload image to Cloudinary');
  });

  return {
    public_id:     result.public_id,
    secure_url:    result.secure_url,
    url:           result.url,
    width:         result.width,
    height:        result.height,
    format:        result.format,
    resource_type: result.resource_type,
    size:          result.bytes,
  };
}

export async function deleteImage(publicId: string): Promise<boolean> {
  if (!publicId) throw new Error('Public ID is required for deletion');
  const result = await cloudinary.uploader.destroy(publicId);
  return result.result === 'ok';
}

export function getOptimizedImageUrl(
  publicId: string,
  options: { width?: number; height?: number; quality?: string; crop?: string } = {}
): string {
  if (!publicId) throw new Error('Public ID is required');
  const { width = 1000, height = 1000, quality = 'auto', crop = 'auto' } = options;
  return cloudinary.url(publicId, { width, height, quality, crop, fetch_format: 'auto', secure: true, dpr: 'auto' });
}

export async function verifyCloudinaryConnection() {
  try {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (!cloudName) return { connected: false, message: 'Cloudinary cloud name not configured' };
    await cloudinary.api.resources({ max_results: 1 });
    return { connected: true, message: 'Connected to Cloudinary', cloudName };
  } catch (err: any) {
    return { connected: false, message: `Failed to connect: ${err.message}` };
  }
}
