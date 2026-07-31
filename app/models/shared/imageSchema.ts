import { Schema } from 'mongoose';
import type { FocalPoint } from '@/app/lib/media/focalPoint';

export interface IImageWithFocalPoint {
  url: string;
  publicId: string;
  focalPoint?: FocalPoint;
}

// Reusable across models — every image field in this codebase already uses
// the same {url, publicId} shape (~20 fields across 11 models), so
// `focalPoint` slots in additively with no migration needed for the fields
// that adopt it. Not applied to every model at once — rolling out
// page-type by page-type, proving it on Doctor first.
export const FocalPointSchema = new Schema<FocalPoint>(
  {
    mode: {
      type: String,
      enum: ['center', 'top', 'top-left', 'top-right', 'face', 'manual'],
      default: 'center',
    },
    x: { type: Number, min: 0, max: 100 },
    y: { type: Number, min: 0, max: 100 },
  },
  { _id: false }
);

export const ImageWithFocalPointSchema = new Schema<IImageWithFocalPoint>(
  {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
    focalPoint: { type: FocalPointSchema, default: undefined },
  },
  { _id: false }
);
