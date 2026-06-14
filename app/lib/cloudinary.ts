import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResponse {
  public_id: string;
  secure_url: string;
  url: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
}

export async function uploadImage(
  file: string,
  folder: string = 'dr-youth-clinic/services'
): Promise<UploadResponse> {
  try {
    const result = await cloudinary.uploader.upload(file, {
      folder,
      resource_type: 'auto',
      quality: 'auto',
      transformation: [
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      url: result.url,
      width: result.width,
      height: result.height,
      format: result.format,
      resource_type: result.resource_type,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image');
  }
}

export async function deleteImage(publicId: string): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete image');
  }
}

export function getOptimizedImageUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    quality?: string;
    crop?: string;
  } = {}
): string {
  const {
    width = 1000,
    height = 1000,
    quality = 'auto',
    crop = 'auto',
  } = options;

  return cloudinary.url(publicId, {
    width,
    height,
    quality,
    crop,
    fetch_format: 'auto',
    secure: true,
  });
}

export function getBeforeAfterUrl(beforeId: string, afterId: string): string {
  return `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/fetch/e_blur:300/u_${afterId}/l_${beforeId},c_scale,w_0.5,x_-0.5/co_white,l_text:Montserrat_30_bold:Before%20%26%20After,x_0,y_-20/${beforeId}`;
}
