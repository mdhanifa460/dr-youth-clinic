import Image from 'next/image';
import { cloudImgFocal } from '@/app/lib/cloudinary-url';
import { focalPointToObjectPosition, type FocalPoint } from '@/app/lib/media/focalPoint';

interface BannerImageSource {
  url?: string;
  publicId?: string;
  focalPoint?: FocalPoint;
}

// Every banner template renders a desktop image and a (possibly different)
// mobile image, swapped via `hidden sm:block` / `sm:hidden` — this is the
// one shared implementation of that pattern, at a consistent 16:9 by
// default (the site's Hero Banner ratio standard) instead of each
// template's own fixed-pixel-height container, with focal-point-aware
// cropping on both breakpoints.
export default function BannerHeroImage({
  desktopImage,
  mobileImage,
  alt,
  aspectRatio = '16/9',
  className = '',
  priority = false,
  fallbackEmoji = '🏥',
}: {
  desktopImage?: BannerImageSource;
  mobileImage?: BannerImageSource;
  alt: string;
  aspectRatio?: string;
  className?: string;
  priority?: boolean;
  fallbackEmoji?: string;
}) {
  if (!desktopImage?.url) {
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-br from-[#0B2560]/20 to-[#60A5D8]/20 flex items-center justify-center ${className}`}
        style={{ aspectRatio }}
      >
        <span className="text-5xl">{fallbackEmoji}</span>
      </div>
    );
  }

  const effectiveMobile = mobileImage?.url ? mobileImage : desktopImage;
  const [rw, rh] = aspectRatio.split('/').map(Number);
  const sourceWidth = 1200;
  const targetHeight = Math.round((sourceWidth * rh) / rw);

  const desktopSrc = desktopImage.publicId
    ? cloudImgFocal(desktopImage.publicId, { w: sourceWidth, h: targetHeight, focalPoint: desktopImage.focalPoint })
    : desktopImage.url;
  const mobileSrc = effectiveMobile.publicId
    ? cloudImgFocal(effectiveMobile.publicId, { w: sourceWidth, h: targetHeight, focalPoint: effectiveMobile.focalPoint })
    : effectiveMobile.url;

  return (
    <>
      <div className={`relative overflow-hidden hidden sm:block ${className}`} style={{ aspectRatio }}>
        <Image
          src={desktopSrc}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 500px"
          className="object-cover"
          style={{ objectPosition: focalPointToObjectPosition(desktopImage.focalPoint) }}
          priority={priority}
        />
      </div>
      <div className={`relative overflow-hidden sm:hidden ${className}`} style={{ aspectRatio }}>
        <Image
          src={mobileSrc!}
          alt={alt}
          fill
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: focalPointToObjectPosition(effectiveMobile.focalPoint) }}
          priority={priority}
        />
      </div>
    </>
  );
}
